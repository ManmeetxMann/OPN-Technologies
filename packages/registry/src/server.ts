import App from '../../common/src/express/app'

import * as bodyParser from 'body-parser'
import loggerMiddleware from '../../common/src/middlewares/logger'

import UserController from './controllers/v1/user.controller'
import RootController from './controllers/v1/root.controller'
import UserV2Controller from './controllers/v2/user.controller'

const PORT = Number(process.env.PORT) || 5006

export const app = new App({
  port: PORT,
  validation: true,
  corsOptions: '*',
  controllers: [new RootController(), new UserController(), new UserV2Controller()],
  middleWares: [bodyParser.json(), bodyParser.urlencoded({extended: true}), loggerMiddleware],
})

app.listen()

export const init = (): void => app.initialize()
