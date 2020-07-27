// Load up environment vars
import dotenv from 'dotenv'
import path from 'path'
dotenv.config({path: path.resolve(__dirname, '../../.env')})


export const Config = (parameter: string) => {
    return process.env[parameter]
}