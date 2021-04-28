// Load up environment vars
import * as dotenv from 'dotenv'
import * as path from 'path'
import {globalConfig} from '../config/env/global.configuration'
import {envConfig} from '../config/env'

const envSpecificConfig = envConfig()

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

    const config = {...globalConfig, ...envSpecificConfig, ...process.env}

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

    return {...globalConfig, ...envSpecificConfig, ...process.env}
  }
}
