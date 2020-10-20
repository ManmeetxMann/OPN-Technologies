import {AppoinmentBarCodeSequenceDBModel} from '../models/appoinment'
import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'

export class AppoinmentsDBRepository extends DataModel<AppoinmentBarCodeSequenceDBModel> {
  public rootPath = 'appointment-barcode-sequence'
  readonly zeroSet = []
  constructor(dataStore: DataStore) {
    super(dataStore)
  }

  public async getNextBarCode(): Promise<null | AppoinmentBarCodeSequenceDBModel> {
    const prefix = 'A'
    return this.get(prefix)
      .then((sequence) =>
        !!sequence
          ? this.increment(prefix, 'barCodeNumber', 1)
          : this.add({id: prefix, barCodeNumber: 1000000000}),
      )
      .then((barCode) => barCode)
  }
}
