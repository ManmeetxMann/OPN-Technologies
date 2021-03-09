import * as express from 'express'

import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
import {SwaggerServiceFactory, SwaggerService} from '../service/swagger-service'

class RootController implements IControllerBase {
  public path = '/'
  public router = express.Router()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    // Swagger definition
    const factory = new SwaggerServiceFactory({
      services: [
        new SwaggerService({
          openApiVersion: '3.0.1',
          info: {
            title: 'Config API',
            version: '1.0.0',
            description: 'OPN API docs using Open API / Swagger',
          },
          servers: [
            {
              url: 'http://localhost:5001',
              description: 'Development Server',
            },
            {
              url: 'https://config-dot-opn-platform-dev.nn.r.appspot.com',
              description: 'Dev Server',
            },
            {
              url: 'https://config-dot-opn-platform-preprod.nn.r.appspot.com',
              description: 'PreProd Server',
            },
            {
              url: 'https://config.services.ca.stayopn.net',
              description: 'Production Server',
            },
          ],
          yamlPath: 'config.yaml',
        }),
        new SwaggerService({
          openApiVersion: '3.0.1',
          info: {
            title: 'Registry API',
            version: '1.0.0',
            description: 'OPN API docs using Open API / Swagger',
          },
          servers: [
            {
              url: 'http://localhost:5006',
              description: 'Development Server',
            },
            {
              url: 'https://registry-dot-opn-platform-dev.nn.r.appspot.com',
              description: 'Dev Server',
            },
            {
              url: 'https://registry-dot-opn-platform-preprod.nn.r.appspot.com',
              description: 'PreProd Server',
            },
            {
              url: 'https://registry.services.ca.stayopn.net',
              description: 'Production Server',
            },
          ],
          yamlPath: 'registry.yaml',
        }),
        new SwaggerService({
          openApiVersion: '3.0.1',
          info: {
            title: 'Enterprise API',
            version: '1.0.0',
            description: 'OPN API docs using Open API / Swagger',
          },
          servers: [
            {
              url: 'http://localhost:5003',
              description: 'Development Server',
            },
            {
              url: 'https://enterprise-dot-opn-platform-dev.nn.r.appspot.com',
              description: 'Dev Server',
            },
            {
              url: 'https://enterprise-dot-opn-platform-preprod.nn.r.appspot.com',
              description: 'PreProd Server',
            },
            {
              url: 'https://enterprise.services.ca.stayopn.net',
              description: 'Production Server',
            },
          ],
          yamlPath: 'enterprise.yaml',
        }),
        new SwaggerService({
          openApiVersion: '3.0.1',
          info: {
            title: 'Passport API',
            version: '1.0.0',
            description: 'OPN API docs using Open API / Swagger',
          },
          servers: [
            {
              url: 'http://localhost:5005',
              description: 'Development Server',
            },
            {
              url: 'https://passport-dot-opn-platform-dev.nn.r.appspot.com',
              description: 'Dev Server',
            },
            {
              url: 'https://passport-dot-opn-platform-preprod.nn.r.appspot.com',
              description: 'PreProd Server',
            },
            {
              url: 'https://passport.services.ca.stayopn.net',
              description: 'Production Server',
            },
          ],
          yamlPath: 'passport.yaml',
        }),
        new SwaggerService({
          openApiVersion: '3.0.1',
          info: {
            title: 'Reservation API',
            version: '1.0.0',
            description: 'OPN API docs using Open API / Swagger',
          },
          servers: [
            {
              url: 'http://localhost:5008',
              description: 'Development Server',
            },
            {
              url: 'https://reservation-dot-opn-platform-dev.nn.r.appspot.com',
              description: 'Dev Server',
            },
            {
              url: 'https://reservation-dot-opn-platform-preprod.nn.r.appspot.com',
              description: 'Preprod Server',
            },
            {
              url: 'https://reservation.services.ca.stayopn.net',
              description: 'Production Server',
            },
          ],
          yamlPath: 'reservation.yaml',
        }),
        new SwaggerService({
          openApiVersion: '3.0.1',
          info: {
            title: 'Lookup API',
            version: '1.0.0',
            description: 'OPN API docs using Open API / Swagger',
          },
          servers: [
            {
              url: 'http://localhost:5004',
              description: 'Development Server',
            },
            {
              url: 'https://lookup-dot-opn-platform-dev.nn.r.appspot.com',
              description: 'Dev Server',
            },
            {
              url: 'https://lookup-dot-opn-platform-preprod.nn.r.appspot.com',
              description: 'Dev Server',
            },
            {
              url: 'https://lookup.services.ca.stayopn.net',
              description: 'Production Server',
            },
          ],
          yamlPath: 'lookup.yaml',
        }),
        new SwaggerService({
          openApiVersion: '3.0.1',
          info: {
            title: 'Access API',
            version: '1.0.0',
            description: 'OPN API docs using Open API / Swagger',
          },
          servers: [
            {
              url: 'http://localhost:5002',
              description: 'Development Server',
            },
            {
              url: 'https://access-dot-opn-platform-dev.nn.r.appspot.com',
              description: 'Dev Server',
            },
            {
              url: 'https://access-dot-opn-platform-preprod.nn.r.appspot.com',
              description: 'Preprod Server',
            },
            {
              url: 'https://access.services.ca.stayopn.net',
              description: 'Production Server',
            },
          ],
          yamlPath: 'access.yaml',
        }),
      ],
      router: this.router,
    })
    factory.setupRoutes()
  }
}

export default RootController
