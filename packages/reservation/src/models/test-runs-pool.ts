export type TestRunsPool = {
  id: string
  appointmentIds: string[]
  testRunId: string
  well: string
}

export type TestRunsPoolCreate = Omit<TestRunsPool, 'id'>
