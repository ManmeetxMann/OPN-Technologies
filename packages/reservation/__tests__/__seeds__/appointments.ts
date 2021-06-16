import {firestore} from 'firebase-admin'

const database = firestore()

export const createAppointment = async (
  dataOverwrite: {
    id: string
    dateTime: string
    dateOfAppointment: string
    organizationId?: string
    appointmentStatus?: string
    labId?: string
    testType?: string
    userId?: string
  },
  testDataCreator: string,
): Promise<void> => {
  const data = {
    acuityAppointmentId: 111,
    address: 'address',
    addressUnit: 'addressUnit',
    agreeToConductFHHealthAssessment: true,
    appointmentStatus: 'Pending',
    appointmentTypeID: 111,
    barCode: 'BAR1',
    calendarID: 1,
    canceled: false,
    dateOfAppointment: dataOverwrite.dateOfAppointment,
    dateOfBirth: 'February 3, 2021',
    dateTime: firestore.Timestamp.fromDate(new Date(dataOverwrite.dateTime)),
    deadline: firestore.Timestamp.fromDate(new Date('2020-01-01T23:59:00')),
    email: 'harpreet@stayopn.com',
    firstName: 'TestFNAME',
    lastName: 'TestLNAME',
    latestResult: 'Pending',
    location: 'Toronto',
    organizationId: null,
    packageCode: null,
    phone: '21271782178',
    readTermsAndConditions: true,
    receiveNotificationsFromGov: true,
    receiveResultsViaEmail: true,
    registeredNursePractitioner: 'NAME registeredNursePractitioner',
    shareTestResultWithEmployer: true,
    agreeCancellationRefund: true,
    hadCovidConfirmedOrSymptoms: false,
    hadCovidConfirmedOrSymptomsDate: '',
    hadCovidExposer: false,
    hadCovidExposerDate: '',
    timeOfAppointment: '8:00am',
    labId: dataOverwrite.labId ?? 'DEFAULT',
    userId: dataOverwrite.userId ?? 'TestUser',
    testType: dataOverwrite.testType ?? 'PCR',
    testDataCreator,
  }
  data.organizationId = dataOverwrite.organizationId ?? null
  data.appointmentStatus = dataOverwrite.appointmentStatus ?? 'Pending'
  await database.collection('appointments').doc(dataOverwrite.id).set(data)
  //console.log(`savedData.id: ${savedData.id}`)
}

export const deleteAppointmentByTestDataCreator = async (
  testDataCreator: string,
): Promise<void> => {
  const appointments_query = database
    .collection('appointments')
    .where('testDataCreator', '==', testDataCreator)
  await appointments_query.get().then(function (querySnapshot) {
    querySnapshot.forEach(function (doc) {
      doc.ref.delete()
    })
  })
}
