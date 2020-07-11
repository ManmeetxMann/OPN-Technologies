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
        // Swagger definition
        const factory = new SwaggerServiceFactory({
            services: [
                new SwaggerService({
                    openApiVersion: "3.0.1",
                    info: {
                        title: "Config API",
                        version: "1.0.0",
                        description: "OPN API docs using Open API / Swagger"
                    },
                    servers: [
                        {
                            url: "https://config-dot-opn-platform-dev.nn.r.appspot.com",
                            description: "Production Server"
                        },
                        {
                            url: "https://config-staging-dot-opn-platform-dev.nn.r.appspot.com",
                            description: "Staging Server"
                        },
                        {
                            url: "http://localhost:5001",
                            description: "Development Server"
                        }
                    ],
                    yamlPath: "config.yaml"
                }),
                new SwaggerService({
                    openApiVersion: "3.0.1",
                    info: {
                        title: "Registry API",
                        version: "1.0.0",
                        description: "OPN API docs using Open API / Swagger"
                    },
                    servers: [
                        {
                            url: "https://registry-dot-opn-platform-dev.nn.r.appspot.com",
                            description: "Production Server"
                        },
                        {
                            url: "https://registry-staging-dot-opn-platform-dev.nn.r.appspot.com",
                            description: "Staging Server"
                        },
                        {
                            url: "http://localhost:5006",
                            description: "Development Server"
                        }
                    ],
                    yamlPath: "registry.yaml"
                }),
                new SwaggerService({
                    openApiVersion: "3.0.1",
                    info: {
                        title: "Enterprise API",
                        version: "1.0.0",
                        description: "OPN API docs using Open API / Swagger"
                    },
                    servers: [
                        {
                            url: "https://enterprise-dot-opn-platform-dev.nn.r.appspot.com",
                            description: "Production Server"
                        },
                        {
                            url: "https://enterprise-staging-dot-opn-platform-dev.nn.r.appspot.com",
                            description: "Staging Server"
                        },
                        {
                            url: "http://localhost:5003",
                            description: "Development Server"
                        }
                    ],
                    yamlPath: "enterprise.yaml"
                })],
            router: this.router
        })
        factory.setupRoutes()
    }
}

export default RootController