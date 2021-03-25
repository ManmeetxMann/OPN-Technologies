import {TestTypes} from './appointment'

export type AppointmentToTestTypeAssociation = {
  id: string
  appointmentType: number
  appointmentTypeName?: string
  testType: TestTypes
}

export type AppointmentToTestTypeAssocPostRequest = Omit<AppointmentToTestTypeAssociation, 'id'>
