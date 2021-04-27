import {CorsOptions} from '@nestjs/common/interfaces/external/cors-options.interface'
import {ConfigService} from '@nestjs/config'
import {GAEProjectID} from '../utils'

const configService = new ConfigService()

const getOriginsByEnv = () => {
  const env = GAEProjectID()

  switch (env) {
    case 'ca-prod':
      return configService.get('DASHBOARD_URL')
    case 'preprod':
      return configService.get('DASHBOARD_URL')
    case 'local':
      return '*'
    default:
      // default config for dev/infra envs
      return '*'
  }
}

export const corsOptions: CorsOptions = {
  origin: getOriginsByEnv(),
}
