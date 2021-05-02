import * as dotenv from 'dotenv'

export default async () => {
  // Load secrets for the .env file
  dotenv.config({path: __dirname + '/../.env'})

  console.log('\nRunning test init script')
}
