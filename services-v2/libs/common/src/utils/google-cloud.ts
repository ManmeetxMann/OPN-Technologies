// eslint-disable-next-line no-restricted-imports
import {ConfigService} from '@nestjs/config'
import {OpnConfigService} from '@opn-services/common/services'
import {ProjectEnv} from '@opn-common-v1/env-config'

const baseConfigService = new ConfigService()
const configService = new OpnConfigService(baseConfigService)

export const isRunningOnGCP = (): boolean => {
  const isRunningOnGCP = Boolean(configService.get('GOOGLE_CLOUD_PROJECT'))
  return isRunningOnGCP
}

export const NodeEnv = (): string => configService.get('NODE_ENV')

//Only avaiable on Google App ENgine
export const GAEService = (): string => configService.get('GAE_SERVICE') ?? 'local'

//Only avaiable on Google App ENgine
export const GAEProjectID = (): string => configService.get('GOOGLE_CLOUD_PROJECT') ?? 'local'

export const isProdOrPreprod = (): boolean =>
  [ProjectEnv.Prod, ProjectEnv.PreProd].includes(GAEProjectID() as ProjectEnv)
