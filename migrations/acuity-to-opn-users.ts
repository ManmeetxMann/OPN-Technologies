/**
 * This script reads user appointments on acuity and updates/creates users on OPN side
 */
import {initializeApp, credential, firestore} from 'firebase-admin'
import {Config} from '../packages/common/src/utils/config'
import querystring, {ParsedUrlQueryInput} from 'querystring'
import fetch from 'node-fetch'
import moment from 'moment-timezone'
import {AppointmentAcuityResponse, Gender} from '../packages/reservation/src/models/appointment'
import {UserService} from '../packages/common/src/service/user/user-service'

const ACUITY_ENV_NON_PROD = true
const START_DATE = '2021-06-10' //Starting from OCT 1st
const END_DATE = '2021-06-11' //new Date()

const API_USERNAME = Config.get('ACUITY_SCHEDULER_USERNAME')
const API_PASSWORD = Config.get('ACUITY_SCHEDULER_PASSWORD')

const APIURL = Config.get('ACUITY_SCHEDULER_API_URL')
const serviceAccount = JSON.parse(Config.get('FIREBASE_ADMINSDK_SA'))
console.log(serviceAccount.project_id)

initializeApp({
  credential: credential.cert(serviceAccount),
})

const database = firestore()
const appointmentCollection = database.collection('appointments')
const userCollection = database.collection('users')

const userService = new UserService()

enum ResultStatus {
  Fulfilled = 'fulfilled',
  Rejected = 'rejected',
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

const getAppointments = async (filters: unknown): Promise<AppointmentAcuityResponse[]> => {
  const userPassBuf = Buffer.from(API_USERNAME + ':' + API_PASSWORD)
  const userPassBase64 = userPassBuf.toString('base64')
  const apiUrl =
    APIURL +
    '/api/v1/appointments?showall=true&' +
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

function customFieldsToAppoinment(
  appointment: AppointmentAcuityResponse,
): AppointmentAcuityResponse {
  appointment.dateOfBirth = ''
  appointment.organizationId = Config.get('PUBLIC_ORG_ID')
  appointment.registeredNursePractitioner = ''
  appointment.address = ''
  appointment.addressUnit = ''
  appointment.agreeToConductFHHealthAssessment = false
  appointment.readTermsAndConditions = false
  appointment.receiveResultsViaEmail = false
  appointment.shareTestResultWithEmployer = false
  appointment.receiveNotificationsFromGov = false
  appointment.agreeCancellationRefund = false
  appointment.hadCovidConfirmedOrSymptoms = false
  appointment.hadCovidConfirmedOrSymptomsDate = ''
  appointment.hadCovidExposer = false
  appointment.hadCovidExposerDate = ''
  appointment.swabMethod = 'Deep Nasal'
  appointment.ohipCard = ''
  appointment.travelIDIssuingCountry = ''
  appointment.travelID = ''
  appointment.gender = null
  appointment.postalCode = ''
  appointment.city = null
  appointment.province = null
  appointment.country = null

  if (Array.isArray(appointment.forms)) {
    appointment.forms.forEach((form) => {
      form.values.some((field) => {
        if (field.fieldID == Number(Config.get('ACUITY_FIELD_DATE_OF_BIRTH'))) {
          appointment.dateOfBirth = field.value
        }
        if (field.fieldID == Number(Config.get('ACUITY_FIELD_NURSE_NAME'))) {
          appointment.registeredNursePractitioner = field.value
        }
        if (field.fieldID == Number(Config.get('ACUITY_FIELD_BARCODE'))) {
          appointment.barCode = field.value
        }
        if (field.fieldID == Number(Config.get('ACUITY_FIELD_ORGANIZATION_ID'))) {
          appointment.organizationId = field.value ?? Config.get('PUBLIC_ORG_ID')
        }
        if (field.fieldID == Number(Config.get('ACUITY_FIELD_ADDRESS'))) {
          appointment.address = field.value
        }
        if (field.fieldID == Number(Config.get('ACUITY_FIELD_ADDRESS_UNIT'))) {
          appointment.addressUnit = field.value
        }
        if (field.fieldID == Number(Config.get('ACUITY_FIELD_SHARE_TEST_RESULT_WITH_EMPLOYER'))) {
          appointment.shareTestResultWithEmployer = field.value === 'yes'
        }
        if (field.fieldID == Number(Config.get('ACUITY_FIELD_READ_TERMS_AND_CONDITIONS'))) {
          appointment.readTermsAndConditions = field.value === 'yes'
        }
        if (field.fieldID == Number(Config.get('ACUITY_FIELD_RECEIVE_RESULTS_VIA_EMAIL'))) {
          appointment.receiveResultsViaEmail = field.value === 'yes'
        }
        if (field.fieldID == Number(Config.get('ACUITY_FIELD_RECEIVE_NOTIFICATIONS_FROM_GOV'))) {
          appointment.receiveNotificationsFromGov = field.value === 'yes'
        }
        if (
          field.fieldID == Number(Config.get('ACUITY_FIELD_AGREE_TO_CONDUCT_FH_HEALTH_ACCESSMENT'))
        ) {
          appointment.agreeToConductFHHealthAssessment = field.value === 'yes'
        }
        if (field.fieldID == Number(Config.get('ACUITY_FIELD_AGREE_CANCELLATION_REFUND'))) {
          appointment.agreeCancellationRefund = field.value === 'yes'
        }
        if (field.fieldID == Number(Config.get('ACUITY_FIELD_HAD_COVID_CONFIRMED'))) {
          appointment.hadCovidConfirmedOrSymptoms = field.value === 'yes'
        }
        if (field.fieldID == Number(Config.get('ACUITY_FIELD_HAD_COVID_CONFIRMED_DATE'))) {
          appointment.hadCovidConfirmedOrSymptomsDate = field.value
        }
        if (field.fieldID == Number(Config.get('ACUITY_FIELD_HAD_COVID_EXPOSURE'))) {
          appointment.hadCovidExposer = field.value === 'yes'
        }
        if (field.fieldID == Number(Config.get('ACUITY_FIELD_HAD_COVID_EXPOSURE_DATE'))) {
          appointment.hadCovidExposerDate = field.value
        }
        if (field.fieldID == Number(Config.get('ACUITY_FIELD_TRAVEL_ID'))) {
          appointment.travelID = field.value
        }
        if (field.fieldID == Number(Config.get('ACUITY_FIELD_TRAVEL_ID_ISSUEING_COUNTRY'))) {
          appointment.travelIDIssuingCountry = field.value
        }
        if (field.fieldID == Number(Config.get('ACUITY_FIELD_OHIP_CARD')) && field.value) {
          appointment.ohipCard = field.value
        }
        if (field.fieldID == Number(Config.get('ACUITY_FIELD_SWAB_METHOD'))) {
          if (!!field.value) {
            appointment.swabMethod = field.value
          }
        }
        if (field.fieldID == Number(Config.get('ACUITY_FIELD_GENDER'))) {
          appointment.gender = field.value as Gender
        }
        if (field.fieldID == Number(Config.get('ACUITY_FIELD_POSTAL_CODE'))) {
          appointment.postalCode = field.value
        }
        if (field.fieldID == Number(Config.get('ACUITY_FIELD_CITY'))) {
          appointment.city = field.value
        }
        if (field.fieldID == Number(Config.get('ACUITY_FIELD_PROVINCE'))) {
          appointment.province = field.value
        }
        if (field.fieldID == Number(Config.get('ACUITY_FIELD_COUNTRY'))) {
          appointment.country = field.value
        }
      })
    })
  }
  return appointment
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
        promises.push(checkAppointment(acuityAppointment))
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

async function checkAppointment(acuityAppointment) {
  const appointment = customFieldsToAppoinment(acuityAppointment)
  const {
    firstName,
    lastName,
    email,
    barCode,
    dateOfBirth,
    address,
    agreeToConductFHHealthAssessment,
    shareTestResultWithEmployer,
    readTermsAndConditions,
    receiveResultsViaEmail,
    receiveNotificationsFromGov,
  } = appointment
  console.log({barCode})
  // check if user exists in OPN db with apoointment email
  const userExists = await userCollection.where('email', '==', email).get()
  console.log(`user with ${email}: count ${userExists.docs.length}`)
  console.log('Appointment Name:', `${appointment.firstName} ${appointment.lastName}`)
  console.log(
    'Users found:',
    ...userExists.docs.map((d) => `${d.data().firstName} ${d.data().lastName} -`),
  )

  const userFields = {
    dateOfBirth,
    address,
    agreeToConductFHHealthAssessment,
    shareTestResultWithEmployer,
    readTermsAndConditions,
    receiveResultsViaEmail,
    receiveNotificationsFromGov,
  }

  if (userExists.docs.length) {
    const userUpdates = userExists.docs.map(async (user) => {
      const userData = user.data()

      if (userData.firstName === firstName && userData.lastName === lastName) {
        console.log('--->USERID SHOULD BE UPDATED')
      } else {
        // TODO: should be flagged as unconfirmed
        console.log('--->FLAG AS UNCONFIRMED')
      }

      // doc.ref.update(userFields)
      console.log(`User ${user.id} should be updated with`, userFields)

      // update all appointments by email
      // const appointmentsByEmail = await appointmentCollection.where('email', '==', email).get()
      // console.log(
      //   'User appointments should be updated',
      //   ...appointmentsByEmail.docs.map((a) => a.data().userId),
      // )
    })

    await Promise.all(userUpdates)
    // TODO: update user with mandatory fields
  } else {
    console.log(`User with ${email} does not exist!`)
    // TODO: create new user
    // await userCollection.add({
    //   firstName,
    //   lastName,
    //   email,
    //   ...userFields,
    // })
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
  }
}

// Maximum batch size to query for
let successCount = 0
let failureCount = 0
let totalCount = 0

main().then(() => console.log('Script Complete \n'))
