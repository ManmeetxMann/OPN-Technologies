export type AppointmentToTestTypeAssociation = {
  id: string
  appointmentType: number
  testType: 'PCR' | 'RapidAntigen'
}

export type AppointmentToTestTypeAssocPostRequest = Omit<AppointmentToTestTypeAssociation, 'id'>
