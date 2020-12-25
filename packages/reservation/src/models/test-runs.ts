import {Auditable} from '../../../common/src/types/auditable'

export type TestRunsRequest = {
  testRunDate: string
}

export type TestRunsPostRequest = {
  testRunDateTime: string
}

export type TestRunDBModel = Auditable & {
  id: string
  testRunId: string
  testRunDateTime: string
  testRunDate: string
}

export type TestRun = {
  testRunId: string
  testRunDateTime: string
}

export const testRunDTOResponse = (testRun: TestRunDBModel): TestRun => ({
  testRunId: testRun.testRunId,
  testRunDateTime: testRun.testRunDateTime,
})
