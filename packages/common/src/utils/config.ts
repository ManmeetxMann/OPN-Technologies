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
    return process.env[parameter]
  }
}
