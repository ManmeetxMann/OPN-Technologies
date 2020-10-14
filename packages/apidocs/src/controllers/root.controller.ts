import * as express from 'express'

import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
import {SwaggerServiceFactory, SwaggerService} from '../service/swagger-service'

// import swaggerJSDoc from "swagger-jsdoc"
// import swaggerUi from "swagger-ui-express"

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
              url: 'https://config.services.ca.stayopn.net',
              description: 'Production Server',
            },
            {
              url: 'https://config-staging-dot-opn-platform-dev.nn.r.appspot.com',
              description: 'Staging Server',
            },
            {
              url: 'http://localhost:5001',
              description: 'Development Server',
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
              url: 'https://registry.services.ca.stayopn.net',
              description: 'Production Server',
            },
            {
              url: 'https://registry-staging-dot-opn-platform-dev.nn.r.appspot.com',
              description: 'Staging Server',
            },
            {
              url: 'http://localhost:5006',
              description: 'Development Server',
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
              url: 'https://enterprise.services.ca.stayopn.net',
              description: 'Production Server',
            },
            {
              url: 'https://enterprise-staging-dot-opn-platform-dev.nn.r.appspot.com',
              description: 'Staging Server',
            },
            {
              url: 'http://localhost:5003',
              description: 'Development Server',
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
              url: 'https://passport.services.ca.stayopn.net',
              description: 'Production Server',
            },
            {
              url: 'https://passport-staging-dot-opn-platform-dev.nn.r.appspot.com',
              description: 'Staging Server',
            },
            {
              url: 'http://localhost:5005',
              description: 'Development Server',
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
              url: 'https://reservation-staging-dot-opn-platform-dev.nn.r.appspot.com',
              description: 'Staging Server',
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
              url: 'https://lookup.services.ca.stayopn.net',
              description: 'Production Server',
            },
            {
              url: 'https://lookup-staging-dot-opn-platform-dev.nn.r.appspot.com',
              description: 'Staging Server',
            },
            {
              url: 'http://localhost:5004',
              description: 'Development Server',
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
              url: 'https://access.services.ca.stayopn.net',
              description: 'Production Server',
            },
            {
              url: 'https://access-staging-dot-opn-platform-dev.nn.r.appspot.com',
              description: 'Staging Server',
            },
            {
              url: 'http://localhost:5002',
              description: 'Development Server',
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
