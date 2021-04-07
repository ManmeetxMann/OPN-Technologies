import {firestore} from 'firebase-admin'
import {PassportStatus} from '../../../passport/src/models/passport'
import {ResultTypes, AppointmentStatus} from '../../../reservation/src/models/appointment'
import {TemperatureStatuses} from '../../../reservation/src/models/temperature'
import {PulseOxygenStatuses} from '../../../reservation/src/models/pulse-oxygen'

export type ActionItem = {
  id: string // organization id
  latestPassport: null | {
    passportId: string
    status: PassportStatus
    expiry: firestore.Timestamp
    timestamp: firestore.Timestamp
  }
  latestAttestation: null | {
    attestationId: string
    status: PassportStatus
    timestamp: firestore.Timestamp
  }
  latestTemperature: null | {
    temperatureId: string
    temperature: string // number?
    status: TemperatureStatuses
    timestamp: firestore.Timestamp
  }
  scheduledPCRTest: null | {
    appointmentId: string
    status: AppointmentStatus
    date: firestore.Timestamp
    timestamp: firestore.Timestamp
  }
  PCRTestResult: null | {
    testId: string
    result: ResultTypes
    timestamp: firestore.Timestamp
  }
  latestPulse: null | {
    pulseId: string
    pulse: number
    oxygen: number
    status: PulseOxygenStatuses
    timestamp: firestore.Timestamp
  }
}

export enum Recommendations {
  StatusInfo = 'StatusInfo',
  PassAvailable = 'PassAvailable',
  CompleteAssessment = 'CompleteAssessment',
  UpdateAssessment = 'UpdateAssessment',
  BadgeExpiry = 'BadgeExpiry',
  TempCheckRequired = 'TempCheckRequired',
  ViewNegativeTemp = 'ViewNegativeTemp',
  ViewPositiveTemp = 'ViewPositiveTemp',
  BookPCR = 'BookPCR',
  BookingDetailsPCR = 'BookingDetailsPCR',
  CheckInPCR = 'CheckInPCR',
  ResultReadiness = 'ResultReadiness',
  ViewNegativePCR = 'ViewNegativePCR',
  ViewPositivePCR = 'ViewPositivePCR',
}
