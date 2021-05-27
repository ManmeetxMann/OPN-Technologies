import {MigrationInterface, QueryRunner, getConnection} from 'typeorm'
import {Config} from '../../packages/common/src/utils/config'
import {initializeApp, credential, firestore} from 'firebase-admin'

const serviceAccount = JSON.parse(Config.get('FIREBASE_ADMINSDK_SA'))
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

async function insertAllUsers(): Promise<Result[]> {
  let offset = 4770
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

    const patientPromises = []
    const othersPromises = []

    for (const user of userSnapshot.docs) {
      // First step is to create Patient
      const patient = adaptPatientsData(user)
      patientPromises.push(insertData(patient, 'patient'))
      const patientResult = await promiseAllSettled(patientPromises)
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const patientId = patientResult[0].value.identifiers[0].idPatient

      if (user.data().admin) {
        const admin = adaptAdminsData(patientId, user)
        othersPromises.push(insertData(admin, 'patientAdmin'))
      }

      if (user.data().organizationIds && user.data().organizationIds.length) {
        const patientOrganizations = adaptPatientsOrganizationsData(patientId, user.data())
        othersPromises.push(insertData(patientOrganizations, 'patientToOrganization'))
      }

      const othersResults = await promiseAllSettled(othersPromises)
      results.push(...patientResult, ...othersResults)
    }
  }
  return results
}

async function insertData(snapshot, modelName: string) {
  const insertUser = async snapshot => {
    return await getConnection()
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

function adaptPatientsOrganizationsData(patientId: string, userSnapshot) {
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

function adaptPatientsDelegatesData(dependantId: string, userSnapshot) {
  return userSnapshot.delegates
    .map(delegateId => {
      if (delegateId) {
        return {
          dependantId,
          delegateId,
        }
      }
    })
    .filter(row => !!row)
}

// eslint-disable-next-line complexity
function adaptAdminsData(patientId: string, userSnapshot) {
  const snapshot = userSnapshot.data()
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
    firstName: userData.firstName || '',
    lastName: userData.lastName || '',
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

let successCount = 0
let failureCount = 0
let totalCount = 0
const limit = 1
