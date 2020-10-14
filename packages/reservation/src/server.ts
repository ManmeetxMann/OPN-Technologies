import App from '../../common/src/express/app'

import * as bodyParser from 'body-parser'
import {Config} from '../../common/src/utils/config'
import loggerMiddleware from '../../common/src/middlewares/logger'

import AdminController from './controllers/admin.controller'
import PortalController from './controllers/portal.controller'
import {IdentifiersModel} from '../../common/src/data/identifiers'
import DataStore from '../../common/src/data/datastore'
import exphbs from 'express-handlebars'

const PORT = Number(process.env.PORT) || 5008

const app = new App({
  port: PORT,
  validation: true,
  securityOptions: Config.get('RESERVATION_PASSWORD'),
  corsOptions: '*',
  controllers: [new AdminController(), new PortalController()],
  middleWares: [bodyParser.json(), bodyParser.urlencoded({extended: true}), loggerMiddleware],
  initializers: [new IdentifiersModel(new DataStore())],
})

//Attach handlebar only for Reservation Server
app.app.engine('handlebars', exphbs())
app.app.set('view engine', 'handlebars')

app.listen()

export const init = (): void => app.initialize()
