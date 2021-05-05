import {commonConfig} from './common.configuration'
import {devConfig} from './dev.configuration'
import {preprodConfig} from './preprod.configuration'
import {prodConfig} from './prod.configuration'

/**
 * Get public env specific configuration
 */
export const envConfig = (): Record<string, string | number | boolean> => {
  const env = process.env.GOOGLE_CLOUD_PROJECT

  switch (env) {
    case 'opn-platform-ca-prod':
      return {...commonConfig, ...prodConfig}
    case 'opn-platform-preprod':
      return {...commonConfig, ...preprodConfig}
    case 'opn-platform-local':
      return {...commonConfig, ...devConfig}
    default:
      return {...commonConfig, ...devConfig}
  }
}
