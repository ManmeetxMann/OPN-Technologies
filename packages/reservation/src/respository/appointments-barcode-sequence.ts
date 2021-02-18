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
    return this.get(prefix)
      .then((sequence) =>
        !!sequence
          ? this.increment(prefix, 'barCodeNumber', 1)
          : this.add({id: prefix, barCodeNumber: 1000000000}),
      )
      .then((barCode) => barCode)
  }
}
