import {TestTypes} from './appointment'

export type AppointmentToTestTypeAssociation = {
  id: string
  appointmentType: number
  testType: TestTypes
}

export type AppointmentToTestTypeAssocPostRequest = Omit<AppointmentToTestTypeAssociation, 'id'>
