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

    await this.datastore.firestoreORM.runTransaction(async (tx) => {
      const doc = await tx.get(sequence)
      const sequenceExists = doc.data()

      if (sequenceExists) {
        const newBarcode = doc.data().barCodeNumber + 1

        tx.update(sequence, {barCodeNumber: newBarcode})
      } else {
        tx.set(sequence, {id: prefix, barCodeNumber: 1000000000})
      }
    })

    return this.get(prefix).then((barCode) => barCode)
  }
}
