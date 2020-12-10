import {AppointmentDTO, AppointmentUI} from './appoinment'

export type TestResultsUiDTO = {
  id: number
  firstName: string
  lastName: string
  testType: string
  dateOfAppointment: string
}

export const testResultUiDTOResponse = (
  appointment: AppointmentDTO | AppointmentUI,
): TestResultsUiDTO => ({
  id: (appointment as AppointmentUI).id,
  firstName: appointment.firstName,
  lastName: appointment.lastName,
  testType: 'PCR',
  dateOfAppointment: (appointment as AppointmentUI).dateOfAppointment,
})
