import {ConfigService} from '@nestjs/config'

const configService = new ConfigService()

export const isRunningOnGCP = (): boolean => {
  const isRunningOnGCP = Boolean(configService.get('GOOGLE_CLOUD_PROJECT'))
  return isRunningOnGCP
}
