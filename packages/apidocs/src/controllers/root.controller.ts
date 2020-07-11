import * as express from 'express'
import { Request, Response } from 'express'

import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
import {SwaggerServiceFactory, SwaggerService} from '../service/swagger-service'

// import swaggerJSDoc from "swagger-jsdoc"
// import swaggerUi from "swagger-ui-express"


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
        // // Swagger definition
        // const swaggerDefinition = 
        // {
        //     openapi: '3.0.1',
        //     info: 
        //     {
        //         title: "OPN REST API Documentation",
        //         version: "1.0.0",
        //         description: "OPN API docs using Open API / Swagger",
        //     },
        //     servers: [
        //         {
        //             url: "https://registry-dot-opn-platform-dev.nn.r.appspot.com",
        //             description: "Production server"
        //         },
        //         {
        //             url: "http://localhost:5006",
        //             description: "Development server"
        //         }
        //     ]
        // };

        // // options for the swagger docs
        // const options = 
        // {
        //     // import swaggerDefinitions
        //     swaggerDefinition,
        //     // path to the API docs
        //     apis: ["./src/docs/openapi.yaml"],
        //     explorer: true
        // };
        // // initialize swagger-jsdoc
        // const swaggerSpec = swaggerJSDoc(options);

        // console.log(swaggerSpec)

        // // use swagger-Ui-express for your app documentation endpoint
        // this.router.use("/", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

        const factory = new SwaggerServiceFactory({
            services: [new SwaggerService({
                openApiVersion: "3.0.1",
                info: {
                    title: "Registry API",
                    version: "1.0.0",
                    description: "OPN API docs using Open API / Swagger"
                },
                servers: [
                    {
                        url: "https://registry-dot-opn-platform-dev.nn.r.appspot.com",
                        description: "Production server"
                    },
                    {
                        url: "http://localhost:5006",
                        description: "Development server"
                    }
                ],
                yamlPath: "registry.yaml"
            })],
            router: this.router
        })
        factory.setupRoutes()
    }
}

export default RootController