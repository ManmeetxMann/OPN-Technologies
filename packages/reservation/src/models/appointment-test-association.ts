export type AppointmentToTestTypeAssociation = {
  id: string
  appointmentType: number
  testType: 'PCR' | 'RapidAntigen'
  appointmentTypeName?: string
}

export type AppointmentToTestTypeAssocPostRequest = Omit<AppointmentToTestTypeAssociation, 'id'>
