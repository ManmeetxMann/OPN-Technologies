import * as functions from 'firebase-functions'
import * as _ from 'lodash'
import {getCreateDatabaseConnection} from './connection'
import * as patientEntries from '../../../../services-v2/apps/user-service/src/model/patient/patient.entity'
import moment from 'moment'

class UserHandler {
  static limit = 10

  static async checkUserSyncCoverage() {
    // functions.firestore
    const patients = await UserHandler.getPatients(0)
    return patients
  }

  /**
   * Type ORM repositories
   */
  private static async getRepositories() {
    const connection = await getCreateDatabaseConnection()
    const userRepository = connection.getRepository(patientEntries.Patient)
    const userAuthRepository = connection.getRepository(patientEntries.PatientAuth)

    return {userRepository, userAuthRepository}
  }

  /**
   * Deep diff of 2 objects
   */
  private static async getDataDiffKeys(newValue, previousValue) {
    function changes(object, base) {
      return _.transform(object, function (result, value, key) {
        if (!_.isEqual(value, base[key])) {
          result[key] =
            _.isObject(value) && _.isObject(base[key]) ? changes(value, base[key]) : value
        }
      })
    }
    return changes(newValue, previousValue)
  }

  private static async getPatients(offset) {
    try {
      const {userRepository} = await UserHandler.getRepositories()
      return await userRepository
        .createQueryBuilder('patient')
        .where('patient.createdAt > :start_at', {
          start_at: moment().subtract(24, 'hours').utc().format('YYYY-MM-DD HH:mm:ss'),
        })
        .offset(offset)
        .limit(UserHandler.limit)
        .getMany()
    } catch (error) {
      console.warn(error)
      throw error
    }
  }
}

export {UserHandler}
