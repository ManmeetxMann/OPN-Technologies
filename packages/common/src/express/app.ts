// Load config first
import {Config} from '../utils/config'
Config.load()

// Continue...
import express, {Application, RequestHandler} from 'express'
import basicAuth from 'express-basic-auth'
import {OpenApiValidator} from 'express-openapi-validator'
import cors from 'cors'

import {handleErrors, handleValidationErrors, handleRouteNotFound} from '../middlewares/error'
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
    this.setupValidation().then(() => {
      this.setupValidationErrorHandling()
      this.routes(appInit.controllers)
      this.setupErrorHandling()
    })
    // this.assets()
    // this.template()
  }

  private security() {
    if (!!this.securityOptions) {
      console.log('security on!')
      this.app.use(basicAuth({users: {admin: this.securityOptions}, challenge: true}))
    }
  }

  private middlewares(middleWares: RequestHandler[]) {
    middleWares.forEach((middleWare) => {
      this.app.use(middleWare)
    })
  }

  public initialize(): void {
    console.log(this)
    // console.log(this.initializers)
    // console.log(this.port)
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

  private setupValidation(): Promise<unknown> {
    if (this.validation) {
      const validator = new OpenApiValidator({
        apiSpec: 'openapi.yaml',
        validateRequests: true,
        validateResponses: true, //Config.get('FEATURE_VALIDATE_RESPONSES') === 'enabled',
      })
      return validator.install(this.app)
    }
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
      this.app.use(cors({origin: this.corsOptions}))
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
