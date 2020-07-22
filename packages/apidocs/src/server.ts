import App from '../../common/src/express/app'

import * as bodyParser from 'body-parser'
import loggerMiddleware from '../../common/src/middlewares/logger'

import RootController from './controllers/root.controller'

const PORT = Number(process.env.PORT) || 5007

const app = new App({
  port: PORT,
  validation: false,
  controllers: [new RootController()],
  middleWares: [bodyParser.json(), bodyParser.urlencoded({extended: true}), loggerMiddleware],
  initializers: [],
})

app.listen()
