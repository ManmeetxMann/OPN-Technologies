import express from 'express'
import { Application } from "express"
import { errorMiddleware, error404Middleware } from "../middlewares/error"

import { OpenApiValidator } from "express-openapi-validate"
import jsYaml from "js-yaml"
import fs from "fs"


class App 
{
    public app: Application
    public port: number

    constructor(appInit: { port: number; middleWares: any; controllers: any; }) 
    {
        this.app = express()
        this.port = appInit.port

        this.middlewares(appInit.middleWares)
        this.setupValidation()
        this.routes(appInit.controllers)
        this.setupErrorHandling()
        // this.assets()
        // this.template()
    }

    private middlewares(middleWares: { forEach: (arg0: (middleWare: any) => void) => void; }) 
    {
        middleWares.forEach(middleWare => 
        {
            this.app.use(middleWare)
        })
    }

    private routes(controllers: { forEach: (arg0: (controller: any) => void) => void; }) 
    {
        // Handle all registered ones
        controllers.forEach(controller => 
        {
            this.app.use('/', controller.router)
        })

        // At the end of all registered routes, append one for 404 errors
        this.app.use(error404Middleware)
    }

    private setupValidation()
    {
        const openApiDocument = jsYaml.safeLoad(
            fs.readFileSync("openapi.yaml", "utf-8"),
        );
        const validator = new OpenApiValidator(openApiDocument)
        this.app.use(validator.match())
    }

    private setupErrorHandling()
    {
        this.app.use(errorMiddleware)
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

    public listen() 
    {
        this.app.listen(this.port, () => 
        {
            console.log(`App listening on the http://localhost:${this.port}`)
        })
    }
}

export default App