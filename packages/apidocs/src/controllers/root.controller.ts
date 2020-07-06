import * as express from 'express'
import { Request, Response } from 'express'
import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'

import swaggerJSDoc from "swagger-jsdoc"
import swaggerUi from "swagger-ui-express"


class RootController implements IControllerBase 
{
    public path = "/"
    public router = express.Router()
    
    constructor() 
    {
        this.initRoutes()
    }

    public initRoutes() 
    {
        // Swagger definition
        const swaggerDefinition = 
        {
            swagger: '2.0',
            info: 
            {
                title: "OPN REST API Documentation",
                version: "1.0.0",
                description: "OPN API docs using Open API / Swagger",
            },
            host: "localhost:3000",
            basePath: "/api",
        };

        // options for the swagger docs
        const options = 
        {
            // import swaggerDefinitions
            swaggerDefinition,
            // path to the API docs
            apis: ["./docs/*.yaml"],
        };
        // initialize swagger-jsdoc
        const swaggerSpec = swaggerJSDoc(options);

        // use swagger-Ui-express for your app documentation endpoint
        this.router.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

        this.router.get("/", this.index)
    }

    index = (req: Request, res: Response) => 
    {
        res.send("API Docs here")
    }
}

export default RootController