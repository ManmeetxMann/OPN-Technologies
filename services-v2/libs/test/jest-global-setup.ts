import * as dotenv from 'dotenv'

/**
 * Loads secrets for the .env file
 */
export default async (): Promise<void> => {
  const path = __dirname + '/../../.env'
  const result = dotenv.config({path})

  if (result.error) {
    console.warn(result.error)
  }

  console.log('\nRunning test init script')
}
