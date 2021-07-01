import {commonConfig} from './common.configuration'
import {devConfig} from './dev.configuration'
import {infraDevConfig} from './infradev.configuration'
import {preprodConfig} from './preprod.configuration'
import {prodConfig} from './prod.configuration'
import {localConfig} from './local.configuration'

export enum ProjectEnv {
  Prod = 'opn-platform-ca-prod',
  PreProd = 'opn-platform-preprod',
  Dev = 'opn-platform-dev',
  InfraDev = 'opn-platform-infra-dev',
  Local = 'opn-platform-local',
}

/**
 * Get public env specific configuration
 */
export const envConfig = (): Record<string, string | string[] | number | boolean> => {
  const env = process.env.GOOGLE_CLOUD_PROJECT

  switch (env) {
    case ProjectEnv.Prod:
      return {...commonConfig, ...prodConfig}
    case ProjectEnv.PreProd:
      return {...commonConfig, ...preprodConfig}
    case ProjectEnv.Dev:
      return {...commonConfig, ...devConfig}
    case ProjectEnv.InfraDev:
      return {...commonConfig, ...infraDevConfig}
    default:
      return {...commonConfig, ...localConfig}
  }
}
