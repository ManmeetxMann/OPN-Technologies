import * as express from 'express'

import App from '../../common/src/express/app'

import * as bodyParser from 'body-parser'
import loggerMiddleware from '../../common/src/middlewares/logger'

import AdminController from './controllers/admin.controller'
import PortalController from './controllers/portal.controller'
import WebhookController from './controllers/webhook.controller'
import TestResultController from './controllers/v1/admin.test-results.controller.ts'
import PackageController from './controllers/v1/admin.package.controller'
import AppointmentController from './controllers/v1/admin.appointment.controller'
import TestRunsController from './controllers/v1/admin/test-runs.controller'

import {IdentifiersModel} from '../../common/src/data/identifiers'
import DataStore from '../../common/src/data/datastore'
import exphbs from 'express-handlebars'
import path from 'path'
import AppointmentWebhookController from './controllers/v1/acuity_webhook/appoinments.controller'

//import * as debugClient from '@google-cloud/debug-agent'
//debugClient.start({allowExpressions: true})

const PORT = Number(process.env.PORT) || 5008

const app = new App({
  port: PORT,
  validation: true,
  corsOptions: '*',
  controllers: [
    new AdminController(),
    new PortalController(),
    new WebhookController(),
    new TestResultController(),
    new PackageController(),
    new AppointmentController(),
    new AppointmentWebhookController(),
    new TestRunsController(),
  ],
  middleWares: [bodyParser.json(), bodyParser.urlencoded({extended: true}), loggerMiddleware],
  initializers: [new IdentifiersModel(new DataStore())],
})

//Attach handlebar only for Reservation Server
app.app.engine('handlebars', exphbs())
app.app.set('view engine', 'handlebars')
app.app.set('views', path.join(__dirname, 'views'))
app.app.use('/static', express.static(path.join(__dirname, 'static')))

app.listen()

export const init = (): void => app.initialize()
