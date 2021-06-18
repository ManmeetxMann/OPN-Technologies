export type TestRunsPool = {
  id: string
  testResultIds: string[]
  testRunId: string
  well: string
  numberOfSamples: number
}

export type TestRunsPoolCreate = Omit<TestRunsPool, 'id'>

export type TestRunsPoolUpdate = Partial<TestRunsPoolCreate>
