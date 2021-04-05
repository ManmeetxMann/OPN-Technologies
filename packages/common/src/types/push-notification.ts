export type PushMessages = {
  token: string
  notification: {
    title: string
    body: string
    imageUrl?: string
  }
  data?: Record<string, string>
}

export type DbBatchAppointments = {
  appointmentId: string
  scheduledAppointmentType: number
}
