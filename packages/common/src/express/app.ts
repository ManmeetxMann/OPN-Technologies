import express from 'express'
import {Application, RequestHandler} from 'express'
import {OpenApiValidator} from 'express-openapi-validate'
import cors from 'cors'
import jsYaml from 'js-yaml'
import fs from 'fs'

import {handleHttpException, handleRouteNotFound, handleValidationError} from '../middlewares/error'
import IRouteController from 'interfaces/IRouteController.interface'

class App {
  public app: Application
  public port: number
  public validation: boolean
  public corsOptions?: string

  constructor(appInit: {
    validation: boolean
    corsOptions?: string
    port: number
    middleWares: RequestHandler[]
    controllers: IRouteController[]
  }) {
    this.app = express()
    this.port = appInit.port
    this.validation = appInit.validation
    this.corsOptions = appInit.corsOptions

    this.setupCors()
    this.middlewares(appInit.middleWares)
    this.setupValidation()
    this.routes(appInit.controllers)
    this.setupErrorHandling()
    // this.assets()
    // this.template()
  }

  private middlewares(middleWares: RequestHandler[]) {
    middleWares.forEach((middleWare) => {
      this.app.use(middleWare)
    })
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
    this.app.use(handleValidationError)
    this.app.use(handleHttpException)
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
