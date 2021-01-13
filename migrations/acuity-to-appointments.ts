/**
 * This script just overwrite Client Emails in user collections so that no notfication is sent by mistake
 */
import {initializeApp, credential, firestore} from 'firebase-admin'
import {Config} from '../packages/common/src/utils/config'
import querystring, {ParsedUrlQueryInput} from 'querystring'
import fetch from 'node-fetch'
import moment from 'moment-timezone'

const startDate = '2020-09-01'

const serviceAccount = JSON.parse(Config.get('FIREBASE_ADMINSDK_SA'))
initializeApp({
  credential: credential.cert(serviceAccount),
})

const database = firestore()

const acuityDataId = 1564839
const acuityBirthDayDataId = 1567398

const acuityDataIds = {
  barCode: 8622334,
  nurse: 8622344,
  organizationId: 8842033,
  agreement: 8981060,
  birthDay: 8637043,
}

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

const API_USERNAME = Config.get('ACUITY_SCHEDULER_USERNAME')
const API_PASSWORD = Config.get('ACUITY_SCHEDULER_PASSWORD')
const APIURL = Config.get('ACUITY_SCHEDULER_API_URL')

const findByIdForms = (forms, id) => forms.find((form) => form.id === id)
const findByFieldIdForms = (forms, fieldId) => forms.find((form) => form.fieldID === fieldId)

export async function promiseAllSettled(promises: Promise<unknown>[]): Promise<Result[]> {
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
    '/api/v1/appointments?max=1500&' +
    querystring.stringify(filters as ParsedUrlQueryInput)
  console.log(apiUrl) //To know request path for dependency

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
const makeTimeEndOfTheDay = (datetime: moment.Moment): string => {
  return datetime.hours(11).minutes(59).format()
}
const generateDeadline = (utcDateTime) => {
  let deadline
  if (utcDateTime.hours() > 12) {
    deadline = makeTimeEndOfTheDay(utcDateTime.add(1, 'd'))
  } else {
    deadline = makeTimeEndOfTheDay(utcDateTime)
  }
  return deadline
}
const formatAcuityToAppointment = (appointment) => {
  const utcDateTime = moment(appointment.datetime).utc()

  const dateTime = utcDateTime.format()
  const dateOfAppointment = utcDateTime.format('MMMM DD, YYYY')
  const timeOfAppointment = utcDateTime.format('h:mma')

  const deadline = generateDeadline(utcDateTime)

  return {
    acuityAppointmentId: appointment.id,
    appointmentStatus: 'pending',
    barCode: findByFieldIdForms(
      findByIdForms(appointment.forms, acuityDataId).values,
      acuityDataIds.barCode,
    ).value,
    canceled: appointment.canceled,
    dateOfAppointment: dateOfAppointment,
    dateOfBirth: findByFieldIdForms(
      findByIdForms(appointment.forms, acuityBirthDayDataId).values,
      acuityDataIds.birthDay,
    ).value,
    dateTime: dateTime,
    deadline: deadline,
    email: appointment.email,
    firstName: appointment.firstName,
    lastName: appointment.lastName,
    location: appointment.location,
    organizationId: findByFieldIdForms(
      findByIdForms(appointment.forms, acuityDataId).values,
      acuityDataIds.organizationId,
    ).value,
    packageCode: appointment.certificate,
    phone: appointment.phone,
    registeredNursePractitioner: findByFieldIdForms(
      findByIdForms(appointment.forms, acuityDataId).values,
      acuityDataIds.nurse,
    ).value,
    result: 'Pending',
    timeOfAppointment: timeOfAppointment,
    timestamps: {
      createdAt: appointment.datetimeCreated,
      updatedAt: null,
    },
  }
}
async function fetchAcuity(): Promise<Result[]> {
  const results: Result[] = []

  const filters = {
    minDate: startDate,
    maxDate: moment(startDate).add(1, 'd').format('YYYY-MM-DD'),
  }

  while (moment(new Date()).diff(moment(filters.maxDate).add(1, 'd').format('YYYY-MM-DD')) > 0) {
    const acuityAppointments = await getAppointments(filters)
    await Promise.all(
      acuityAppointments.map(async (acuity) => {
        const promises = []
        promises.push(createAppointment(formatAcuityToAppointment(acuity)))
        const result = await promiseAllSettled(promises)
        results.push(...result)
      }),
    )

    filters.minDate = filters.maxDate
    filters.maxDate = moment(filters.maxDate).add(1, 'd').format('YYYY-MM-DD')
  }

  return results
}

async function createAppointment(appointment) {
  try {
    const a = await database
      .collection('appointments')
      .where('acuityAppointmentId', '==', appointment.acuityAppointmentId)
      .get()
    if (a.size > 0) {
      return
    }
    return database.collection('appointments').add(appointment)
  } catch (error) {
    console.log(error)
    throw error
  }
}

async function main() {
  try {
    console.log('Migration Starting')
    const results = await fetchAcuity()
    results.forEach((result) => {
      if (result.status === ResultStatus.Fulfilled) {
        // @ts-ignore - We will always have a value if the status is fulfilled
        if (result.value) {
          successCount += 1
        }
      } else {
        failureCount += 1
      }
    })

    console.log(`Succesfully updated ${successCount} `)
  } catch (error) {
    console.error('Error running migration', error)
  } finally {
    if (failureCount > 0) {
      console.warn(`Failed updating ${failureCount} `)
    }
  }
}

// Maximum batch size to query for
let successCount = 0
let failureCount = 0
main().then(() => console.log('Script Complete \n'))
