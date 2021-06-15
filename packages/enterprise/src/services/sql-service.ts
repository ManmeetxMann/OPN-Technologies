import {getConnection} from 'typeorm'
import * as patientEntries from '../../../../services-v2/apps/user-service/src/model/patient/patient.entity'
import {SqlServiceInterface} from '../interfaces/sql-service-interface'

export class SqlService implements SqlServiceInterface {
  private returnConnection(model) {
    return getConnection().getRepository(model)
  }

  async getPatientByFirebaseKey(firebaseKey: string): Promise<unknown> {
    const usersRepositoryV2 = this.returnConnection(patientEntries.Patient)
    return usersRepositoryV2.findOne({where: {firebaseKey}})
  }
}
