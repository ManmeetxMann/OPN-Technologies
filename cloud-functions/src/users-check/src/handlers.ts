import * as functions from 'firebase-functions'
import {getCreateDatabaseConnection} from './connection'
import * as patientEntries from '../../../../services-v2/apps/user-service/src/model/patient/patient.entity'
import moment from 'moment'
import {initializeApp, credential, firestore} from 'firebase-admin'
import {safeTimestamp} from '../../../../packages/common/src/utils/datetime-util'
import {In} from 'typeorm'
const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG)
const oneDayByHours = 24

initializeApp({
  credential: credential.cert(serviceAccount),
})
const database = firestore()

class UserHandler {
  static limit = 10

  static async checkUserSyncCoverage() {
    let hasMore = true
    let offset = 0

    const userRepository = await UserHandler.getRepositories()

    while (hasMore) {
      const patients = await UserHandler.getPatients(offset, userRepository)
      if (patients.length) {
        const patientIds = patients.map((patient) => patient.firebaseKey)
        const firebaseUsers = await UserHandler.getFirebaseUsersByIds(patientIds)
        if (!firebaseUsers.docs.length) {
          patientIds.forEach((patientId) => {
            functions.logger.log(`patient with this ${patientId} id doesn't exists in firebase`)
          })
        } else {
          const firebaseUsersIds = firebaseUsers.docs.map((user) => user.id)
          patients.forEach((patient) => {
            if (!firebaseUsersIds.includes(patient.firebaseKey)) {
              functions.logger.log(
                `patient with this ${patient.idPatient} idPatient doesn't exists in firebase`,
              )
            }
          })
        }
      }
      offset += patients?.length
      hasMore = !!patients.length
    }
  }

  static async checkPatientSyncCoverage() {
    let offset = 0
    let hasMore = true
    const userRepository = await UserHandler.getRepositories()

    while (hasMore) {
      const firebaseUsers = await UserHandler.getFirebaseUsers(offset)
      if (firebaseUsers.docs.length) {
        const firebaseUserIds = firebaseUsers.docs.map((user) => user.id)
        const patients = await UserHandler.getPatientsByFirebaseKeys(
          firebaseUsers.docs.map((user) => user.id),
          userRepository,
        )

        if (!patients.length) {
          firebaseUserIds.forEach((firebaseUserId) => {
            functions.logger.log(`user with this ${firebaseUserId} id doesn't exists in mysql`)
          })
        } else {
          const patientFirebaseKeys = patients.map((patient) => patient.firebaseKey)
          firebaseUsers.docs.forEach((user) => {
            if (!patientFirebaseKeys.includes(user.id)) {
              functions.logger.log(`user with this ${user.id} id doesn't exists in mysql`)
            }
          })
        }
      }
      offset += firebaseUsers?.docs?.length
      hasMore = !firebaseUsers.empty
    }
  }

  /**
   * Type ORM repositories
   */
  private static async getRepositories() {
    const connection = await getCreateDatabaseConnection()
    const userRepository = connection.getRepository(patientEntries.Patient)

    return userRepository
  }

  private static async getFirebaseUsers(offset) {
    try {
      return database
        .collection('users')
        .where(
          'timestamps.createdAt',
          '>=',
          safeTimestamp(
            moment().subtract(oneDayByHours, 'hours').utc().format('YYYY-MM-DD HH:mm:ss'),
          ),
        )
        .offset(offset)
        .limit(UserHandler.limit)
        .get()
    } catch (error) {
      console.warn(error)
      throw error
    }
  }

  private static async getFirebaseUsersByIds(ids) {
    return await database
      .collection('users')
      .where(firestore.FieldPath.documentId(), 'in', ids)
      .get()
  }

  private static async getPatientsByFirebaseKeys(firebaseKeys, userRepository) {
    return await userRepository.find({
      where: {
        firebaseKey: In(firebaseKeys),
      },
    })
  }

  private static async getPatients(offset, userRepository) {
    try {
      return await userRepository
        .createQueryBuilder('patient')
        .where('patient.createdAt > :start_at', {
          start_at: moment().subtract(oneDayByHours, 'hours').utc().format('YYYY-MM-DD HH:mm:ss'),
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
