/**
 * This script to go through all appointments and add locationName and locationAddress.
 */
import {initializeApp, credential, firestore} from 'firebase-admin'
import {Config} from '../packages/common/src/utils/config'
import {AcuityRepository} from '../packages/reservation/src/respository/acuity.repository'
import {FieldValue} from '@google-cloud/firestore'

const acuityRepository = new AcuityRepository()
let calendars: {id: number; location: string; name: string}[]

const serviceAccount = JSON.parse(Config.get('FIREBASE_ADMINSDK_SA'))
initializeApp({
  credential: credential.cert(serviceAccount),
})
console.log(serviceAccount.project_id)

const database = firestore()

enum ResultStatus {
  Fulfilled = 'fulfilled',
  Rejected = 'rejected',
}

type Result = {
  status: ResultStatus
  value: unknown
}

export async function promiseAllSettled(promises: Promise<unknown>[]): Promise<Result[]> {
  return Promise.all(
    promises.map((promise) =>
      promise
        .then((value) => ({
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

async function updateAppointments(): Promise<Result[]> {
  let offset = 0
  let hasMore = true
  calendars = await acuityRepository.getCalendarList()

  const results: Result[] = []

  while (hasMore) {
    const appointmentSnapshot = await database
      .collection('appointments')
      .offset(offset)
      .limit(limit)
      .get()

    offset += appointmentSnapshot.docs.length
    hasMore = !appointmentSnapshot.empty
    //hasMore = false

    for (const appoinment of appointmentSnapshot.docs) {
      const promises = []
      promises.push(addLocationsFields(appoinment))
      const result = await promiseAllSettled(promises)
      results.push(...result)
    }
  }
  return results
}

async function addLocationsFields(
  snapshot: firestore.QueryDocumentSnapshot<firestore.DocumentData>,
) {
  try {
    const appointment = snapshot.data()
    const {location, name}: {location: string; name: string} = calendars.find(
      ({id}) => appointment.calendarID == id,
    )
    const updates: {
      locationAddress?: string
      locationName?: string
      timestamps: {migrations: Record<string, FieldValue>}
    } = {
      timestamps: {
        migrations: {
          addLocationNameAndLocationAddress: firestore.FieldValue.serverTimestamp(),
        },
      },
    }

    if (!appointment.locationAddress) {
      updates.locationAddress = location
    }

    if (!appointment.locationName) {
      updates.locationName = name
    }

    if (updates.locationAddress || updates.locationName) {
      await snapshot.ref.set(updates, {
        merge: true,
      })

      console.log(`Successfully updated Appointment: ${snapshot.id} ${JSON.stringify(updates)}`)
    }

    const [doubleCheckAddressUpdate, doubleCheckNameUpdate] = await Promise.all([
      database
        .collection('appointments')
        .where(firestore.FieldPath.documentId(), '==', snapshot.id)
        .where('locationAddress', '==', appointment.locationAddress || location)
        .get(),
      database
        .collection('appointments')
        .where(firestore.FieldPath.documentId(), '==', snapshot.id)
        .where('locationName', '==', appointment.locationName || name)
        .get(),
    ])

    if (doubleCheckAddressUpdate?.docs.length !== 1 || doubleCheckNameUpdate?.docs.length !== 1) {
      return Promise.reject(
        `Failed AppointmentID: ${snapshot.id} TOTAL: ${
          doubleCheckAddressUpdate?.docs.length + doubleCheckNameUpdate?.docs.length
        }`,
      )
    }

    return snapshot.id
  } catch (error) {
    console.warn(error)
    throw error
  }
}

async function main() {
  try {
    console.log('Migration Starting')
    const results = await updateAppointments()
    results.forEach((result) => {
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
    console.log(`Succesfully updated ${successCount} `)
  } catch (error) {
    console.error('Error running migration', error)
  } finally {
    console.warn(`Failed updating ${failureCount} `)
    console.log(`Total Appointments Processed: ${totalCount} `)
  }
}

// Maximum batch size to query for
let successCount = 0
let failureCount = 0
let totalCount = 0
const limit = 50

main().then(() => console.log('Script Complete \n'))

// npm run migration:appointments-add-location-name-and-address
