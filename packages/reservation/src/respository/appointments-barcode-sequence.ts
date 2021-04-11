import {AppoinmentBarCodeSequenceDBModel} from '../models/appointment'
import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {Config} from '../../../common/src/utils/config'

export class AppointmentsBarCodeSequence extends DataModel<AppoinmentBarCodeSequenceDBModel> {
  public rootPath = 'appointment-barcode-sequence'
  readonly zeroSet = []
  constructor(dataStore: DataStore) {
    super(dataStore)
  }

  public async getNextBarCode(): Promise<null | AppoinmentBarCodeSequenceDBModel> {
    const prefix = Config.get('BARCODE_SEQ_PREFIX') ?? 'TEST'
    const barcodesCollection = this.datastore.firestoreORM.collection({path: this.rootPath})
    const sequence = barcodesCollection.docRef(prefix)

    let result = null
    await this.datastore.firestoreORM.runTransaction(async (tx) => {
      const doc = await tx.get(sequence)
      const sequenceExists = doc.data()
      if (sequenceExists) {
        const newBarcode = sequenceExists.barCodeNumber + 1
        result = {id: doc.id, barCodeNumber: newBarcode}
        tx.update(sequence, result)
      } else {
        result = {id: prefix, barCodeNumber: 1000000000}
        tx.set(sequence, result)
      }
    })

    return result
  }
}
