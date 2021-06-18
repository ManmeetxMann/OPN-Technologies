import {AppointmentDBModel, Gender} from '@opn-reservation-v1/models/appointment'

export class BufferTestUtility {
  toBase64Json(content: Record<string, unknown>): string {
    return Buffer.from(JSON.stringify(content)).toString('base64')
  }
  getAppointmentData(userId: string): Partial<AppointmentDBModel> {
    return {
      patientId: userId,
      gender: Gender.Male,
      phone: '3749999999',
      dateOfBirth: '02/02/2002',
      ohipCard: '111',
      travelID: '111',
      travelIDIssuingCountry: 'Canada',
      address: 'Canada',
      addressUnit: 'Street',
      postalCode: '1111',
      city: 'Toronto',
      country: 'Canada',
      province: 'Ontario',
      agreeToConductFHHealthAssessment: true,
      readTermsAndConditions: true,
      receiveNotificationsFromGov: true,
      receiveResultsViaEmail: true,
      shareTestResultWithEmployer: true,
    }
  }
}
