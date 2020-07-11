import swaggerJSDoc from "swagger-jsdoc"
import swaggerUi from "swagger-ui-express"

export interface SwaggerInfo {
    title: string
    version: string
    description: string
}

export interface SwaggerServer {
    url: string
    description: string
}

export class SwaggerService {
    private openApiVersion: string
    private info: SwaggerInfo
    private servers: SwaggerServer[]
    private yamlPath: string

    private swaggerSpec: any

    constructor(init: {openApiVersion: string, info: SwaggerInfo, servers: SwaggerServer[], yamlPath: string}) {
        // Initialize
        this.openApiVersion = init.openApiVersion
        this.info = init.info
        this.servers = init.servers
        this.yamlPath = this.yamlPath

        // Swagger definition
        const swaggerDefinition = {
            openapi: this.openApiVersion,
            info: this.info,
            servers: this.servers
        }

        // Options for the swagger docs
        const options = {
            swaggerDefinition,
            apis: [this.yamlPath],
            explorer: true
        }

        // initialize swagger-jsdoc
        this.swaggerSpec = swaggerJSDoc(options)
    }

    serve() : any {
        return swaggerUi.serve
    }

    setup() : any {
        return swaggerUi.setup(this.swaggerSpec)
    }
}