import {Injectable, NestMiddleware} from '@nestjs/common'
import {OpnConfigService} from '@opn-services/common/services'

@Injectable()
export class SwaggerMiddleware implements NestMiddleware {
  constructor(private configService: OpnConfigService) {}
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  use(req, res, next) {
    if ((req.originalUrl as string).startsWith('/api/doc/')) {
      const userPass = new Buffer(
        (req.headers.authorization || '').split(' ')[1] || '',
        'base64',
      ).toString()

      console.log('userPass')

      const configUserPass = this.configService.get('APIDOCS_PASSWORD_V2')
      if (userPass != configUserPass) {
        res.writeHead(401, {'WWW-Authenticate': 'Basic realm="nope"'})
        res.end('HTTP Error 401 Unauthorized: Access is denied')
      }
      return next()
    }

    return next()
  }
}
