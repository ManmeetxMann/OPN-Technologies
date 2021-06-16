import {firestore} from 'firebase-admin'
import {getFirestoreTimeStampDate} from '../../src/utils/datetime.helper'

const database = firestore()
const collectionName = 'pcr-test-results'

// : Promise<unknown>
export const createPCRTestResult = async (
  dataOverwrite: {
    id?: string
    appointmentId?: string
    appointmentStatus?: string
    dateTime: string
    deadline: string
    firstName?: string
    organizationId?: string
    result?: string
    displayInResult?: boolean
    testType?: string
    labId?: string
    userId?: string
  },
  testDataCreator: string,
): Promise<void> => {
  //console.log(new Date(dataOverwrite.dateTime))
  const data = {
    userId: dataOverwrite.userId ?? 'TESTUSER',
    adminId: 'TEST',
    appointmentId: dataOverwrite.appointmentId ?? 'A1',
    appointmentStatus: dataOverwrite.appointmentStatus ?? 'Pending',
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
    displayInResult: dataOverwrite.displayInResult ?? true,
    firstName: dataOverwrite.firstName ?? 'HSG',
    lastName: 'GILL',
    linkedBarCodes: [],
    organizationId: dataOverwrite.organizationId ?? null,
    previousResult: null,
    result: dataOverwrite.result ?? 'Pending',
    runNumber: 1,
    reCollectNumber: 1,
    waitingResult: true,
    recollected: false,
    testType: dataOverwrite.testType ?? 'PCR',
    labId: dataOverwrite.labId ?? 'DEFAULT',
    sortOrder: 1,
    testDataCreator,
  }

  //console.log(data)
  if (dataOverwrite.id) {
    await database.collection(collectionName).doc(dataOverwrite.id).set(data)
  } else {
    await database.collection(collectionName).add(data)
  }
  //console.log(`savedData.id: ${savedData.id}`)
}

export const deletePCRTestResultByTestDataCreator = async (
  testDataCreator: string,
): Promise<void> => {
  const appointments_query = database
    .collection(collectionName)
    // .where('dateTime', '<=', firestore.Timestamp.fromDate(new Date(dateTime)))
    .where('testDataCreator', '==', testDataCreator)
  await appointments_query.get().then(function (querySnapshot) {
    querySnapshot.forEach(function (doc) {
      doc.ref.delete()
    })
  })
}
