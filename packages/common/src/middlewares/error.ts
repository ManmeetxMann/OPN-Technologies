import { Request, Response, NextFunction } from "express"
import { HttpException } from "../exceptions/httpexception"


export const errorMiddleware = (error: HttpException, req: Request, resp: Response, next: NextFunction) => 
{
    console.log("Error!")
    console.error(error)

    const status = error.status || error["statusCode"] || 500
    const message = error.message || "Something went wrong"
    resp
        .status(status)
        .send({
            status,
            message
        })
}

export const error404Middleware = (req: Request, resp: Response, next: NextFunction) => // Cannot have a error... to be used bottom of stack
{
    const status = 404
    const message = "Not Found"
    resp
        .status(status)
        .send({
            status,
            message
        })
}