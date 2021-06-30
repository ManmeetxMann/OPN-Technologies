import {firestore} from 'firebase-admin'

import dataManagerInterface from 'test-data-generator/data-manager-interface'
import firestoreDb from './initialize'

class appointments implements dataManagerInterface {
  private createAppointment(appointmentId: string) {
    const data = {
      acuityAppointmentId: 111,
      address: 'address',
      addressUnit: 'addressUnit',
      agreeToConductFHHealthAssessment: true,
      appointmentStatus: 'Reported',
      appointmentTypeID: 111,
      barCode: 'BAR1',
      calendarID: 1,
      canceled: false,
      dateOfAppointment: 'June 05, 2020',
      dateOfBirth: 'February 3, 2021',
      dateTime: firestore.Timestamp.fromDate(new Date('2020-06-05T07:00:00')),
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
      labId: '1nU6fcGOKBOXO7I0K2G8',//TODO
      userId: 'TestUser',//TODO
      testType: 'PCR',
      testDataCreator:'FUNCTIONAL_TEST'
    }
    firestoreDb.collection('appointments').doc(appointmentId).set(data)
  }

  public create(){
    this.createAppointment('FT_APT_1')
  }

  public destroy(){
    
  }
}
export default appointments