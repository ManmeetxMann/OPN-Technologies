import Joi from 'joi'
import {FirestoreTimestamp} from '../../../common/src/utils/joi-extensions'

export default Joi.object({
  acuityAppointmentId: Joi.number().required(),
  appointmentStatus: Joi.string().valid(
    'Pending',
    'Submitted',
    'InTransit',
    'Received',
    'InProgress',
    'Reported',
    'ReRunRequired',
    'ReCollectRequired',
    'Canceled',
  ),
  barCode: Joi.string().required(),
  canceled: Joi.boolean().required(),
  dateOfAppointment: Joi.string().required(),
  dateOfBirth: Joi.string().required(),
  dateTime: FirestoreTimestamp.isValid(),
  deadline: FirestoreTimestamp.isValid(),
  email: Joi.string().required(),
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  location: Joi.string().allow(''),
  organizationId: Joi.string().allow(null),
  packageCode: Joi.string().allow(null),
  phone: Joi.number().required(),
  registeredNursePractitioner: Joi.string().allow(''),
  // latestResult: ResultTypes
  latestResult: Joi.string().valid(
    'Positive',
    'Negative',
    'Pending',
    'Invalid',
    'Inconclusive',
    'ReCollectRequested',
  ),
  timeOfAppointment: Joi.string().required(),
  transportRunId: Joi.string().allow(''),
  appointmentTypeID: Joi.number().required(),
  calendarID: Joi.number().required(),
  vialLocation: Joi.string().allow(''),
  address: Joi.string().required(),
  addressUnit: Joi.string().allow(''),
  addressForTesting: Joi.string().allow(''),
  additionalAddressNotes: Joi.string().allow(''),
  couponCode: Joi.string().allow(''),
  travelID: Joi.string().allow(''),
  travelIDIssuingCountry: Joi.string().allow(''),
  ohipCard: Joi.string().allow(''),
  swabMethod: Joi.string().allow(''),
  shareTestResultWithEmployer: Joi.boolean().required(),
  readTermsAndConditions: Joi.boolean().required(),
  receiveResultsViaEmail: Joi.boolean().required(),
  receiveNotificationsFromGov: Joi.boolean().required(),
  userId: Joi.string().allow(''),
})