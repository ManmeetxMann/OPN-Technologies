import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {
  TestResultsReportingTrackerDBModel,
  TestResultsReportingTrackerPCRResultsDBModel,
} from '../models/pcr-test-results'

export class TestResultsReportingTrackerRepository extends DataModel<TestResultsReportingTrackerDBModel> {
  public rootPath = 'test-results-reporting-tracker'
  readonly zeroSet = []

  constructor(dataStore: DataStore) {
    super(dataStore)
  }

  public async save(): Promise<TestResultsReportingTrackerDBModel> {
    return this.add({})
  }
}

export class TestResultsReportingTrackerPCRResultsRepository extends DataModel<TestResultsReportingTrackerPCRResultsDBModel> {
  public rootPath
  readonly zeroSet = []
  constructor(dataStore: DataStore, reportTrackerId: string) {
    super(dataStore)
    this.rootPath = `test-results-reporting-tracker/${reportTrackerId}/pcr-results`
  }

  public async saveAll(
    pcrResults: Omit<TestResultsReportingTrackerPCRResultsDBModel, 'id'>[],
  ): Promise<TestResultsReportingTrackerPCRResultsDBModel[]> {
    return this.addAll(pcrResults)
  }
}
