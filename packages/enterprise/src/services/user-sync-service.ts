import {
  Patient,
  PatientAuth,
} from '../../../../services-v2/apps/user-service/src/model/patient/patient.entity'
import {getConnection} from 'typeorm'
import * as patientEntries from '../../../../services-v2/apps/user-service/src/model/patient/patient.entity'
import {UserSyncServiceInterface} from '../interfaces/user-sync-service-interface'
import {UpdateUserByAdminRequest, UpdateUserRequest} from '../types/update-user-request'

export class UserSyncService implements UserSyncServiceInterface {
  private returnConnection(model) {
    return getConnection().getRepository(model)
  }

  async create(
    source: Omit<
      Patient,
      'organizations' | 'idPatient' | 'createdAt' | 'updatedAt' | 'updatedBy' | 'patientPublicId'
    >,
    auth?: Omit<PatientAuth, 'patientId' | 'idPatientAuth'>,
  ): Promise<void> {
    const usersRepositoryV2 = this.returnConnection(patientEntries.Patient)
    const user = usersRepositoryV2.create(source)
    const syncUser = (await usersRepositoryV2.save(user)) as Patient

    if (auth) {
      const syncPatientAuth = {
        ...auth,
        patientId: syncUser.idPatient,
      }
      const userAuthRepository = this.returnConnection(patientEntries.PatientAuth)
      const userAuth = userAuthRepository.create(syncPatientAuth)
      await userAuthRepository.save(userAuth)
    }
  }

  async update(firebaseKey: string, source: UpdateUserRequest): Promise<void> {
    const usersRepositoryV2 = this.returnConnection(patientEntries.Patient)
    await usersRepositoryV2.update({firebaseKey: firebaseKey}, {...source})
  }

  async updateByAdmin(firebaseKey: string, source: UpdateUserByAdminRequest): Promise<void> {
    const usersRepositoryV2 = this.returnConnection(patientEntries.Patient)
    await usersRepositoryV2.update({firebaseKey: firebaseKey}, {...source})
  }

  async getByFirebaseKey(firebaseKey: string): Promise<unknown> {
    const usersRepositoryV2 = this.returnConnection(patientEntries.Patient)
    return usersRepositoryV2.findOne({where: {firebaseKey}})
  }
}
