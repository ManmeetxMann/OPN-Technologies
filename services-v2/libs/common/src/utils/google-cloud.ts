import {ConfigService} from '@nestjs/config'

const configService = new ConfigService()

export const isRunningOnGCP = (): boolean => {
  const isRunningOnGCP = Boolean(configService.get('GOOGLE_CLOUD_PROJECT'))
  return isRunningOnGCP
}

export const NodeEnv = (): string => process.env.NODE_ENV

//Only avaiable on Google App ENgine
export const GAEService = (): string => process.env.GAE_SERVICE ?? 'local'

//Only avaiable on Google App ENgine
export const GAEProjectID = (): string => process.env.GOOGLE_CLOUD_PROJECT ?? 'local'
