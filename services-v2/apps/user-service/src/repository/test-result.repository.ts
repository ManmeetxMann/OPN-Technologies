import DataModel from '@opn-common-v1/data/datamodel.base'
import DataStore from '@opn-common-v1/data/datastore'
import {TestResultCreateDto} from '../dto/test-result'

export class PCRTestResultsRepository extends DataModel<TestResultCreateDto> {
  public rootPath = 'pcr-test-results'
  readonly zeroSet = []
  constructor(dataStore: DataStore) {
    super(dataStore)
  }
}
