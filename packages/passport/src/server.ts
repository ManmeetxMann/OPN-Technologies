import App from '../../common/src/express/app'

import * as bodyParser from 'body-parser'
import loggerMiddleware from '../../common/src/middlewares/logger'

import AdminController from './controllers/admin.controller'
import UserController from  './controllers/user.controller'
import RootController from  './controllers/root.controller'

const PORT = Number(process.env.PORT) || 5005;

const app = new App({
    port: PORT,
    controllers: [
        new RootController(),
        new UserController(),
        new AdminController()
    ],
    middleWares: [
        bodyParser.json(),
        bodyParser.urlencoded({ extended: true }),
        loggerMiddleware
    ]
})

app.listen()