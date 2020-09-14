// Load config first
import {Config} from '../utils/config'
Config.load()

// Continue...
import express, {Application, RequestHandler} from 'express'
import basicAuth from 'express-basic-auth'
import {OpenApiValidator} from 'express-openapi-validate'
import cors from 'cors'
import jsYaml from 'js-yaml'
import fs from 'fs'

import {handleErrors, handleRouteNotFound} from '../middlewares/error'
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

    this.setupCors()
    // this.security()
    this.middlewares(appInit.middleWares)
    this.setupValidation()
    this.routes(appInit.controllers)
    this.setupErrorHandling()
    // this.assets()
    // this.template()
  }

  private security() {
    if (!!this.securityOptions) {
      console.log("security on!")
      this.app.use(basicAuth({users: {'admin' : this.securityOptions}, challenge: true}))
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

  private setupValidation() {
    if (this.validation) {
      const openApiDocument = jsYaml.safeLoad(fs.readFileSync('openapi.yaml', 'utf-8'))
      const validator = new OpenApiValidator(openApiDocument)
      this.app.use(validator.match())
    }
  }

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
