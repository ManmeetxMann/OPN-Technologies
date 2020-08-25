// Load up environment vars
import dotenv from 'dotenv'
import path from 'path'

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
    const variable = process.env[parameter]
    if (!variable && !parameter.startsWith('FEATURE_')) {
      console.warn(`${parameter} is not defined in this environment. This is likely an error`)
    }
    return process.env[parameter]
  }
}
