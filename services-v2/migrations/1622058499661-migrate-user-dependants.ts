import {MigrationInterface, QueryRunner, getConnection, getRepository} from 'typeorm'
import {firestore} from 'firebase-admin'
import {Patient} from '../apps/user-service/src/model/patient/patient.entity'

const database = firestore()

enum ResultStatus {
  Fulfilled = 'fulfilled',
  Rejected = 'rejected',
}

type Result = {
  status: ResultStatus
  value: unknown
}

export class migrateUsersDependants1622058499661 implements MigrationInterface {
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

    const othersPromises = []

    for (const user of userSnapshot.docs) {
      const patient = await getPatientByKey(user.id)

      if (user.data().delegates && user.data().delegates.length) {
        const patientDelegates = await adaptPatientsDelegatesData(patient.idPatient, user.data())
        othersPromises.push(insertData(patientDelegates, 'patientToDelegates'))
      }

      const othersResults = await promiseAllSettled(othersPromises)
      results.push(...othersResults)
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

async function getPatientByKey(firebasekey: string) {
  try {
    return await getRepository(Patient)
      .createQueryBuilder('patient')
      .where('patient.firebaseKey = :firebasekey', {firebasekey})
      .getOne()
  } catch (error) {
    console.warn(error)
    throw error
  }
}

async function adaptPatientsDelegatesData(delegateId: number, userSnapshot) {
  const delegates = await Promise.all(
    userSnapshot.delegates.map(async dependantId => {
      if (dependantId) {
        const dependant = await getPatientByKey(dependantId)
        if (dependant) {
          return {
            dependantId: dependant.idPatient,
            delegateId,
          }
        }
      }
    }),
  )
  return delegates.filter(row => !!row)
}

let successCount = 0
let failureCount = 0
let totalCount = 0
const limit = 1000
