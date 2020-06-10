import App from './app'

import * as bodyParser from 'body-parser'
import loggerMiddleware from './middleware/logger'

import AdminController from './controllers/admin.controller'
import UserController from  './controllers/user.controller'
import RootController from  './controllers/root.controller'

const PORT = Number(process.env.PORT) || 5000;

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

// http://rousseau-alexandre.fr/en/programming/2019/06/19/express-typescript.html
// https://wanago.io/2018/12/03/typescript-express-tutorial-routing-controllers-middleware/
// https://www.tutorialsteacher.com/typescript