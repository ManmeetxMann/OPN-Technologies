/**
 * Get Details for All Packages that are used in appointments
 */
import mysql from 'mysql'
import {Config} from '../packages/common/src/utils/config'
import fetch from 'node-fetch'

const ACUITY_ENV_NON_PROD = false

const API_USERNAME = Config.get('ACUITY_SCHEDULER_USERNAME')
const API_PASSWORD = Config.get('ACUITY_SCHEDULER_PASSWORD')

const APIURL = Config.get('ACUITY_SCHEDULER_API_URL')
//LOCAL DB. HardCoding for now
const conn = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'finance',
  port: 8889,
})

export enum ResultStatus {
  Fulfilled = 'fulfilled',
  Rejected = 'rejected',
}

type orderModel = {
  total: number
  notes: string
}

type productModel = {
  name: string
  description: string
  price: number
}

type packageModel = {
  packageCode: string
  productID: string
  orderID: number
  name: string
}

type Result = {
  status: ResultStatus
  value: unknown
}

async function promiseAllSettled(promises: Promise<unknown>[]): Promise<Result[]> {
  return Promise.all(
    promises.map((promise) =>
      promise
        .then((value) => ({
          status: ResultStatus.Fulfilled,
          value,
        }))
        .catch((error: unknown) => ({
          status: ResultStatus.Rejected,
          value: error,
        })),
    ),
  )
}

const getPackages = async (): Promise<Map<string, packageModel>> => {
  const userPassBuf = Buffer.from(API_USERNAME + ':' + API_PASSWORD)
  const userPassBase64 = userPassBuf.toString('base64')
  const apiUrl = APIURL + '/api/v1/certificates'

  return fetch(apiUrl, {
    method: 'get',
    headers: {
      Authorization: 'Basic ' + userPassBase64,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
  }).then(async (res) => {
    const data = await res.json()
    const packages = new Map()
    data.map((packageData) => {
      packages.set(packageData.certificate, packageData)
    })
    return packages
  })
}

const getProducts = async (): Promise<Map<string, productModel>> => {
  const userPassBuf = Buffer.from(API_USERNAME + ':' + API_PASSWORD)
  const userPassBase64 = userPassBuf.toString('base64')
  const apiUrl = APIURL + '/api/v1/products'

  return fetch(apiUrl, {
    method: 'get',
    headers: {
      Authorization: 'Basic ' + userPassBase64,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
  }).then(async (res) => {
    const data = await res.json()
    const productList = new Map()
    data.map((product) => {
      productList.set(product.id, product)
    })
    return productList
  })
}

const getOrderDetail = async (orderID: number): Promise<orderModel> => {
  const userPassBuf = Buffer.from(API_USERNAME + ':' + API_PASSWORD)
  const userPassBase64 = userPassBuf.toString('base64')
  const apiUrl = APIURL + '/api/v1/orders/' + orderID

  return fetch(apiUrl, {
    method: 'get',
    headers: {
      Authorization: 'Basic ' + userPassBase64,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
  }).then(async (res) => {
    return res.json()
  })
}

async function fetchAcuity(): Promise<Result[]> {
  const packages = await getPackages()
  const products = await getProducts()

  const results: Result[] = []
  conn.query(
    'SELECT packageCode FROM `appointments_finance` WHERE packageCode!="" AND amountPaid=0 AND costForOrg=0 GROUP BY packageCode',
    async function (error, records) {
      if (error) throw error
      await Promise.all(
        records.map(async (record) => {
          const promises = []
          const packageData = packages.get(record.packageCode)
          if (packageData) {
            promises.push(processNonOrgPackage(packageData, products.get(packageData.productID)))
            const result = await promiseAllSettled(promises)
            results.push(...result)
          } else {
            console.log(`No Package Data for: ${record.packageCode}`)
          }
        }),
      )
    },
  )
  return results
}

async function processNonOrgPackage(packageData: packageModel, productData) {
  try {
    const orderData = await getOrderDetail(packageData.orderID)
    const packageName = packageData.name
    const packageCode = packageData.packageCode
    const productName = productData.name
    const productDesc = productData.description
    const productPrice = productData.price
    const totalAmount = orderData.total
    const notes = orderData.notes
    const totalAppointments = Object.values(productData.appointmentTypeCounts).reduce(
      (acc: number, val: number) => acc + val,
      0,
    )
    const sql =
      'INSERT INTO package_details (packageName, packageCode, productName, productDesc, productPrice, totalAmount, notes, totalAppointments) VALUES ?'
    const data = []
    data.push([
      packageName,
      packageCode,
      productName,
      productDesc,
      productPrice,
      totalAmount,
      notes,
      totalAppointments,
    ])
    return new Promise((resolve, reject) => {
      conn
        .query(sql, [data])
        .on('error', (err) => {
          reject(err.sqlMessage)
        })
        .on('end', () => {
          resolve('Created')
        })
    })
  } catch (error) {
    return Promise.reject(error.message)
  }
}

async function main() {
  try {
    console.log(`Migration Starting for AcuityNonProd: ${ACUITY_ENV_NON_PROD}`)
    const results = await fetchAcuity()
    results.forEach((result) => {
      totalCount += 1
      if (result.status === ResultStatus.Fulfilled) {
        if (result.value) {
          successCount += 1
        }
        console.warn(result.value)
      } else {
        console.warn(result.value)
        failureCount += 1
      }
    })
    console.log(`Succesfully updated ${successCount} `)
  } catch (error) {
    console.error('Error running migration', error)
  } finally {
    console.warn(`Failed updating ${failureCount} `)
    console.log(`Total Appointments Processed: ${totalCount} `)
    //conn.end()
  }
}

// Maximum batch size to query for
let successCount = 0
let failureCount = 0
let totalCount = 0

main().then(() => console.log('Script Complete \n'))
