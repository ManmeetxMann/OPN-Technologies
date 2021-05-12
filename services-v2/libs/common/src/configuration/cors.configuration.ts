import {CorsOptions} from '@nestjs/common/interfaces/external/cors-options.interface'
import {envConfig} from '@opn-common-v1/env-config'

/**
 * Should use v1 config module since v2 is not initiated before all server launch
 */
const config = envConfig()
const corsDomains = config['CORS_DOMAINS'] as string[]

if (corsDomains.length === 0) {
  console.error('No CORS domains defined')
}

/**
 * TODO:
 * 1. Different domains per service
 */
export const corsOptions: CorsOptions = {
  origin: corsDomains,
}
