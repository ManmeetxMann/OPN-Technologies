import {UpdateUserByAdminRequest, UpdateUserRequest} from '../types/update-user-request'
import {
  Patient,
  PatientAuth,
} from '../../../../services-v2/apps/user-service/src/model/patient/patient.entity'

export interface UserSyncServiceInterface {
  create(
    source: Omit<
      Patient,
      'idPatient' | 'createdAt' | 'updatedAt' | 'updatedBy' | 'generatePublicId'
    >,
    auth?: Omit<PatientAuth, 'patientId' | 'idPatientAuth'>,
  ): Promise<void>
  update(firebaseKey: string, source: UpdateUserRequest): Promise<void>
  updateByAdmin(firebaseKey: string, source: UpdateUserByAdminRequest): Promise<void>
}
