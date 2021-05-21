export const isJestTest = process.env.NODE_ENV === 'test'
/**
 * If running in jest test start on
 */
export const getDefaultPort = (): number => {
  let defaultPort = 8080
  if (isJestTest) {
    // Each worker process is assigned a unique id (index-based that starts with 1)
    const jestWorkerId = parseInt(process.env.JEST_WORKER_ID)
    defaultPort = defaultPort + jestWorkerId
  }
  return parseInt(process.env.PORT) || defaultPort
}
