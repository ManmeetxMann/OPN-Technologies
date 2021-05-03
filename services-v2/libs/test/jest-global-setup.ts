import * as dotenv from 'dotenv'

/**
 * Loads secrets for the .env file, initiates firestore connection for utils access
 */
export default async () => {
  const path = __dirname + '/../../.env'
  const result = dotenv.config({path})

  if (result.error) {
    console.warn(result.error)
  }

  console.log('\nRunning test init script')
}
