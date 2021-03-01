import {firestore} from 'firebase-admin'
import {PassportStatus} from '../../../passport/src/models/passport'
import {ResultTypes} from '../../../reservation/src/models/appointment'
import {TemperatureStatuses} from '../../../reservation/src/models/temperature'

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
    testId: string
    date: firestore.Timestamp
    timestamp: firestore.Timestamp
  }
  PCRTestResult: null | {
    testId: string
    result: ResultTypes
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
