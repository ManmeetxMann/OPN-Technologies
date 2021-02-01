import {initializeApp, credential, firestore} from 'firebase-admin'
import {Config} from '../packages/common/src/utils/config'
import moment from 'moment'
import querystring, {ParsedUrlQueryInput} from 'querystring'
import fetch from 'node-fetch'
import DBSchema from '../packages/reservation/src/dbschemas/pcr-test-results.schema'
import {serverTimestamp} from '../packages/common/src/utils/times'

const serviceAccount = JSON.parse(Config.get('FIREBASE_ADMINSDK_SA'))
initializeApp({
  credential: credential.cert(serviceAccount),
})

const database = firestore()

const acuityFormFieldIdsNonProd = {
  barCode: 8622334,
  nurse: 8622344,
  organizationId: 8842033,
  agreement: 8981060,
  birthDay: 8637043,
  homeAddress: 9082854,
  homeAddeessUnit: 9082855,
  readTermsAndConditions: 9082890,
  receiveResultsViaEmail: 9082891,
  agreeToConductFHHealthAccessment: 9082892,
  receiveNotificationsFromGov: 9082893,
  shareTestResultWithEmployer: 9112802,
  addressForTesting: 9112811,
  additionalAddressNotes: 9112814,
}

const acuityFormFieldIdsProd = {
  barCode: 8594852,
  nurse: 8595482,
  organizationId: 8854779,
  agreement: 8981060,
  birthDay: 8561464,
  homeAddress: 8738660,
  homeAddeessUnit: 8738661,
  readTermsAndConditions: 8562278,
  receiveResultsViaEmail: 8595773,
  agreeToConductFHHealthAccessment: 8946232,
  receiveNotificationsFromGov: 8595854,
  shareTestResultWithEmployer: 8691773,
  addressForTesting: 8621731,
  additionalAddressNotes: 8621732,
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
const START_DATE = '2020-10-24' //Starting from OCT 1st
const END_DATE = '2021-01-31' //new Date()

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

const makeFirestoreTimestamp = (date: Date): firestore.Timestamp => {
  return firestore.Timestamp.fromDate(date)
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
    '/api/v1/appointments?max=1500&' +
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
    return
  }
  const barCode = findByFieldIdForms(
    findByIdForms(acuityAppointment.forms, acuityBarCodeFormId).values,
    acuityFormFieldIds.barCode,
  ).value

  const utcDateTime = moment(acuityAppointment.datetime).utc()

  const dateOfAppointment = utcDateTime.format('MMMM DD, YYYY')

  const appointmentInDb = await database
    .collection('appointments')
    .where('acuityAppointmentId', '==', acuityAppointment.id)
    .get()

  if (!appointmentInDb.docs.length) {
    console.warn(`AppointmentID: ${acuityAppointment.id} Not found in firebase`)
    return
  }

  const appointment = appointmentInDb.docs[0]

  const pcrTestResultsInDb = await database
    .collection('pcr-test-results')
    .where('appointmentId', '==', appointment.id)
    .get()

  if (pcrTestResultsInDb.docs.length === 0) {
    console.log('acuityAppointments ', acuityAppointment)

    const convertedDeadline = appointment.data().deadline._seconds
      ? appointment.data().deadline
      : makeFirestoreTimestamp(moment(appointment.data().deadline).toDate())

    const validatedData = await DBSchema.validateAsync({
      appointmentId: appointment.id,
      barCode: barCode,
      adminId: 'MIGRATION',
      dateOfAppointment: dateOfAppointment,
      deadline: convertedDeadline,
      displayForNonAdmins: true,
      firstName: acuityAppointment.firstName,
      lastName: acuityAppointment.lastName,
      linkedBarCodes: [],
      organizationId: '',
      reSampleNumber: 1,
      result: 'Pending',
      runNumber: 1,
      waitingResult: true,
    })

    await database.collection('pcr-test-results').add({
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
  } else {
    console.warn(
      `AppointmentID: There are ${pcrTestResultsInDb.docs.length} PCRTestResults with appointment id ${acuityAppointment.id}`,
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
