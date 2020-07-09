import express from 'express'
import {Application} from 'express'
import {OpenApiValidator} from 'express-openapi-validate'
import cors from 'cors'
import jsYaml from 'js-yaml'
import fs from 'fs'

import {handleHttpException, handleRouteNotFound} from '../middlewares/error'


class App {
  public app: Application
  public port: number
  public validation: boolean
  public cors: boolean | string

  constructor(appInit: {validation: boolean; cors: boolean | string; port: number; middleWares: any; controllers: any}) {
    this.app = express()
    this.port = appInit.port
    this.validation = appInit.validation
    this.cors = cors

    this.setupCors()
    this.middlewares(appInit.middleWares)
    this.setupValidation()
    this.routes(appInit.controllers)
    this.setupErrorHandling()
    // this.assets()
    // this.template()
  }

  private middlewares(middleWares: {forEach: (arg0: (middleWare: any) => void) => void}) {
    middleWares.forEach((middleWare) => {
      this.app.use(middleWare)
    })
  }

  private routes(controllers: {forEach: (arg0: (controller: any) => void) => void}) {
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
    this.app.use(handleHttpException)
  }

  private setupCors() {
    if (typeof this.cors === 'string') {
        this.app.options(this.cors, cors())
    }
    else if (this.cors === true) {
        this.app.options("*", cors())
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

  public listen() {
    this.app.listen(this.port, () => {
      console.log(`App listening on the http://localhost:${this.port}`)
    })
  }
}

export default App
