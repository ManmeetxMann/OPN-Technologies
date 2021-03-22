// Load config first
import {Config} from '../utils/config'
Config.load()

import express, {Application, RequestHandler} from 'express'
import * as OpenApiValidator from 'express-openapi-validator'
import cors from 'cors'

import {handleErrors, handleValidationErrors, handleRouteNotFound} from '../middlewares/error'
import {middlewareGenerator} from '../middlewares/basic-auth'
import IRouteController from '../interfaces/IRouteController.interface'

interface Initializer {
  initialize: () => Promise<unknown>
}

class App {
  public app: Application
  public port: number
  public validation: boolean
  public corsOptions?: string
  public initializers: Initializer[]
  public securityOptions: string
  constructor(appInit: {
    validation: boolean
    corsOptions?: string
    port: number
    middleWares: RequestHandler[]
    controllers: IRouteController[]
    initializers?: Initializer[]
    securityOptions?: string
  }) {
    this.app = express()
    this.port = appInit.port
    this.validation = appInit.validation
    this.corsOptions = appInit.corsOptions
    this.securityOptions = appInit.securityOptions || null
    this.initializers = appInit.initializers || []

    this.security()
    this.setupCors()
    this.middlewares(appInit.middleWares)
    const promise = this.validation
      ? this.setupValidation().then(() => this.setupValidationErrorHandling())
      : Promise.resolve()
    promise.then(() => {
      this.routes(appInit.controllers)
      this.setupErrorHandling()
    })
    // this.assets()
    // this.template()
  }

  private security() {
    if (!!this.securityOptions) {
      console.log('security on!')
      this.app.use(middlewareGenerator(this.securityOptions))
    }
  }

  private middlewares(middleWares: RequestHandler[]) {
    middleWares.forEach((middleWare) => {
      this.app.use(middleWare)
    })
  }

  public initialize(): void {
    console.log('running init', this.initializers)
    this.initializers.forEach((initializer) => initializer.initialize())
  }

  private routes(controllers: IRouteController[]) {
    // Handle all registered ones
    controllers.forEach((controller) => {
      this.app.use('/', controller.router)
    })

    // At the end of all registered routes, append one for 404 errors
    this.app.use(handleRouteNotFound)
  }

  private async setupValidation(): Promise<void> {
    this.app.use(
      OpenApiValidator.middleware({
        apiSpec: 'openapi.yaml',
        validateRequests: true,
        validateResponses: Config.get('FEATURE_VALIDATE_RESPONSES') === 'enabled',
      }),
    )
  }

  // this needs to run before routes
  private setupValidationErrorHandling() {
    this.app.use(handleValidationErrors)
  }

  // this needs to run after routes
  private setupErrorHandling() {
    this.app.use(handleErrors)
  }

  private setupCors() {
    if (!!this.corsOptions) {
      this.app.use(cors({origin: this.corsOptions, allowedHeaders: this.corsOptions}))
    }
  }

  // private assets()
  // {
  //     this.app.use(express.static('public'))
  //     this.app.use(express.static('views'))
  // }

  // private template()
  // {
  //     this.app.set('view engine', 'pug')
  // }

  public listen(): void {
    this.app.listen(this.port, () => {
      console.log(`App listening on the http://localhost:${this.port}`)
    })
  }
}

export default App
