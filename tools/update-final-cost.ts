/**
 * Get Details for All Packages that are used in appointments
 */
import mysql from 'mysql'
import {Config} from '../packages/common/src/utils/config'
import fetch from 'node-fetch'

const APIURL = Config.get('ACUITY_SCHEDULER_API_URL')
const API_USERNAME = Config.get('ACUITY_SCHEDULER_USERNAME')
const API_PASSWORD = Config.get('ACUITY_SCHEDULER_PASSWORD')

//LOCAL DB. HardCoding for now
const conn = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'finance',
  port: 8889,
})

export enum PriceUpdateSource {
  FromBusinessInput = 'fromBusinessInput',
  FromDescription = 'fromDescription',
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

async function updatePackageDetails(packages, products) {
  return new Promise((resolve, reject) => {
    if (packages.size === 0) {
      resolve(`No Packages to Add to Details`)
    }

    let packageSaved = 0
    const totalNumberOfPackages = packages.size
    packages.forEach(function (packageCode) {
      const productData = products.get(packageCode.productID)

      console.log(productData)
      const description = productData.description ?? null

      const sql = `INSERT INTO package_description (packageCode, productDesc) VALUES("${packageCode.certificate}", "${description}") ON DUPLICATE KEY UPDATE productDesc="${description}"`
      conn
        .query(sql, [])
        .on('error', (err) => {
          const message = `${sql} Failed ${err.sqlMessage}`
          console.log(message)
          reject(message)
        })
        .on('end', () => {
          packageSaved++
          console.log(
            `Saved ${packageCode.certificate} to package_description ${packageSaved}===${totalNumberOfPackages}`,
          )
          if (packageSaved === totalNumberOfPackages) {
            resolve(`updatePackageDetails`)
          }
        })
    })
  })
}

async function updateWithUserPaidAmount() {
  return new Promise((resolve, reject) => {
    const updateFinalPriceWithUserPaidAmountSQL = `UPDATE appointments SET finalPrice=amountPaid, source='paidByUser' WHERE amountPaid>0`
    conn
      .query(updateFinalPriceWithUserPaidAmountSQL, [])
      .on('error', (err) => {
        const message = `${updateFinalPriceWithUserPaidAmountSQL} Failed ${err.sqlMessage}`
        console.log(message)
        reject(message)
      })
      .on('end', () => {
        resolve('updateFinalPriceWithUserPaidAmount')
      })
  })
}

async function updateWithPaidByOrgAmount() {
  return new Promise((resolve, reject) => {
    const updateFinalPriceWithPaidByOrgAmountSQL = `UPDATE appointments SET finalPrice=costForOrg, source='paidByOrg' WHERE costForOrg>0`
    conn
      .query(updateFinalPriceWithPaidByOrgAmountSQL, [])
      .on('error', (err) => {
        const message = `${updateFinalPriceWithPaidByOrgAmountSQL} Failed ${err.sqlMessage}`
        console.log(message)
        reject(message)
      })
      .on('end', () => {
        resolve('updateFinalPriceWithPaidByOrgAmount')
      })
  })
}

async function getPackagesWithBusinessInput() {
  return new Promise((resolve, reject) => {
    const packages = []
    const getBusinesUpdatedPerUnitCost = `SELECT packageCode,perUnitCost FROM business_confirmed_cost`
    conn
      .query(getBusinesUpdatedPerUnitCost, [])
      .on('error', (err) => {
        const message = `${getBusinesUpdatedPerUnitCost} Failed ${err.sqlMessage}`
        console.log(message)
        reject(message)
      })
      .on('result', (record) => {
        packages.push({
          packageCode: record.packageCode,
          perUnitCost: record.perUnitCost,
        })
      })
      .on('end', () => {
        resolve(packages)
      })
  })
}

async function updatePerUnitCostForPackages(perUnitCostForPacakges, source: PriceUpdateSource) {
  return new Promise((resolve, reject) => {
    if (perUnitCostForPacakges.length === 0) {
      resolve(`No Packages for ${source}`)
    }
    let packageProcessed = 0
    perUnitCostForPacakges.forEach(function (record) {
      const sql = `UPDATE appointments SET finalPrice=${record.perUnitCost}, source="${source}" WHERE packageCode="${record.packageCode}" AND finalPrice=0`
      conn
        .query(sql, [])
        .on('error', (err) => {
          const message = `${sql} Failed ${err.sqlMessage}`
          console.log(message)
          reject(message)
        })
        .on('end', () => {
          packageProcessed++
          console.log(`Updated Info for ${record.packageCode}`)
          if (packageProcessed === perUnitCostForPacakges.length) {
            resolve(`updatePerUnitCostForPackages ${source}`)
          }
        })
    })
  })
}

async function getPackagesWithZeroCost() {
  return new Promise((resolve, reject) => {
    const packages = []
    const sql = `SELECT packageCode FROM appointments WHERE packageCode!="" AND finalPrice=0 GROUP BY packageCode`
    conn
      .query(sql, [])
      .on('error', (err) => {
        const message = `${sql} Failed ${err.sqlMessage}`
        console.log(message)
        reject(message)
      })
      .on('result', (record) => {
        packages.push(record.packageCode)
      })
      .on('end', () => {
        resolve(packages)
      })
  })
}

async function getCostFromPackageDescription(packages) {
  return new Promise((resolve, reject) => {
    function parseDescriptionToGetCost(description) {
      const descAr: string[] = description.split('\n')
      if (descAr.length > 0) {
        const priceInforRow = descAr[0].split('|')
        if (priceInforRow.length > 0 && priceInforRow[0] === 'Unit_Price') {
          return parseFloat(priceInforRow[3].replace('$', '')) //HST Price
        }
      }
      return 0
    }

    let certProcessed = 0
    const packageCostsFromDesc = []
    packages.forEach(function (packageCode) {
      const sql = `SELECT packageCode,productDesc FROM package_description WHERE packageCode="${packageCode}"`
      conn
        .query(sql, [])
        .on('error', (err) => {
          const message = `${sql} Failed ${err.sqlMessage}`
          console.log(message)
          reject(message)
        })
        .on('result', (record) => {
          const perUnitCost = parseDescriptionToGetCost(record.productDesc)
          if (perUnitCost > 0) {
            packageCostsFromDesc.push({
              packageCode: record.packageCode,
              perUnitCost: perUnitCost,
            })
            console.log(`Successfully got Cost from Description for ${packageCode}`)
          } else {
            //console.log(`Failed to Get Cost from description for ${packageCode}`)
          }
        })
        .on('end', () => {
          certProcessed++
          if (certProcessed === packages.length) {
            console.log(`Processed ${sql}`)
            resolve(packageCostsFromDesc)
          }
        })
    })
  })
}

async function updateSourceForFreeAppointmentUnderFHHealthCalendar() {
  return new Promise((resolve, reject) => {
    const sql = `UPDATE appointments SET source='FHHealthCalendar' WHERE finalPrice=0 AND calendarID=5092486 AND source is null`
    conn
      .query(sql, [])
      .on('error', (err) => {
        const message = `${sql} Failed ${err.sqlMessage}`
        console.log(message)
        reject(message)
      })
      .on('end', () => {
        resolve('updateSourceForFreeAppointmentUnderFHHealth')
      })
  })
}

async function updateSourceForFreeAppointmentUnderFHHealthORG() {
  return new Promise((resolve, reject) => {
    const sql = `UPDATE appointments SET source='FHHealthOrg' WHERE finalPrice=0 AND source is null AND organizationId="8YBSzW5zXUONnBLrCuwr"`
    conn
      .query(sql, [])
      .on('error', (err) => {
        const message = `${sql} Failed ${err.sqlMessage}`
        console.log(message)
        reject(message)
      })
      .on('end', () => {
        resolve('updateSourceForFreeAppointmentUnderFHHealthORG')
      })
  })
}

async function updateSourceForFreeRERUNAppointment() {
  return new Promise((resolve, reject) => {
    const sql = `UPDATE appointments SET source='ReRun' WHERE finalPrice=0 AND source is null AND packageCode LIKE 'RERUN%'`
    conn
      .query(sql, [])
      .on('error', (err) => {
        const message = `${sql} Failed ${err.sqlMessage}`
        console.log(message)
        reject(message)
      })
      .on('end', () => {
        resolve('updateSourceForFreeRERUNAppointment')
      })
  })
}

async function updateSourceForFreeAppointmentFHHealthEmail() {
  return new Promise((resolve, reject) => {
    const sql = `UPDATE appointments SET source='FHHealthEmail' WHERE finalPrice=0 AND source is null AND email LIKE '%@fhhealth.ca'`
    conn
      .query(sql, [])
      .on('error', (err) => {
        const message = `${sql} Failed ${err.sqlMessage}`
        console.log(message)
        reject(message)
      })
      .on('end', () => {
        resolve('updateSourceForFreeAppointmentFHHealthEmail')
      })
  })
}

async function updateSourceForOneTimeUsedCoupons() {
  return new Promise((resolve, reject) => {
    const sql = `UPDATE appointments SET source='OneTimeUsedCoupon'
        WHERE packageCode IN
        (
            SELECT * FROM
            (
                SELECT AF.packageCode as packageCode FROM appointments AF LEFT JOIN package_description PD ON AF.packageCode=PD.packageCode WHERE source is null AND PD.packageCode is null GROUP BY AF.packageCode
            ) AS subquery
        )`
    conn
      .query(sql, [])
      .on('error', (err) => {
        const message = `${sql} Failed ${err.sqlMessage}`
        console.log(message)
        reject(message)
      })
      .on('end', () => {
        resolve('updateSourceForFreeAppointmentFHHealthEmail')
      })
  })
}

;(async () => {
  const packages = await getPackages()
  const products = await getProducts()
  await updatePackageDetails(packages, products)

  await updateWithUserPaidAmount()
  await updateWithPaidByOrgAmount()

  const packagesWithNoCost = await getPackagesWithZeroCost()
  const packagesWithCostInDescription = await getCostFromPackageDescription(packagesWithNoCost)
  await updatePerUnitCostForPackages(
    packagesWithCostInDescription,
    PriceUpdateSource.FromDescription,
  )

  const businessUpdatedPackages = await getPackagesWithBusinessInput()
  await updatePerUnitCostForPackages(businessUpdatedPackages, PriceUpdateSource.FromBusinessInput)

  await updateSourceForFreeAppointmentUnderFHHealthCalendar()
  await updateSourceForFreeAppointmentUnderFHHealthORG()
  await updateSourceForFreeRERUNAppointment()
  await updateSourceForFreeAppointmentFHHealthEmail()

  await updateSourceForOneTimeUsedCoupons()

  conn.end()
  console.log('Script Complete \n')
})()
