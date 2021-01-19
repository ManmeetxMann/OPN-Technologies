/**
 * This script copy appointments from Acuity to OPN DB. It will not overwrite if same Acuity ID is aleady synced.
 */
import {initializeApp, credential, firestore} from 'firebase-admin'
import {Config} from '../packages/common/src/utils/config'
import querystring, {ParsedUrlQueryInput} from 'querystring'
import fetch from 'node-fetch'
import moment from 'moment-timezone'
import {uniqueNamesGenerator, adjectives, names, colors} from 'unique-names-generator'

const ANONYMOUS_PI_DATA = true
const ACUITY_ENV_NON_PROD = false
const START_DATE = '2020-12-31' //Starting from OCT 1st
const END_DATE = '2021-01-30' //new Date()
const API_USERNAME = Config.get('ACUITY_SCHEDULER_USERNAME')
const API_PASSWORD = Config.get('ACUITY_SCHEDULER_PASSWORD')

const APIURL = Config.get('ACUITY_SCHEDULER_API_URL')
const serviceAccount = JSON.parse(Config.get('FIREBASE_ADMINSDK_SA'))
console.log(serviceAccount.project_id)

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
  receiveNotificationsFromGov: 9082893
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
  receiveNotificationsFromGov: 8595854
}

const acuityHomeAddressFormId = ACUITY_ENV_NON_PROD ? 1644637 : 1585198 //TEST:1644637 PROD:1585198 
const acuityBarCodeFormId = ACUITY_ENV_NON_PROD ? 1564839 : 1559910 //TEST:1564839 PROD:1559910 
const acuityBirthDayFormId = ACUITY_ENV_NON_PROD ? 1567398 : 1554251 //TEST:1567398 PROD:1554251 
const acuityTermsAndConditionFormId = ACUITY_ENV_NON_PROD ? 1644640 : 1554370 //TEST:1644640 PROD:1554370 

const acuityFormFieldIds = ACUITY_ENV_NON_PROD ? acuityFormFieldIdsNonProd : acuityFormFieldIdsProd

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

const makeTimeEndOfTheDay = (datetime: moment.Moment): string => {
  return datetime.hours(11).minutes(59).format()
}

const generateDeadline = (utcDateTime) => {
  //TODO: Handle Labels
  let deadline
  if (utcDateTime.hours() > 12) {
    deadline = makeTimeEndOfTheDay(utcDateTime.add(1, 'd'))
  } else {
    deadline = makeTimeEndOfTheDay(utcDateTime)
  }
  return deadline
}

function handleBoolean(yesOrNo: string) {
  if(yesOrNo === "yes"){
    return true
  }
  return false
}

function piData(realData: string) {
  const randomName = uniqueNamesGenerator({
    dictionaries: [names, adjectives, colors],
    length: 1,
    style: 'capital',
  })
  if (ANONYMOUS_PI_DATA) {
    return randomName
  }
  return realData
}

function piEmail(realData: string) {
  if (ANONYMOUS_PI_DATA) {
    return 'testgroup@stayopn.com'
  }
  return realData
}

function piDOB(realData: string) {
  if (ANONYMOUS_PI_DATA) {
    return '20 OCT 2010'
  }
  return realData
}

async function fetchAcuity(): Promise<Result[]> {
  const results: Result[] = []

  const filters = {
    minDate: START_DATE,
    maxDate: START_DATE,
  }

  while (moment(END_DATE).diff(moment(filters.maxDate).add(1, 'd').format('YYYY-MM-DD')) > 0) {
    const acuityAppointments = await getAppointments(filters)
    console.info(
      `Total Number of Appointments for ${filters.minDate} are ${acuityAppointments.length}`,
    )
    await Promise.all(
      acuityAppointments.map(async (acuityAppointment) => {
        const promises = []
        promises.push(createAppointment(acuityAppointment))
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

async function createAppointment(acuityAppointment) {
  const appointmentInDb = await database
    .collection('appointments')
    .where('acuityAppointmentId', '==', acuityAppointment.id)
    .get()

  if (appointmentInDb.size > 0) {
    console.warn(`Appointment ID: ${acuityAppointment.id} already exists`)
    return Promise.resolve()
  }

  const utcDateTime = moment(acuityAppointment.datetime).utc()

  const dateTime = utcDateTime.format()
  const dateOfAppointment = utcDateTime.format('MMMM DD, YYYY')
  const timeOfAppointment = utcDateTime.format('h:mma')

  const deadline = generateDeadline(utcDateTime)
  let barCode = ''
  let dateOfBirth = ''
  let organizationId = ''
  let address = ''
  let addressUnit = ''
  let readTermsAndConditions = ''
  let receiveResultsViaEmail = ''
  let receiveNotificationsFromGov = ''
  let agreeToConductFHHealthAccessment = ''

  let registeredNursePractitioner = ''
  try {
    barCode = findByFieldIdForms(
      findByIdForms(acuityAppointment.forms, acuityBarCodeFormId).values,
      acuityFormFieldIds.barCode,
    ).value
  } catch (e) {
    console.warn(`Invalid BarCode: ${e.message}`)
    throw e
  }

  try {
    dateOfBirth = findByFieldIdForms(
      findByIdForms(acuityAppointment.forms, acuityBirthDayFormId).values,
      acuityFormFieldIds.birthDay,
    ).value
  } catch (e) {
    console.warn(`Invalid Date of Birth: ${e.message}`)
  }

  try {
    const organizationIdField = findByFieldIdForms(
      findByIdForms(acuityAppointment.forms, acuityBarCodeFormId).values,
      acuityFormFieldIds.organizationId,
    )
    if (organizationIdField) {
      //ORG ID Field is missing for some appointments
      organizationId = organizationIdField.value
    }
  } catch (e) {
    console.warn(`Invalid ORG for ${acuityAppointment.id}: ${e.message}`)
    //return Promise.resolve()
  }

  try {
    registeredNursePractitioner = findByFieldIdForms(
      findByIdForms(acuityAppointment.forms, acuityBarCodeFormId).values,
      acuityFormFieldIds.nurse,
    ).value
  } catch (e) {
    console.warn(`Invalid registeredNursePractitioner: ${e.message}`)
  }


  try {
    address = findByFieldIdForms(
      findByIdForms(acuityAppointment.forms, acuityHomeAddressFormId).values,
      acuityFormFieldIds.homeAddress,
    ).value
  } catch (e) {
    console.warn(`Invalid address: ${e.message}`)
  }

  try {
    addressUnit = findByFieldIdForms(
      findByIdForms(acuityAppointment.forms, acuityHomeAddressFormId).values,
      acuityFormFieldIds.homeAddeessUnit,
    ).value
  } catch (e) {
    console.warn(`Invalid addressUnit: ${e.message}`)
  }

  try {
    readTermsAndConditions = findByFieldIdForms(
      findByIdForms(acuityAppointment.forms, acuityTermsAndConditionFormId).values,
      acuityFormFieldIds.readTermsAndConditions,
    ).value
  } catch (e) {
    console.warn(`Invalid readTermsAndConditions: ${e.message}`)
  }

  try {
    receiveResultsViaEmail = findByFieldIdForms(
      findByIdForms(acuityAppointment.forms, acuityTermsAndConditionFormId).values,
      acuityFormFieldIds.receiveResultsViaEmail,
    ).value
  } catch (e) {
    console.warn(`Invalid receiveResultsViaEmail: ${e.message}`)
  }

  try {
    receiveNotificationsFromGov = findByFieldIdForms(
      findByIdForms(acuityAppointment.forms, acuityTermsAndConditionFormId).values,
      acuityFormFieldIds.receiveNotificationsFromGov,
    ).value
  } catch (e) {
    console.warn(`Invalid receiveNotificationsFromGov: ${e.message}`)
  }

  try {
    agreeToConductFHHealthAccessment = findByFieldIdForms(
      findByIdForms(acuityAppointment.forms, acuityTermsAndConditionFormId).values,
      acuityFormFieldIds.agreeToConductFHHealthAccessment,
    ).value
  } catch (e) {
    console.warn(`Invalid agreeToConductFHHealthAccessment: ${e.message}`)
  }

  try {
    const appointment = {
      acuityAppointmentId: acuityAppointment.id,
      address: address,
      addressUnit: addressUnit,
      agreeToConductFHHealthAccessment: handleBoolean(agreeToConductFHHealthAccessment),
      appointmentStatus: 'Pending', //TODO
      barCode: barCode,
      canceled: acuityAppointment.canceled,
      dateOfAppointment: dateOfAppointment,
      dateOfBirth: piDOB(dateOfBirth),
      dateTime: dateTime,
      deadline: deadline,
      email: piEmail(acuityAppointment.email),
      firstName: piData(acuityAppointment.firstName),
      lastName: piData(acuityAppointment.lastName),
      latestResult: 'Pending',
      location: acuityAppointment.location,
      organizationId: organizationId,
      packageCode: acuityAppointment.certificate,
      phone: acuityAppointment.phone,
      readTermsAndConditions: handleBoolean(readTermsAndConditions),
      receiveNotificationsFromGov: handleBoolean(receiveNotificationsFromGov),
      receiveResultsViaEmail: handleBoolean(receiveResultsViaEmail),
      registeredNursePractitioner: registeredNursePractitioner,
      //shareTestResultWithEmployer: boolean,//TODO
      timeOfAppointment: timeOfAppointment,
      timestamps: {
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: null,
        migrations: {
          acuityToAppointments: firestore.FieldValue.serverTimestamp(),
        },
      },
    }

    const data = database.collection('appointments').add(appointment)
    console.info(`Appointment ID: ${appointment.acuityAppointmentId} successfully saved`)
    return data
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
      totalCount += 1
      if (result.status === ResultStatus.Fulfilled) {
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
    console.warn(`Failed updating ${failureCount} `)
    console.log(`Total Appointments Processed: ${totalCount} `)
  }
}

// Maximum batch size to query for
let successCount = 0
let failureCount = 0
let totalCount = 0

main().then(() => console.log('Script Complete \n'))
