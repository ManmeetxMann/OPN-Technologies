import {firestore} from 'firebase-admin'

const database = firestore()
const collectionName = 'admin-scan-history'

export const deleteAll = async (): Promise<void> => {
  const appointments_query = database.collection(collectionName)
  await appointments_query.get().then(function (querySnapshot) {
    querySnapshot.forEach(function (doc) {
      doc.ref.delete()
    })
  })
}

export const bulkDelete = async (ids: string[]): Promise<void> => {
  const appointments_query = database.collection(collectionName)

  await appointments_query
    .where('id', 'in', ids)
    .get()
    .then(function (querySnapshot) {
      querySnapshot.forEach(function (doc) {
        doc.ref.delete()
      })
    })
}
