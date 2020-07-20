import {Request, Response, Router, RequestHandler} from 'express'
import swaggerJSDoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'

export interface SwaggerInfo {
  title: string
  version: string
  description: string
}

export interface SwaggerServer {
  url: string
  description: string
}

export class SwaggerService {
  private readonly yamlRootPath = './docs/'

  private openApiVersion: string
  private info: SwaggerInfo
  private servers: SwaggerServer[]
  private yamlPath: string

  // per library, correct type is 'object'
  private swaggerSpec: unknown

  constructor(init: {
    openApiVersion: string
    info: SwaggerInfo
    servers: SwaggerServer[]
    yamlPath: string
  }) {
    // Initialize
    this.openApiVersion = init.openApiVersion
    this.info = init.info
    this.servers = init.servers
    this.yamlPath = init.yamlPath

    // // Swagger definition
    const swaggerDefinition = {
      openapi: this.openApiVersion,
      info: this.info,
      servers: this.servers,
    }

    // Options for the swagger docs
    const options = {
      swaggerDefinition,
      apis: [`${this.yamlRootPath}${this.yamlPath}`],
      explorer: true,
    }

    // initialize swagger-jsdoc
    this.swaggerSpec = swaggerJSDoc(options)
  }

  serve(): RequestHandler[] {
    return swaggerUi.serve
  }

  setup(): RequestHandler {
    return swaggerUi.setup(this.swaggerSpec)
  }

  title(): string {
    return this.info.title
  }

  path(): string {
    return this.yamlPath.replace('.yaml', '')
  }
}

export class SwaggerServiceFactory {
  private services: SwaggerService[]
  private router: Router

  constructor(init: {services: SwaggerService[]; router: Router}) {
    this.services = init.services
    this.router = init.router
  }

  setupRoutes(): void {
    const prefix = '/docs/'

    // Setup index
    this.router.get('/', (req: Request, res: Response) => {
      res.setHeader('Content-Type', 'text/html')
      res.write('<html><body><h1>Services<h1/><ul>')
      for (const service of this.services) {
        res.write(`<li><a href="${prefix}${service.path()}">${service.title()}</a></li>`)
      }
      res.write('</ul></body></html>')
      res.end()
    })

    // Setup services
    for (const service of this.services) {
      console.log(`${prefix}${service.path()}`)
      this.router.use(`${prefix}${service.path()}`, service.serve(), service.setup())
    }
  }
}
