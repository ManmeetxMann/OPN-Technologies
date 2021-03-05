import {firestore} from 'firebase-admin'
import {getFirestoreTimeStampDate} from '../../src/utils/datetime.helper'

const database = firestore()
const collectionName = 'pcr-test-results'

export const createPCRTestResult = async (dataOverwrite: {
  appointmentId?: string
  dateTime: string
  deadline: string
  organizationId?: string
  result?: string
  displayInResult?: boolean
  testType?: string
}): Promise<void> => {
  //console.log(new Date(dataOverwrite.dateTime))
  const data = {
    adminId: 'TEST',
    appointmentId: 'A1',
    barCode: 'BAR1',
    confirmed: false,
    dateTime: firestore.Timestamp.fromDate(new Date(dataOverwrite.dateTime)),
    deadline: firestore.Timestamp.fromDate(new Date(dataOverwrite.deadline)),
    dateOfAppointment: getFirestoreTimeStampDate(
      firestore.Timestamp.fromDate(new Date(dataOverwrite.dateTime)),
    ),
    deadlineDate: getFirestoreTimeStampDate(
      firestore.Timestamp.fromDate(new Date(dataOverwrite.deadline)),
    ),
    displayInResult: true,
    firstName: 'HSG',
    lastName: 'GILL',
    linkedBarCodes: [],
    organizationId: null,
    previousResult: null,
    result: 'Pending',
    runNumber: 1,
    reCollectNumber: 1,
    waitingResult: true,
    recollected: false,
    testType: 'PCR',
  }
  data.organizationId = dataOverwrite.organizationId ?? null
  data.appointmentId = dataOverwrite.appointmentId ?? 'A1'
  data.result = dataOverwrite.result ?? 'Pending'
  data.displayInResult = dataOverwrite.displayInResult ?? true
  data.testType = dataOverwrite.testType ?? 'PCR'
  //console.log(data)
  await database.collection(collectionName).add(data)
  //console.log(`savedData.id: ${savedData.id}`)
}

export const deletePCRTestResultByDateTime = async (dateTime: string): Promise<void> => {
  const appointments_query = database
    .collection(collectionName)
    .where('dateTime', '<=', firestore.Timestamp.fromDate(new Date(dateTime)))
  await appointments_query.get().then(function (querySnapshot) {
    querySnapshot.forEach(function (doc) {
      doc.ref.delete()
    })
  })
}
