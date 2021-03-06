/**
 * This script go through appointments for which results are not send and created blank pcr test result record
 */
import {initializeApp, credential, firestore} from 'firebase-admin'
import {Config} from '../packages/common/src/utils/config'
import moment from 'moment'
import querystring, {ParsedUrlQueryInput} from 'querystring'
import fetch from 'node-fetch'
import {serverTimestamp} from '../packages/common/src/utils/times'
import DBSchema from '../packages/reservation/src/dbschemas/pcr-test-results.schema'
import {PCRTestResultDBModel} from '../packages/reservation/src/models/pcr-test-results'

const START_DATE = '2021-02-09' //Starting from OCT 1st
const END_DATE = '2021-03-15' //new Date()

const serviceAccount = JSON.parse(Config.get('FIREBASE_ADMINSDK_SA'))
initializeApp({
  credential: credential.cert(serviceAccount),
})

const database = firestore()

const acuityFormFieldIdsNonProd = {
  barCode: 8622334,
}

const acuityFormFieldIdsProd = {
  barCode: 8594852,
}

export enum ResultStatus {
  Fulfilled = 'fulfilled',
  Rejected = 'rejected',
}

type Result = {
  status: ResultStatus
  value: unknown
}

const ACUITY_ENV_NON_PROD = true

const API_USERNAME = Config.get('ACUITY_SCHEDULER_USERNAME')
const API_PASSWORD = Config.get('ACUITY_SCHEDULER_PASSWORD')
const APIURL = Config.get('ACUITY_SCHEDULER_API_URL')

const acuityBarCodeFormId = ACUITY_ENV_NON_PROD ? 1564839 : 1559910 //TEST:1564839 PROD:1559910
const acuityFormFieldIds = ACUITY_ENV_NON_PROD ? acuityFormFieldIdsNonProd : acuityFormFieldIdsProd

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

const findByFieldIdForms = (forms, fieldId) => forms.find((form) => form.fieldID === fieldId)
const findByIdForms = (forms, id) => forms.find((form) => form.id === id)

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
    '/api/v1/appointments?showall=true&max=1500&' +
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

async function createPcrResults(acuityAppointment: AppointmentAcuityResponse) {
  const forms = findByIdForms(acuityAppointment.forms, acuityBarCodeFormId)
  if (!forms) {
    return Promise.reject(`AppointmentID: ${acuityAppointment.id} BarCodeIsMissing`)
  }
  const barCode = findByFieldIdForms(
    findByIdForms(acuityAppointment.forms, acuityBarCodeFormId).values,
    acuityFormFieldIds.barCode,
  ).value

  const appointmentInDb = await database
    .collection('appointments')
    .where('acuityAppointmentId', '==', acuityAppointment.id)
    .get()

  if (!appointmentInDb.docs.length) {
    return Promise.reject(`AppointmentID: ${acuityAppointment.id} Not found in firebase`)
  }

  const appointment = appointmentInDb.docs[0]
  if (appointment.data().appointmentStatus === 'Canceled') {
    return Promise.reject(
      `AppointmentID: ${acuityAppointment.id} Canceled appointment hence result not created`,
    )
  }

  const pcrTestResultsInDb = await database
    .collection('pcr-test-results')
    .where('appointmentId', '==', appointment.id)
    .get()

  if (pcrTestResultsInDb.docs.length === 0) {
    const validatedData: PCRTestResultDBModel = await DBSchema.validateAsync({
      adminId: 'MIGRATION',
      appointmentId: appointment.id,
      barCode: barCode,
      confirmed: false,
      dateTime: appointment.data().dateTime,
      deadline: appointment.data().deadline,
      displayForNonAdmins: true,
      firstName: acuityAppointment.firstName,
      lastName: acuityAppointment.lastName,
      linkedBarCodes: [],
      organizationId: appointment.data().organizationId ?? null,
      reCollectNumber: 1,
      result: 'Pending',
      recollected: false,
      runNumber: 1,
      waitingResult: true,
    })

    const data = await database.collection('pcr-test-results').add({
      ...validatedData,
      updatedAt: serverTimestamp(),
      timestamps: {
        createdAt: appointment.data().timestamps.createdAt,
        updatedAt: null,
        migrations: {
          acuityToAppointments: firestore.FieldValue.serverTimestamp(),
        },
      },
    })
    console.log('Create PCR Test result for acuityAppointment ID ', acuityAppointment.id)
    return data
  } else {
    console.warn(
      `AppointmentID: PCRTestResults with appointment id ${acuityAppointment.id} already exists. Total PCR Results Associated: ${pcrTestResultsInDb.docs.length} `,
    )
  }
}

async function fetchAcuity(): Promise<Result[]> {
  const results: Result[] = []

  const filters = {
    minDate: START_DATE,
    maxDate: START_DATE,
  }

  while (moment(END_DATE).diff(moment(filters.maxDate).format('YYYY-MM-DD')) > 0) {
    const acuityAppointments = await getAppointments(filters)
    console.info(
      `Total Number of Appointments for ${filters.minDate} are ${acuityAppointments.length}`,
    )
    await Promise.all(
      acuityAppointments.map(async (acuityAppointment) => {
        const promises = []
        promises.push(createPcrResults(acuityAppointment))

        const result = await promiseAllSettled(promises)
        results.push(...result)
      }),
    )
    const nextDay = moment(filters.maxDate).add(1, 'd').format('YYYY-MM-DD')
    filters.minDate = nextDay
    filters.maxDate = nextDay
  }

  return results
}

async function main() {
  try {
    console.log('Migration Starting')
    const results = await fetchAcuity()
    results.forEach((result) => {
      totalCount += 1
      if (result.status === ResultStatus.Fulfilled) {
        // @ts-ignore - We will always have a value if the status is fulfilled
        if (result.value) {
          successCount += 1
        }
      } else {
        console.error(result.value)
        failureCount += 1
      }
    })

    console.log(`Succesfully created: ${successCount} `)
  } catch (error) {
    console.error('Error running migration', error)
  } finally {
    console.warn(`Failed creating PCR Results: ${failureCount} `)
    console.log(`Total Appointments Processed: ${totalCount} `)
  }
}

// Maximum batch size to query for
// const limit = Number(Config.get('MIGRATION_DOCUMENTS_LIMIT')) || 500
// Maximum batch size to query for
let successCount = 0
let failureCount = 0
let totalCount = 0

main().then(() => console.log('Script Complete \n'))
