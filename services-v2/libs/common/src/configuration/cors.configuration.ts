import {CorsOptions} from '@nestjs/common/interfaces/external/cors-options.interface'
import {ConfigService} from '@nestjs/config'
import {isRunningOnGCP} from '../utils'

const configService = new ConfigService()

const allowedOrigins = [
  configService.get('DASHBOARD_DEV'),
  configService.get('DASHBOARD_PREPROD'),
  configService.get('DASHBOARD_PROD'),
]

export const corsOptions: CorsOptions = {
  origin: isRunningOnGCP() ? allowedOrigins : '*',
}
