import express from 'express'
import { Application } from 'express'
import { errorMiddleware, error404Middleware } from "../middlewares/error"

class App 
{
    public app: Application
    public port: number

    constructor(appInit: { port: number; middleWares: any; controllers: any; }) 
    {
        this.app = express()
        this.port = appInit.port

        this.middlewares(appInit.middleWares)
        this.routes(appInit.controllers)
        this.errorHandling()
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

        // At the end append one for pages not found
        this.app.use(error404Middleware)
    }

    private errorHandling()
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