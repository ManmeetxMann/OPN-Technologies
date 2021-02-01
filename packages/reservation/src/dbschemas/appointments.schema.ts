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
    'ReSampleRequired',
    'Canceled',
  ),
  barCode: Joi.string().required(),
  canceled: Joi.boolean().required(),
  dateOfAppointment: Joi.string().required(),
  dateOfBirth: Joi.string().required(),
  dateTime: Joi.string().required(),
  deadline: FirestoreTimestamp.isValid(),
  email: Joi.string().required(),
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  location: Joi.string(),
  organizationId: Joi.string(),
  packageCode: Joi.string(),
  phone: Joi.number().required(),
  registeredNursePractitioner: Joi.string(),
  // latestResult: ResultTypes
  latestResult: Joi.string().valid(
    'Positive',
    'Negative',
    'Pending',
    'Invalid',
    'Inconclusive',
    'ReSampleRequested',
  ),
  timeOfAppointment: Joi.string().required(),
  transportRunId: Joi.string(),
  appointmentTypeID: Joi.number().required(),
  calendarID: Joi.number().required(),
  vialLocation: Joi.string(),
  address: Joi.string().required(),
  addressUnit: Joi.string().required(),
  addressForTesting: Joi.string().required(),
  additionalAddressNotes: Joi.string().required(),
  couponCode: Joi.string(),
  travelID: Joi.string(),
  travelIDIssuingCountry: Joi.string(),
  ohipCard: Joi.string(),
  swabMethod: Joi.string(),
  shareTestResultWithEmployer: Joi.boolean().required(),
  readTermsAndConditions: Joi.boolean().required(),
  receiveResultsViaEmail: Joi.boolean().required(),
  receiveNotificationsFromGov: Joi.boolean().required(),
  userId: Joi.string(),
})
