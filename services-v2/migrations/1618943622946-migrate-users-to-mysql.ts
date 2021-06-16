import {MigrationInterface, QueryRunner, getConnection, getRepository} from 'typeorm'
import {initializeApp, credential, firestore} from 'firebase-admin'
import {Patient} from '../apps/user-service/src/model/patient/patient.entity'
import * as dotenv from 'dotenv'
const config = dotenv.config()

const CHECK_DUPLICATES = false

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
      if (CHECK_DUPLICATES) {
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
    throw new Error(
      `There are duplicate users with this ${JSON.stringify(duplicates)} authUserIds in Firestore`,
    )
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

    patients.forEach(patients => {
      if (isEmoji(patients.firstName)) {
        patients.firstName = removeEmojis(patients.firstName)
        logEmoji(patients)
      }
      if (isEmoji(patients.lastName)) {
        patients.lastName = removeEmojis(patients.lastName)
        logEmoji(patients)
      }
    })

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

      const authData = adaptAuthData(patientId, normalUser)
      othersPromises.push(insertData(authData, 'patientAuth'))

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

function isEmoji(str) {
  var ranges = [
    '(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|\ud83c[\ude32-\ude3a]|\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])',
  ]
  if (str.match(ranges.join('|'))) {
    return true
  } else {
    return false
  }
}

function removeEmojis(string) {
  var regex = /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|\ud83c[\ude32-\ude3a]|\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/g
  return string.replace(regex, '')
}

function logEmoji(patients) {
  console.log('\n\n\n REMOVED EMOJI FROM NAME >>>>>>>', patients)
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
    authUserId: user.authUserId || null,
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
