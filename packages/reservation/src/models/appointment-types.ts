export type AppointmentTypes = {
  id: number
  name: string
  calendarIDs: number[]
  description: string
  price: string
  category: string
  active: boolean
  duration: number
  private: boolean
  type: string
}

//DTO for API Responses
export type AppointmentTypeUiDTO = {
  id: number
  name: string
}

export const appointmentTypeUiDTOResponse = (type: AppointmentTypes): AppointmentTypeUiDTO => {
  return {
    id: type.id,
    name: type.name,
  }
}
