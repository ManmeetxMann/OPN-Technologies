import {firestore} from 'firebase-admin'
const moment = require('moment-timezone')
import dataManagerInterface from 'test-data-generator/data-manager-interface'
import firestoreDb from './initialize'
export const getFirestoreTimeStampDate = (datetime: firestore.Timestamp): firestore.Timestamp =>
  firestore.Timestamp.fromDate(
    moment(datetime.toDate())
      .tz('America/Toronto')
      .set({
        hour: 0,
        minute: 0,
        second: 0,
        millisecond: 0,
      })
      .utc(true)
      .toDate(),
  )
class testResults implements dataManagerInterface {
  private createTestResult(resultId: string) {
    const data = {
      userId: 'TESTUSER',
      adminId: 'TEST',
      appointmentId: 'FT_APT_1',
      appointmentStatus: 'Reported',
      barCode: 'BAR1',
      confirmed: false,
      dateTime: firestore.Timestamp.fromDate(new Date('2020-06-05T07:00:00')),
      deadline: firestore.Timestamp.fromDate(new Date('2020-01-01T23:59:00')),
      dateOfAppointment: getFirestoreTimeStampDate(
        firestore.Timestamp.fromDate(new Date('2020-06-05T07:00:00')),
      ),
      deadlineDate: getFirestoreTimeStampDate(
        firestore.Timestamp.fromDate(new Date('2020-01-01T23:59:00')),
      ),
      displayInResult: true,
      firstName: 'HSG',
      lastName: 'GILL',
      linkedBarCodes: [],
      organizationId: null,
      previousResult: null,
      result: 'Negative',
      runNumber: 1,
      reCollectNumber: 1,
      waitingResult: true,
      recollected: false,
      testType: 'PCR',
      labId: '1nU6fcGOKBOXO7I0K2G8', //TODO
      sortOrder: 1,
      testDataCreator:'FUNCTIONAL_TEST',
      resultAnalysis: [
        {
          label:"IgG",
          value:"Negative"
        },
        {
          label:"profileR2",
          value:"Negative"
        }
      ]

    }
    firestoreDb.collection('pcr-test-results').doc(resultId).set(data)
  }

  public create(){
    this.createTestResult('FT_TEST_RESULT_1')
  }

  public destroy(){
    
  }
}
export default testResults
