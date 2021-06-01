import {AppointmentStatus, filteredAppointmentStatus} from '../../src/models/appointment'

describe('Apply status mask based on appointment status and user permissions', () => {
  const params = {
    status: AppointmentStatus.Pending,
    isLabUser: false,
    isClinicUser: false,
  }

  test('should apply Submitted if appointment status is InTransit and user has no Lab or Clinic permission', () => {
    params.status = AppointmentStatus.InTransit
    params.isLabUser = false
    params.isClinicUser = false

    const status = filteredAppointmentStatus(params.status, params.isLabUser, params.isClinicUser)

    expect(status).toBe(AppointmentStatus.Submitted)
  })

  test('should not apply mask if appointment status is InTransit and user has Lab permission', () => {
    params.status = AppointmentStatus.InTransit
    params.isLabUser = true
    params.isClinicUser = false

    const status = filteredAppointmentStatus(params.status, params.isLabUser, params.isClinicUser)

    expect(status).toBe(AppointmentStatus.InTransit)
  })

  test('should not apply mask if appointment status is Received and user has Clinic permission', () => {
    params.status = AppointmentStatus.Received
    params.isLabUser = false
    params.isClinicUser = true

    const status = filteredAppointmentStatus(params.status, params.isLabUser, params.isClinicUser)

    expect(status).toBe(AppointmentStatus.Received)
  })

  test('should apply InProgress if appointment status is ReRunRequired and user no Lab or Clinic permission', () => {
    params.status = AppointmentStatus.ReRunRequired
    params.isLabUser = false
    params.isClinicUser = false

    const status = filteredAppointmentStatus(params.status, params.isLabUser, params.isClinicUser)

    expect(status).toBe(AppointmentStatus.InProgress)
  })
})
