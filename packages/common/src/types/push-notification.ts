export type PushMessages = {
  token: string
  notification: {
    title: string
    body: string
    imageUrl?: string
  }
  data?: {
    [key: string]: string
  }
}

export type DbBatchAppointments = {
  appointmentId: string
  scheduledAppointmentType: number
}
