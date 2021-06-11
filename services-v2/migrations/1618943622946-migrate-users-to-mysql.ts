import {MigrationInterface, QueryRunner, getConnection, getRepository} from 'typeorm'
import {Config} from '../../packages/common/src/utils/config'
import {initializeApp, credential, firestore} from 'firebase-admin'
import {Patient} from '../apps/user-service/src/model/patient/patient.entity'

import * as dotenv from 'dotenv'
const config = dotenv.config()

if (config.error) {
  console.error('No .env file')
  process.exit(1)
}

const serviceAccount = JSON.parse(process.env.FIREBASE_ADMINSDK_SA)
console.log('\n\n GCP project id:' + serviceAccount.project_id)

initializeApp({
  credential: credential.cert(serviceAccount),
})
const database = firestore()

enum ResultStatus {
  Fulfilled = 'fulfilled',
  Rejected = 'rejected',
}

type Result = {
  status: ResultStatus
  value: unknown
}

export class migrateUsersToMysql1618943622946 implements MigrationInterface {
  public async up(): Promise<void> {
    try {
      console.log(`Migration Starting Time: ${new Date()}`)
      if (false) {
        await checkUsersBeforeMigrate()
      }
      const results = await insertAllUsers()

      results.forEach(result => {
        totalCount += 1
        if (result.status === ResultStatus.Fulfilled) {
          if (result.value) {
            successCount += 1
          }
        } else {
          console.error(result.value)
          failureCount += 1
        }
      })
      console.log(`Successfully inserted ${successCount} `)
    } catch (error) {
      console.error('Error running migration', error)
      throw error
    } finally {
      console.warn(`Inserting Failed ${failureCount} `)
      console.log(`Total Results Processed: ${totalCount} `)
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {}
}

async function promiseAllSettled(promises: Promise<unknown>[]): Promise<Result[]> {
  return Promise.all(
    promises.map(promise =>
      promise
        .then(value => ({
          status: ResultStatus.Fulfilled,
          value,
        }))
        .catch((error: unknown) => ({
          status: ResultStatus.Rejected,
          value: error,
        })),
    ),
  )
}

async function checkUsersBeforeMigrate() {
  let offset = 0
  let hasMore = true
  const duplicates = []
  while (hasMore) {
    const userSnapshot = await getFirebaseUsers(offset)
    const authUserIds = getAuthUserIds(userSnapshot)
    const users = await getFirebaseUsersByAuthUserIds(authUserIds)
    const foundedUsersAuthIds = getAuthUserIds(users)

    if (hasDuplicates(foundedUsersAuthIds)) {
      duplicates.push(...getDuplicates(foundedUsersAuthIds))
    }

    offset += userSnapshot.docs.length
    hasMore = !userSnapshot.empty
  }

  if (duplicates && duplicates.length) {
    throw new Error(`There are duplicate users with this ${JSON.stringify(duplicates)} authUserIds in Firestore`)
  }
}

function getAuthUserIds(userSnapshot) {
  if (!userSnapshot || !userSnapshot.docs || !userSnapshot.docs.length) {
    return []
  }

  return userSnapshot.docs.map(user => {
    return user.data().authUserId
  })
}

function getDuplicates(array) {
  const duplicates = array.filter((item, index) => array.indexOf(item) !== index)

  return [...new Set(duplicates)]
}

function hasDuplicates(array) {
  return new Set(array).size != array.length
}

async function getFirebaseUsers(offset) {
  return database
    .collection('users')
    .where('authUserId', '!=', null)
    .offset(offset)
    .limit(10)
    .get()
}

async function getFirebaseUsersByAuthUserIds(authUserIds) {
  try {
    if (!authUserIds || !authUserIds.length) {
      return []
    }
    return database
      .collection('users')
      .where('authUserId', 'in', authUserIds)
      .get()
  } catch (error) {
    console.warn(error)
    throw error
  }
}

async function insertAllUsers(): Promise<Result[]> {
  let offset = 0
  let hasMore = true

  const results: Result[] = []
  while (hasMore) {
    const userSnapshot = await database
      .collection('users')
      .offset(offset)
      .limit(limit)
      .get()

    offset += userSnapshot.docs.length
    hasMore = !userSnapshot.empty
    //hasMore = false

    const othersPromises = []
    const patients = []

    for (const user of userSnapshot.docs) {
      patients.push(adaptPatientsData(user))
    }

    const patientResults = await insertData(patients, 'patient')
    const newPatients = await getPatientsByIds(
      patientResults.identifiers.map(elem => elem.idPatient),
    )

    for (const firebaseUser of userSnapshot.docs) {
      const normalUser = firebaseUser.data()
      const patient = newPatients.find(elem => elem.firebaseKey == firebaseUser.id)
      const patientId = patient.idPatient

      if (normalUser.admin) {
        const admin = adaptAdminsData(patientId, normalUser)
        othersPromises.push(insertData(admin, 'patientAdmin'))
      }

      if (normalUser.authUserId) {
        const authData = adaptAuthData(patientId, normalUser)
        othersPromises.push(insertData(authData, 'patientAuth'))
      }

      if (normalUser.organizationIds && normalUser.organizationIds.length) {
        const patientOrganizations = adaptPatientsOrganizationsData(patientId, normalUser)
        othersPromises.push(insertData(patientOrganizations, 'patientToOrganization'))
      }
    }
    const othersResults = await promiseAllSettled(othersPromises)
    results.push(...othersResults)
  }
  return results
}

async function getPatientsByIds(ids) {
  return getRepository(Patient).findByIds(ids)
}

async function insertData(snapshot, modelName: string) {
  const insertUser = async snapshot => {
    return getConnection()
      .createQueryBuilder()
      .insert()
      .into(modelName)
      .values(snapshot)
      .execute()
  }
  try {
    return insertUser(snapshot)
  } catch (error) {
    console.warn(error)
    throw error
  }
}

function adaptPatientsOrganizationsData(patientId: number, userSnapshot) {
  return userSnapshot.organizationIds
    .map(firebaseOrganizationId => {
      if (firebaseOrganizationId) {
        return {
          patientId,
          firebaseOrganizationId,
        }
      }
    })
    .filter(row => !!row)
}

// eslint-disable-next-line complexity
function adaptAdminsData(patientId: number, snapshot) {
  if (snapshot?.admin) {
    const data = snapshot.admin
    return {
      patientId: patientId,
      isOpnSuperAdmin: data.isOpnSuperAdmin || false,
      isManagementDashboardAdmin: data.isManagementDashboardAdmin || false,
      isTestReportsAdmin: data.isTestReportsAdmin || false,
      isTestAppointmentsAdmin: data.isTestAppointmentsAdmin || false,
      isTestKitBatchAdmin: data.isTestKitBatchAdmin || false,
      isLabUser: data.isLabUser || false,
      isLabAppointmentsAdmin: data.isLabAppointmentsAdmin || false,
      isLabResultsAdmin: data.isLabResultsAdmin || false,
      isTransportsRunsAdmin: data.isTransportsRunsAdmin || false,
      isReceivingAdmin: data.isReceivingAdmin || false,
      isTestRunsAdmin: data.isTestRunsAdmin || false,
      isDueTodayAdmin: data.isDueTodayAdmin || false,
      isBulkUploadAdmin: data.isBulkUploadAdmin || false,
      isSingleResultSendAdmin: data.isSingleResultSendAdmin || false,
      isConfirmResultAdmin: data.isConfirmResultAdmin || false,
      isPackageAdmin: data.isPackageAdmin || false,
      isCheckInAdmin: data.isCheckInAdmin || false,
      isGenerateAdmin: data.isGenerateAdmin || false,
      isLookupAdmin: data.isLookupAdmin || false,
      createdAt: data.timestamps?.createdAt,
      updatedAt: data.timestamps?.updatedAt,
    }
  }
}

function adaptPatientsData(user) {
  const userData = user.data()
  const profileData: {
    firstName: string
    lastName: string
    photoUrl: string
    firebaseKey: string
    registrationId: string
    createdOn: string
    updatedOn: string
    dateOfBirth: string
    isEmailVerified: boolean
    phoneNumber?: string
  } = {
    firstName: userData.firstName ? userData.firstName.slice(0, 255) : '',
    lastName: userData.lastName ? userData.lastName.slice(0, 255) : '',
    photoUrl: '', // userData.base64Photo ||  @TODO Upload image to server and put image link here
    firebaseKey: user.id,
    registrationId: userData.registrationId || '',
    createdOn: userData.timestamps?.createdAt,
    updatedOn: userData.timestamps?.updatedAt,
    dateOfBirth: '',
    isEmailVerified: true,
  }
  if (userData.phone && userData.phone.number) {
    profileData.phoneNumber = `${userData.phone.number}`
  }
  if (userData.phoneNumber) {
    profileData.phoneNumber = userData.phoneNumber
  }
  return profileData
}

function adaptAuthData(patientId: number, user) {
  const profileData: {
    email?: string
    phoneNumber?: string
    authUserId: string
    patientId: number
  } = {
    email: user.email || null,
    authUserId: user.authUserId,
    patientId,
  }
  if (user.phone && user.phone.number) {
    profileData.phoneNumber = `${user.phone.number}`
  }
  if (user.phoneNumber) {
    profileData.phoneNumber = user.phoneNumber
  }
  return profileData
}

let successCount = 0
let failureCount = 0
let totalCount = 0
const limit = 1000
