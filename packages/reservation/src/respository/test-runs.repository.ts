import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {IdentifiersModel} from '../../../common/src/data/identifiers'
import DBSchema from '../dbschemas/test-runs.schema'

import {TestRunDBModel} from '../models/test-runs'

export class TestRunsRepository extends DataModel<TestRunDBModel> {
  public rootPath = 'test-runs'
  readonly zeroSet = []

  constructor(dataStore: DataStore) {
    super(dataStore)
  }

  async save(data: TestRunDBModel): Promise<TestRunDBModel> {
    const validatedData = await DBSchema.validateAsync(data)
    return this.add(validatedData)
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
