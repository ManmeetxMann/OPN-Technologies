import {TestTypes} from './appointment'

export type AppointmentToTestTypeAssociation = {
  id: string
  appointmentType: number
  appointmentTypeName?: string
  testType: TestTypes
  createdBy: string
}

export type AppointmentToTestTypeAssocPostRequest = Omit<AppointmentToTestTypeAssociation, 'id'>
