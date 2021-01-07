import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {PCRTestResultDBModel} from '../models/pcr-test-results'

export class PCRTestResultsRepository extends DataModel<PCRTestResultDBModel> {
  public rootPath = 'pcr-test-results'
  readonly zeroSet = []

  constructor(dataStore: DataStore) {
    super(dataStore)
  }

  public async save(data: Omit<PCRTestResultDBModel, 'id'>): Promise<PCRTestResultDBModel> {
    return this.add(data)
  }
}
