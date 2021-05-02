import {Injectable} from '@nestjs/common'
import {ConfigService} from '@nestjs/config'

/**
 * Config service wrapper to log not exiting configuration variable
 */
@Injectable()
export class OpnConfigService {
  constructor(private configService: ConfigService) {}

  get<T = any>(propertyPath: string): T {
    const variable = this.configService.get<T>(propertyPath)
    if (!variable && !propertyPath.startsWith('FEATURE_') && !propertyPath.startsWith('DEBUG_')) {
      console.warn(`${propertyPath} is not defined in this environment. This is likely an error`)
    }
    return variable as T
  }
}
