import {firestore} from 'firebase-admin'
import {Auditable} from '../../../common/src/types/auditable'

export type TestRunsRequest = {
  testRunDate: string
}

export type TestRunsPostRequest = {
  testRunDateTime: string
  name: string
  labId: string
}

export type TestRunDBModel = Auditable &
  TestRun & {
    id: string
    testRunDate: string
  }

export type TestRun = {
  testRunId: string
  testRunDateTime: firestore.Timestamp
  name: string
  labId: string
  createdBy: string
}

type TestRunUi = {
  testRunId: string
  testRunDateTime: string
  name: string
}

export const testRunDTOResponse = (testRun: TestRunDBModel): TestRunUi => ({
  testRunId: testRun.testRunId,
  testRunDateTime: testRun.testRunDateTime.hasOwnProperty('_seconds')
    ? testRun.testRunDateTime.toDate().toISOString()
    : new Date(`${testRun.testRunDateTime}`).toISOString(),
  name: testRun.name,
})
