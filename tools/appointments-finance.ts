/**
 * This script copy appointments from Acuity to OPN DB. It will not overwrite if same Acuity ID is aleady synced.
 */
import mysql from 'mysql'
import {Config} from '../packages/common/src/utils/config'
import querystring, {ParsedUrlQueryInput} from 'querystring'
import fetch from 'node-fetch'
import moment from 'moment-timezone'

const ACUITY_ENV_NON_PROD = false
const START_DATE = '2021-06-01' //Starting from OCT 1st
const END_DATE = '2021-12-02' //new Date()

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
const acuityFormFieldIdsNonProd = {
  organizationId: 8842033,
}

const acuityFormFieldIdsProd = {
  organizationId: 8854779,
}
const acuityBarCodeFormId = ACUITY_ENV_NON_PROD ? 1564839 : 1559910 //TEST:1564839 PROD:1559910

export enum ResultStatus {
  Fulfilled = 'fulfilled',
  Rejected = 'rejected',
}

type AppointmentAcuityFormField = {
  fieldID: number
  value: string
}

type AppointmentAcuityForm = {
  values: Array<AppointmentAcuityFormField>
}

type AppointmentAcuityResponse = {
  id: number
  date: string
  time: string
  forms: Array<AppointmentAcuityForm>
  firstName: string
  lastName: string
  email: string
  phone: number
  dateOfBirth: string
  registeredNursePractitioner: string
  dateOfAppointment: string
  appointmentId: number
  timeOfAppointment?: string
  barCode?: string
  datetimeCreated: string
  location: string
  certificate: string
  canceled: string
  datetime: string
}

type Result = {
  status: ResultStatus
  value: unknown
}

const orgToCost = {
  Pv2aldejG1OLnd6ggGrz: {default: '180.80'},
  hdm61mpAy9RA0kTCm7nz: {'5173759': '146.90', default: '202.27'},
  '89BrZwateBqK4PvcBIP0': {default: '197.75'},
  Rtu6h3T93nnv2dn6M2pS: {default: '185.32'},
  jRHDPGGyz890Gp9tVZfV: {default: '175.15'},
  WpkrTfdrNAo9hGo4j0NL: {default: '175.15'},
  atLSTCs1EQyDeEfFUydo: {default: '0'},
}

const acuityFormFieldIds = ACUITY_ENV_NON_PROD ? acuityFormFieldIdsNonProd : acuityFormFieldIdsProd
const findByIdForms = (forms, id) => forms.find((form) => form.id === id)
const findByFieldIdForms = (forms, fieldId) => forms.find((form) => form.fieldID === fieldId)

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

const getAppointments = async (filters: unknown): Promise<AppointmentAcuityResponse[]> => {
  const userPassBuf = Buffer.from(API_USERNAME + ':' + API_PASSWORD)
  const userPassBase64 = userPassBuf.toString('base64')
  const apiUrl =
    APIURL +
    '/api/v1/appointments?max=2500&' +
    querystring.stringify(filters as ParsedUrlQueryInput)

  return fetch(apiUrl, {
    method: 'get',
    headers: {
      Authorization: 'Basic ' + userPassBase64,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
  }).then((res) => {
    return res.json()
  })
}

async function fetchAcuity(): Promise<Result[]> {
  //const calendars = await getCalendars()
  const results: Result[] = []

  const filters = {
    minDate: START_DATE,
    maxDate: START_DATE,
  }

  while (moment(END_DATE).diff(moment(filters.maxDate).format('YYYY-MM-DD')) > 0) {
    /*let appointments = []
    await new Promise((resolve, reject) => {
      if(calendars.length === 0){
        resolve(`No calendars`)
      }
      let processed = 0
      calendars.forEach(async function(calendar){ 
        const appointment = await getAppointments({...filters,calendarID:calendar.id})
        if(appointment.length!==0){
          appointments = appointments.concat(appointment)
        }
        processed++
        if (processed === calendars.length) {
          resolve(`Get Appointments`)
        }
      })
    })
    */
    const appointments = await getAppointments(filters)
    console.info(`Total Number of Appointments for ${filters.minDate} are ${appointments.length}`)

    const promises = appointments.map(async (acuityAppointment) => {
      return createAppointment(acuityAppointment)
    })
    const result = await promiseAllSettled(promises)
    results.push(...result)

    const nextDay = moment(filters.maxDate).add(1, 'd').format('YYYY-MM-DD')
    filters.minDate = nextDay
    filters.maxDate = nextDay
  }

  return results
}

async function createAppointment(acuityAppointment) {
  //console.log(acuityAppointment)
  let organizationId = null
  let costForOrg = 0
  try {
    const organizationIdField = findByFieldIdForms(
      findByIdForms(acuityAppointment.forms, acuityBarCodeFormId).values,
      acuityFormFieldIds.organizationId,
    )
    if (!!organizationIdField) {
      //ORG ID Field is missing for some appointments
      organizationId = organizationIdField.value
      if (organizationId) {
        if (orgToCost[organizationId]) {
          costForOrg =
            orgToCost[organizationId][acuityAppointment.calendarID] ??
            orgToCost[organizationId]['default']
        } else {
          //console.info(`No Cost for organizationId ${organizationId} - AppointmentID: ${acuityAppointment.id}`)
        }
      }
    }
  } catch (e) {
    console.info(
      `AppointmentID: ${acuityAppointment.id} InvalidORGfor ${acuityAppointment.id}: ${e.message}`,
    )
  }
  if (acuityAppointment.canceled) {
    console.log(`===========AppointmentID: ${acuityAppointment.id} is cancelled`)
  }

  try {
    const sql = `INSERT INTO appointments (acuityId, appointmentTypeID, calendarID, 
      appointmentType, calendar,  price, priceSold, paid, amountPaid, packageCode, organizationId, 
      date, costForOrg, firstName, lastName, email,datetimeCreated, canceled,phone) VALUES ?`
    const data = []
    const date = moment(acuityAppointment.datetime).format('YYYY-MM-DD')
    const datetimeCreated = moment(acuityAppointment.datetimeCreated).format('YYYY-MM-DD')
    data.push([
      acuityAppointment.id,
      acuityAppointment.appointmentTypeID,
      acuityAppointment.calendarID,
      acuityAppointment.type,
      acuityAppointment.calendar,
      acuityAppointment.price,
      acuityAppointment.priceSold,
      acuityAppointment.paid,
      acuityAppointment.amountPaid,
      acuityAppointment.certificate,
      organizationId,
      date,
      costForOrg,
      acuityAppointment.firstName,
      acuityAppointment.lastName,
      acuityAppointment.email,
      datetimeCreated,
      acuityAppointment.canceled,
      acuityAppointment.phone,
    ])
    return new Promise((resolve, reject) => {
      conn
        .query(sql, [data])
        .on('error', (err) => {
          console.log(`${acuityAppointment.id} has error ${err.sqlMessage}`)
          reject(`${acuityAppointment.id} has error ${err.sqlMessage}`)
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
    conn.end()
  }
}

// Maximum batch size to query for
let successCount = 0
let failureCount = 0
let totalCount = 0

main().then(() => console.log('Script Complete \n'))

//Get All Packages with no payment and org cost is also 0
//SELECT certificate FROM `appointments` WHERE (organizationId is null or organizationId="") AND certificate!="" AND amountPaid=0 AND costForOrg=0 GROUP BY certificate

/*
//STEPS
1. Get all appointments using appointments-finance. This add Price for ORGs
2. Add finalPrice using update-final-cost
3. Add ORG cost to finalPrice UPDATE appointments SET finalPrice=amountPaid, source='paidByUser' WHERE amountPaid>0
4. Add Regular cost to final Price UPDATE appointments SET finalPrice=costForOrg, source='paidByOrg' WHERE costForOrg>0

SELECT * FROM `appointments` WHERE DATE(date) < '2021-05-01' AND finalPrice=0
*/
