// Load config first
import {Config} from '../utils/config'
Config.load()

import express, {Application, RequestHandler} from 'express'
import {OpenApiValidator} from 'express-openapi-validator'
import cors from 'cors'
import * as traceClient from '@google-cloud/trace-agent'

import {NodeEnV} from '../utils/app-engine-environment'
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

    this.setupAppEngine()

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

  private setupAppEngine(){
    //import * as debugClient from '@google-cloud/debug-agent'
    //debugClient.start({allowExpressions: true})
    if (NodeEnV() === 'production') {
      traceClient.start({
        samplingRate: 5, // sample 5 traces per second, or at most 1 every 200 milliseconds.
        ignoreUrls: [/^\/ignore-me/],
        ignoreMethods: ['options'], // ignore requests with OPTIONS method (case-insensitive).
      })
    }
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

  private setupValidation(): Promise<unknown> {
    const validator = new OpenApiValidator({
      apiSpec: 'openapi.yaml',
      validateRequests: true,
      validateResponses: Config.get('FEATURE_VALIDATE_RESPONSES') === 'enabled',
    })
    return validator.install(this.app)
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
