import {firestore} from 'firebase-admin'

const database = firestore()
const collectionName = 'comment'

// : Promise<unknown>
export const createComment = async (
  dataOverwrite: {
    id?: string
    testResultId: string
  },
  testDataCreator: string,
): Promise<void> => {
  //console.log(new Date(dataOverwrite.dateTime))
  const data = {
    addedBy: 'USER1',
    assignedTo: null,
    attachmentUrls: ['https://via.placeholder.com/200'],
    comment: 'Hi, my testing comment',
    internal: false,
    replyTo: null,
    testResultId: dataOverwrite.testResultId,
    timestamps: {
      createdAt: firestore.Timestamp.fromDate(new Date()),
      updatedAt: null,
    },
    testDataCreator,
  }
  //console.log(data)
  if (dataOverwrite.id) {
    await database.collection(collectionName).doc(dataOverwrite.id).set(data)
  } else {
    await database.collection(collectionName).add(data)
  }
  //console.log(`savedData.id: ${savedData.id}`)
}

export const deleteCommentByTestDataCreator = async (pcrTestId: string): Promise<void> => {
  const appointments_query = database
    .collection(collectionName)
    // .where('dateTime', '<=', firestore.Timestamp.fromDate(new Date(dateTime)))
    .where('testResultId', '==', pcrTestId)
  await appointments_query.get().then(function (querySnapshot) {
    querySnapshot.forEach(function (doc) {
      doc.ref.delete()
    })
  })
}
