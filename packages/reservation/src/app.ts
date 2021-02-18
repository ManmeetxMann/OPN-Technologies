import * as bodyParser from 'body-parser'

import App from '../../common/src/express/app'
import loggerMiddleware from '../../common/src/middlewares/logger'

import AdminController from './controllers/admin.controller'
import PortalController from './controllers/portal.controller'
import PCRTestResultAdminController from './controllers/v1/admin/pcr-test-results.controller'
import ProcessPCRResultController from './controllers/v1/internal/process-pcr-test-result.controller'
import WebhookController from './controllers/webhook.controller'
import TestResultController from './controllers/v1/admin/test-results.controller.ts'
import PackageController from './controllers/v1/admin/package.controller'
import AppointmentAdminControllerV1 from './controllers/v1/admin/appointment.controller'
import TestRunsController from './controllers/v1/admin/test-runs.controller'
import TransportRunsController from './controllers/v1/admin/transport-runs.controller'
import AppointmentControllerV2 from './controllers/v2/admin/appointment.controller'
import AppointmentWebhookController from './controllers/v1/acuity_webhook/appoinments.controller'
import BookingLocationController from './controllers/v1/booking-locations.controller'
import AppointmentAvailabilityController from './controllers/v1/appointment-availability.controller'
import AppointmentController from './controllers/v1/appointment.controller'
import PCRTestResultController from './controllers/v1/test-results.controller'
import TemperatureV1Controller from './controllers/v1/admin/temperature.controller'

const PORT = Number(process.env.PORT) || 5008

export const app = new App({
  port: PORT,
  validation: true,
  corsOptions: '*',
  controllers: [
    new AdminController(),
    new PortalController(),
    new WebhookController(),
    new TestResultController(),
    new PackageController(),
    new AppointmentAdminControllerV1(),
    new TransportRunsController(),
    new AppointmentWebhookController(),
    new TestRunsController(),
    new ProcessPCRResultController(),
    new PCRTestResultAdminController(),
    new AppointmentControllerV2(),
    new AppointmentController(),
    new BookingLocationController(),
    new AppointmentAvailabilityController(),
    new AppointmentController(),
    new PCRTestResultController(),
    new TemperatureV1Controller(),
  ],
  middleWares: [bodyParser.json(), bodyParser.urlencoded({extended: true}), loggerMiddleware],
})
