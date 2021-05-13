import {Injectable, NestMiddleware} from '@nestjs/common'
import {corsDomains} from '@opn-services/common/configuration/cors.configuration'

@Injectable()
export class CorsMiddleware implements NestMiddleware {
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

    return next()
  }
}
