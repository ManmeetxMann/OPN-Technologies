import App from '../../common/src/express/app'

import * as bodyParser from 'body-parser'
import loggerMiddleware from '../../common/src/middlewares/logger'

import InternalController from './controllers/internal.controller'
import AdminController from './controllers/admin.controller'
import UserController from './controllers/user.controller'
import RootController from './controllers/root.controller'
import OrganizationController from './controllers/organization.controller'

const PORT = Number(process.env.PORT) || 5003

const app = new App({
  port: PORT,
  validation: true,
  corsOptions: '*',
  controllers: [
    new RootController(),
    new UserController(),
    new AdminController(),
    new InternalController(),
    new OrganizationController(),
  ],
  middleWares: [bodyParser.json(), bodyParser.urlencoded({extended: true}), loggerMiddleware],
})

app.listen()

export const init = (): void => app.initialize()
