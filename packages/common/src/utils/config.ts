// Load up environment vars
import * as dotenv from 'dotenv'
import * as path from 'path'

//Settings Common for All Environments
const applicationSettings: Record<string, string> = {
  ACUITY_CALENDAR_URL: 'https://app.acuityscheduling.com/schedule.php',
  TEST_APPOINTMENT_TOPIC: 'test-appointment-topic',
  PCR_TEST_TOPIC: 'pcr-test-topic',
  PASSPORT_TOPIC: 'passport-topic',
  TEMPERATURE_TOPIC: 'temperature-topic',
  ATTESTATION_TOPIC: 'attestation-topic',
  PCR_VALIDITY_HOURS: '60',
}

// Class to handle env vars
export class Config {
  private static loaded = false
  static load(): void {
    dotenv.config({path: path.resolve(__dirname, '../../.env')})
    Config.loaded = true
  }

  static get(parameter: string): string {
    if (!Config.loaded) {
      Config.load()
    }

    const variable = process.env[parameter] ?? applicationSettings[parameter]
    if (!variable && !parameter.startsWith('FEATURE_') && !parameter.startsWith('DEBUG_')) {
      console.warn(`${parameter} is not defined in this environment. This is likely an error`)
    }
    return variable
  }

  static getInt(key: string, defaultValue?: number): number {
    const value = Config.get(key)
    return value ? parseInt(value) : defaultValue
  }
}
