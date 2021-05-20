import {Injectable, NestMiddleware} from '@nestjs/common'
import {corsDomains} from '@opn-services/common/configuration/cors.configuration'
import {OpnConfigService} from '@opn-services/common/services'

@Injectable()
export class CorsMiddleware implements NestMiddleware {
  constructor(private configService: OpnConfigService) {}
  /* eslint-disable  @typescript-eslint/explicit-module-boundary-types */
  use(req, res, next) {
    const requestOrigin = req.headers['origin']
    if (typeof requestOrigin === 'string' && corsDomains.includes(requestOrigin)) {
      res.setHeader('Access-Control-Allow-Origin', requestOrigin)
      res.setHeader(
        'Access-Control-Allow-Headers',
        'content-type,authorization,captcha-token,opn-app-version,opn-device-id,opn-lang,opn-request-id,opn-source',
      )
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE')
    }

    if (req.method == 'OPTIONS' && corsDomains.includes(requestOrigin)) {
      return res.end('ok')
    }

    // Allow Swagger
    if ((req.originalUrl as string).startsWith('/api/doc/')) {
      const userPass = new Buffer(
        (req.headers.authorization || '').split(' ')[1] || '',
        'base64',
      ).toString()

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
