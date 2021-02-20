import App from '../../common/src/express/app'
// import App from '@opn/common/src/express/app'

import * as bodyParser from 'body-parser'
import loggerMiddleware from '../../common/src/middlewares/logger'

import UserController from './controllers/user.controller'
import ContentController from './controllers/v1/content.controller'

const PORT = Number(process.env.PORT) || 5001

const app = new App({
  port: PORT,
  validation: false,
  corsOptions: '*',
  controllers: [new UserController(), new ContentController()],
  middleWares: [bodyParser.json(), bodyParser.urlencoded({extended: true}), loggerMiddleware],
})

app.listen()

export const init = (): void => app.initialize()
