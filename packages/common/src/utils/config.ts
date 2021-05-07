// Load up environment vars
import * as dotenv from 'dotenv'
import * as path from 'path'
import {envConfig} from '../env-config'

const envSpecificConfig = envConfig()

// Class to handle env vars
export class Config {
  private static dotEnvPath = '../../.env'
  private static loaded = false

  static load(): void {
    const result = dotenv.config({path: path.resolve(__dirname, this.dotEnvPath)})
    if (result.error) {
      console.error(`Error loading dot env file path: ${this.dotEnvPath}`)
      console.error(result.error)
    }

    Config.loaded = true
  }

  static get(parameter: string): string {
    if (!Config.loaded) {
      Config.load()
    }

    const config = {...envSpecificConfig, ...process.env}

    const variable = config[parameter] as string
    if (!variable && !parameter.startsWith('FEATURE_') && !parameter.startsWith('DEBUG_')) {
      console.warn(`${parameter} is not defined in this environment. This is likely an error`)
    }
    return variable
  }

  static getInt(key: string, defaultValue?: number): number {
    const value = Config.get(key)
    return value ? parseInt(value) : defaultValue
  }

  static getAll(): Record<string, string | number | boolean> {
    if (!Config.loaded) {
      Config.load()
    }

    return {...envSpecificConfig, ...process.env}
  }

  /**
   * Should be called first before importing dependant modules from v2
   */
  static useRootEnvFile(): void {
    this.dotEnvPath = './.env'
  }
}
