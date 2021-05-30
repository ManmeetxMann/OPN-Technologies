import * as yaml from 'js-yaml'
import * as fs from 'fs'

/**
 * Loads secrets for the .env file
 */
export default async (): Promise<void> => {
  const loadServiceEnv = (servicePath) => {
    let envVariables = {}

    // Read yaml with secrets to object
    try {
      const path = __dirname + `/src/${servicePath}/.env`
      envVariables = yaml.load(fs.readFileSync(path, 'utf8'))
    } catch (e) {
      console.log(e)
    }

    // Set variables in  process.env
    for (const envVariable in envVariables) {
      process.env[envVariable] = envVariables[envVariable]
    }
  }

  //   loadServiceEnv('hl7-egress')
  //   loadServiceEnv('sms-notification')
  loadServiceEnv('users-sync')

  console.log('\nRunning test init script')
}
