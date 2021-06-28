/* eslint-disable indent */
/* eslint-disable valid-jsdoc */
/* eslint-disable semi */
import {AppointmentDBModel} from './../../../packages/reservation/src/models/appointment'
import moment from 'moment-timezone'
import fs from 'fs'
import {PdfService} from '../../../packages/common/src/service/reports/pdf'
import pdfContent from '../../../packages/reservation/src/templates/antibody-all/positive'
import {
  Gender,
  TestTypes,
  ThirdPartySyncSource,
  ResultTypes,
  AppointmentStatus,
} from '../../../packages/reservation/src/models/appointment'
import {
  PCRTestResultEmailDTO,
  PCRTestResultData,
  PCRTestResultDBModel,
  SpecLabel,
} from '../../../packages/reservation/src/models/pcr-test-results'
import {makeFirestoreTimestamp} from '../../../packages/reservation/src/utils/datetime.helper'

const pdfService = new PdfService()

const data = {
  patientCode: 'FH000001',
  barCode: 'A11111',
  // dateTime: firestore.Timestamp.fromDate(new Date()),
  firstName: 'test',
  lastName: 'test',
  healthCard: 'test',
  dateOfBirth: moment(new Date()).toISOString(),
  gender: Gender.Male,
  address1: '502 Alexandra Boulevard',
  address2: 'test',
  city: 'Toronto',
  province: 'ON',
  postalCode: 'M4R 5T3',
  country: 'test',
  testType: TestTypes.PCR,
  source: ThirdPartySyncSource.ConfirmatoryRequest,
}

const data3: PCRTestResultData = {
  barCode: '123',
  adminId: '456',
  // resultSpecs?: PCRResultSpecsForSending, // @TODO Cleanup this after migration
  // userId?: string,
}

const data2: PCRTestResultDBModel = {
  ...data3,
  appointmentId: '123',
  confirmed: true,
  dateTime: makeFirestoreTimestamp(moment().toISOString()),
  deadline: makeFirestoreTimestamp(moment().toISOString()),
  displayInResult: true,
  firstName: 'test',
  id: 'test',
  lastName: 'test',
  linkedBarCodes: ['123', '456'],
  // organizationId?: "abc",
  previousResult: ResultTypes.Positive,
  recollected: false,
  reCollectNumber: 123,
  result: ResultTypes.Invalid,
  runNumber: 123,
  // testRunId?: "test"
  updatedAt: makeFirestoreTimestamp(moment().toISOString()),
  waitingResult: false,
  deadlineDate: makeFirestoreTimestamp(moment().toISOString()),
  dateOfAppointment: makeFirestoreTimestamp(moment().toISOString()),
  testType: TestTypes.ExpressPCR,
  // resultMetaData?: TestResultsMetaData
  resultAnalysis: [
    {
      label: SpecLabel.IgA,
      value: 'POSITIVE',
    },
    {
      label: SpecLabel.IgGResult,
      value: 'POSITIVE',
    },
  ],
  // templateId?: string
  // labId?: string
  userId: 'testUserID',
  sortOrder: 1,
  appointmentStatus: AppointmentStatus.CheckedIn,
  // couponCode?: string
}

const data4: AppointmentDBModel = {
  id: '123',
  acuityAppointmentId: 123,
  appointmentStatus: AppointmentStatus.CheckedIn,
  agreeToConductFHHealthAssessment: false,
  barCode: 'hey',
  canceled: false,
  dateOfAppointment: 'test',
  dateOfBirth: 'test',
  dateTime: makeFirestoreTimestamp(moment().toISOString()),
  deadline: makeFirestoreTimestamp(moment().toISOString()),
  email: 'test',
  firstName: 'test',
  lastName: 'test',
  // gender?: Gender.Male,
  // organizationId?: "test",
  // packageCode?: "test",
  phone: 'test',
  // postalCode?: "test",
  registeredNursePractitioner: 'test',
  latestResult: ResultTypes.Indeterminate,
  timeOfAppointment: 'test',
  // transportRunId?: "test",
  appointmentTypeID: 123,
  calendarID: 456,
  // vialLocation?: string
  address: '502 Alexandra Boulevard',
  addressUnit: 'Suite 5053',
  // couponCode?: string
  // travelID?: string
  // travelIDIssuingCountry?: string
  // ohipCard?: string
  // swabMethod?: string
  shareTestResultWithEmployer: true,
  readTermsAndConditions: true,
  receiveResultsViaEmail: true,
  receiveNotificationsFromGov: true,
  agreeCancellationRefund: true,
  hadCovidConfirmedOrSymptoms: true,
  // hadCovidConfirmedOrSymptomsDate?: string
  hadCovidExposer: false,
  // hadCovidExposerDate?: string
  // userId?: string
  // locationName?: string
  // locationAddress?: string
  testType: TestTypes.Antibody_All,
  // labId?: string
  // scheduledPushesToSend?: Array<ReservationPushTypes>
  // checkedInOn?: firestore.Timestamp
  // city?: string
  // province?: string
  // country?: string
}
/**
 * Create temp directory
 * @param dir
 */
function createTempDirectory(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }
}

/**
 * Runs test
 * @returns
 */
async function runTest() {
  const dir = __dirname + '/pdfs'
  createTempDirectory(dir)
  const dataList = [data]
  const pdfPromises = dataList.map(async (doc) => {
    const file = `${dir}/${'file1'}.pdf`
    const resultDate = moment().format('LL')
    const pcrtestresult: PCRTestResultEmailDTO = {
      ...doc,
      ...data2,
      ...data4,
      labAssay: '123',
    }
    const content = pdfContent(pcrtestresult, resultDate)
    const stream = pdfService.generatePDFStream(
      content.content,
      content.tableLayouts,
      undefined,
      undefined,
      undefined,
      content.background,
    )

    return new Promise((resolve, reject) => {
      const writeStream = stream.pipe(fs.createWriteStream(file))

      writeStream.on('close', async () => {
        console.log('write success')
        resolve(file)
      })

      writeStream.on('error', reject)
    })
  })

  return Promise.all(pdfPromises)
}

// describe('PDF-TESTING', () => {
//   test('PDF-TESTING', () => {
//     run_test()
//   })
// })

runTest()
