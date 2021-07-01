import appointmentCreator from './firestore/appointments'
const appointment = new appointmentCreator()
appointment.create()

import testResultCreator from './firestore/test-results'
const testResult = new testResultCreator()
testResult.create()
