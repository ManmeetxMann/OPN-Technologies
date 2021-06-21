import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import DBSchema from '../dbschemas/test-runs-pool.schema'
import {TestRunsPool, TestRunsPoolCreate} from '../models/test-runs-pool'

export class TestRunsPoolRepository extends DataModel<TestRunsPool> {
  public rootPath = 'test-runs-pools'
  readonly zeroSet = []

  constructor(dataStore: DataStore) {
    super(dataStore)
  }

  async save(data: TestRunsPoolCreate): Promise<TestRunsPool> {
    const validData = await DBSchema.validateAsync(data)
    return this.add(validData)
  }
}
