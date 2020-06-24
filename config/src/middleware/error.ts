import { Request, Response } from 'express'

class HttpException extends Error 
{
    status: number;
    message: string;
    constructor(status: number, message: string) 
    {
        super(message);
        this.status = status;
        this.message = message;
    }
}

const errorMiddleware = (error: HttpException, req: Request, resp: Response, next) => 
{    
    const status = error.status || 500;
    const message = error.message || 'Something went wrong';
    resp
        .status(status)
        .send({
            status,
            message,
        })
}

export default errorMiddleware
