import * as functions from 'firebase-functions'
import * as _ from 'lodash'
import {getCreateDatabaseConnection} from './connection'
import * as patientEntries from '../../../../services-v2/apps/user-service/src/model/patient/patient.entity'
import {UserCreator} from '../../../../packages/common/src/data/user'
class UserHandler {
  /**
   * Handler for firestore user create
   */
  static async createUser(firebaseKey, newValue) {
    const {userRepository, userAuthRepository} = await UserHandler.getRepositories()

    if (newValue.creator == UserCreator.syncFromSQL) {
      functions.logger.log(
        `createUser skipped authUserId:${newValue.authUserId} creator:${UserCreator.syncFromSQL}`,
      )
      return
    }

    functions.logger.log(`createUser authUserId:${newValue.authUserId}`)

    const newUser = {
      firebaseKey,
      firstName: newValue.firstName,
      lastName: newValue.lastName,
      photoUrl: newValue.base64Photo,
      registrationId: newValue.registrationId ?? null,
      isEmailVerified: false, // TODO check a logic
    }

    const newUserAuth = {
      authUserId: newValue.authUserId,
      email: newValue.email,
      patientId: null,
    }

    try {
      const newUserResult = await userRepository.save(newUser)
      newUserAuth.patientId = newUserResult.idPatient
      await userAuthRepository.save(newUserAuth)

      functions.logger.log('User created')
    } catch (e) {
      functions.logger.error('Error creating user', e)
    }
  }

  /**
   * Handler for firestore user update
   */
  static async updateUser(firebaseKey, newValue, previousValue) {
    const {userRepository} = await UserHandler.getRepositories()
    const updateDiff = await this.getDataDiffKeys(newValue, previousValue)
    const keysDiff = Object.keys(updateDiff)

    functions.logger.log(`updateUser:${firebaseKey} updated properties:`, JSON.stringify(keysDiff))
    const patient = await userRepository.findOne({where: {firebaseKey}})

    if (!patient) {
      functions.logger.error('Firestore updating patient not created in SQL database')
      await UserHandler.createUser(firebaseKey, newValue)
      return
    }

    if (keysDiff.some((key) => ['authUserId', 'email'].includes(key))) {
      functions.logger.warn('Updating auth required ?')
    }

    const updateUser = {
      firebaseKey,
      firstName: newValue.firstName,
      lastName: newValue.lastName,
      photoUrl: newValue.base64Photo,
    }

    try {
      await userRepository.update({firebaseKey: firebaseKey}, updateUser)
      functions.logger.log('User updated')
    } catch (e) {
      functions.logger.error('Error creating user', e)
    }
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
}

export {UserHandler}
