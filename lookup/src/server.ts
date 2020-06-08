import App from './app'

import * as bodyParser from 'body-parser'
import loggerMiddleware from './middleware/logger'

import AdminController from './controllers/admin.controller'
import UserController from  './controllers/user.controller'
import RootController from  './controllers/root.controller'

const app = new App({
    port: 5000,
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