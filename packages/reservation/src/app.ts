import * as bodyParser from 'body-parser'

import App from '../../common/src/express/app'
import loggerMiddleware from '../../common/src/middlewares/logger'

import AdminPCRTestResultController from './controllers/v1/admin/pcr-test-results.controller'
import ProcessPCRResultController from './controllers/v1/internal/process-pcr-test-result.controller'
import AdminPackageController from './controllers/v1/admin/package.controller'
import AdminAppointmentControllerV1 from './controllers/v1/admin/appointment.controller'
import AdminTestRunsController from './controllers/v1/admin/test-runs.controller'
import AdminTransportRunsController from './controllers/v1/admin/transport-runs.controller'
import AdminAppointmentControllerV2 from './controllers/v2/admin/appointment.controller'
import AppointmentWebhookController from './controllers/v1/acuity_webhook/appoinments.controller'
import BookingLocationController from './controllers/v1/booking-locations.controller'
import AppointmentAvailabilityController from './controllers/v1/appointment-availability.controller'
import AppointmentController from './controllers/v1/appointment.controller'
import TestResultsController from './controllers/v1/test-results.controller'
import AdminTemperatureV1Controller from './controllers/v1/admin/temperature.controller'
import AdminLabController from './controllers/v1/admin/lab.controller'
import TemperatureController from './controllers/v1/temperature.controller'
import AdminHistoryController from './controllers/v1/admin/admin-scan-history.controller'
import AdminRapidAntigenTestTesultsController from './controllers/v1/admin/rapid-antigen-test-results.controller'
import AdminAppointmentAvailabilityController from './controllers/v1/admin/appointment-availability.controller'
import PulseOxygenController from './controllers/v1/pulse-oxygen.controller'

import InternalRapidAntigenResultEmailSendController from './controllers/v1/internal/rapid-antigen-send-result-email.controller'
import AdminClinicController from './controllers/v1/admin/clinic.controller'
import AdminTestKitBatchController from './controllers/v1/admin/test-kit-batch.controller'
import AppointmentToTestTypeAssociationController from './controllers/v1/admin/appointment-to-test-type-association.controller'
import InternalSendAppointmentPushController from './controllers/v1/internal/send-appointment-push.controller'

const PORT = Number(process.env.PORT) || 5008

export const app = new App({
  port: PORT,
  validation: true,
  corsOptions: '*',
  controllers: [
    new AdminPackageController(),
    new AdminAppointmentControllerV1(),
    new AdminTransportRunsController(),
    new AppointmentWebhookController(),
    new AdminTestRunsController(),
    new ProcessPCRResultController(),
    new AdminPCRTestResultController(),
    new AdminAppointmentControllerV2(),
    new AppointmentController(),
    new BookingLocationController(),
    new AppointmentAvailabilityController(),
    new AdminTemperatureV1Controller(),
    new AdminLabController(),
    new AdminClinicController(),
    new AdminHistoryController(),
    new AdminRapidAntigenTestTesultsController(),
    new AppointmentController(),
    new InternalRapidAntigenResultEmailSendController(),
    new TestResultsController(),
    new TemperatureController(),
    new AdminAppointmentAvailabilityController(),
    new AdminTestKitBatchController(),
    new AppointmentToTestTypeAssociationController(),
    new PulseOxygenController(),
    new InternalSendAppointmentPushController()
  ],
  middleWares: [bodyParser.json(), bodyParser.urlencoded({extended: true}), loggerMiddleware],
})
