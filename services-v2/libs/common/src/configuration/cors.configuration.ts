import {CorsOptions} from '@nestjs/common/interfaces/external/cors-options.interface'
import {ConfigService} from '@nestjs/config'
import {OpnConfigService} from '@opn-services/common/services'
import {isRunningOnGCP} from '../utils'

const baseConfigService = new ConfigService()
const configService = new OpnConfigService(baseConfigService)

const allowedOrigins = [configService.get('DASHBOARD_URL')]

export const corsOptions: CorsOptions = {
  origin: isRunningOnGCP() ? allowedOrigins : '*',
}
