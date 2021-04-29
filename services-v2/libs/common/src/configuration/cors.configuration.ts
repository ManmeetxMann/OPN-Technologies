import {CorsOptions} from '@nestjs/common/interfaces/external/cors-options.interface'
import {ConfigService} from '@nestjs/config'

const configService = new ConfigService()

const allowedOrigins = [configService.get('DASHBOARD_URL')]

export const corsOptions: CorsOptions = {
  origin: allowedOrigins,
}
