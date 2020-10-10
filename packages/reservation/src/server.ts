import App from '../../common/src/express/app'

import * as bodyParser from 'body-parser'
import loggerMiddleware from '../../common/src/middlewares/logger'

import AdminController from './controllers/admin.controller'
import {IdentifiersModel} from '../../common/src/data/identifiers'
import DataStore from '../../common/src/data/datastore'

const PORT = Number(process.env.PORT) || 5008

const app = new App({
  port: PORT,
  validation: true,
  corsOptions: '*',
  controllers: [new AdminController()],
  middleWares: [bodyParser.json(), bodyParser.urlencoded({extended: true}), loggerMiddleware],
  initializers: [new IdentifiersModel(new DataStore())],
})

app.listen()

export const init = (): void => app.initialize()
