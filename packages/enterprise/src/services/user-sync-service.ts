import {NewSyncUser} from '../types/new-user'

import {getConnection} from 'typeorm'
import * as patientEntries from '../../../../services-v2/apps/user-service/src/model/patient/patient.entity'
import {UserSyncServiceInterface} from '../interfaces/user-sync-service-interface'
import {UpdateUserByAdminRequest, UpdateUserRequest} from '../types/update-user-request'

export class UserSyncService implements UserSyncServiceInterface {
  private returnConnection() {
    return getConnection().getRepository(patientEntries.Patient)
  }

  async create(source: NewSyncUser): Promise<void> {
    const usersRepositoryV2 = this.returnConnection()
    const user = usersRepositoryV2.create(source)

    await usersRepositoryV2.save(user)
  }

  async update(firebaseKey: string, source: UpdateUserRequest): Promise<void> {
    const usersRepositoryV2 = this.returnConnection()
    await usersRepositoryV2.update({firebaseKey: firebaseKey}, {...source})
  }

  async updateByAdmin(firebaseKey: string, source: UpdateUserByAdminRequest): Promise<void> {
    const usersRepositoryV2 = this.returnConnection()
    await usersRepositoryV2.update({firebaseKey: firebaseKey}, {...source})
  }
}
