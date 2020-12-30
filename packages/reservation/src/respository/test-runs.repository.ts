import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {TestRunDBModel} from '../models/test-runs'

export class TestRunsRepository extends DataModel<TestRunDBModel> {
  public rootPath = 'test-runs'
  readonly zeroSet = []

  constructor(dataStore: DataStore) {
    super(dataStore)
  }
}
