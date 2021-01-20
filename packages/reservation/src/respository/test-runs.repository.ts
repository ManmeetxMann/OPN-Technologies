import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {TestRunDBModel} from '../models/test-runs'
import {IdentifiersModel} from '../../../common/src/data/identifiers'

export class TestRunsRepository extends DataModel<TestRunDBModel> {
  public rootPath = 'test-runs'
  readonly zeroSet = []

  constructor(dataStore: DataStore) {
    super(dataStore)
  }
}

export class DateTestRunsRepository extends IdentifiersModel {
  public rootPath
  readonly zeroValue = 0
  constructor(dataStore: DataStore, testRunDate: string) {
    super(dataStore)
    this.rootPath = `__identifiers/testRun/${testRunDate}`
  }

  async getUniqueId(identifierName: string): Promise<string> {
    const currentIdentifier = await this.get(identifierName)
    if (!currentIdentifier) {
      await this.add({
        id: identifierName,
        count: this.zeroValue,
      })
    }
    return this.increment(identifierName, 'count', 1).then(({count}) => count.toString())
  }
}
