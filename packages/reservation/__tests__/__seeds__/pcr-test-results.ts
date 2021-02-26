import {firestore} from 'firebase-admin'

const database = firestore()
const collectionName = 'pcr-test-results'

export const createPCRTestResult = async (dataOverwrite: {
  dateTime: string
  deadline: string
  organizationId?: string
  result?: string
}): Promise<void> => {
  //console.log(new Date(dataOverwrite.dateTime))
  const data = {
    adminId: 'TEST',
    appointmentId: '1',
    barCode: 'TESTCODE1',
    confirmed: false,
    dateTime: firestore.Timestamp.fromDate(new Date(dataOverwrite.dateTime)),
    deadline: firestore.Timestamp.fromDate(new Date(dataOverwrite.deadline)),
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
  }
  data.organizationId = dataOverwrite.organizationId ?? null
  data.result = dataOverwrite.result ?? 'Pending'
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