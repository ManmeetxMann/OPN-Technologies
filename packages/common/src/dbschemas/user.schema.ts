import { UserCreator } from '../data/user-status'
import * as Joi from 'joi'

export default Joi.object({
  registrationId: Joi.string().allow(null, ''),
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  dateOfBirth: Joi.string(),
  isEmailVerified: Joi.boolean(),
  base64Photo: Joi.string().allow(''),
  organizationIds: Joi.array(),
  email: Joi.string().allow(null),
  phoneNumber: Joi.string().allow(null),
  admin: Joi.object().allow(null),
  authUserId: Joi.string().allow(null),
  delegates: Joi.array().allow(null),
  agreeToConductFHHealthAssessment: Joi.boolean(),
  shareTestResultWithEmployer: Joi.boolean(),
  readTermsAndConditions: Joi.boolean(),
  receiveResultsViaEmail: Joi.boolean(),
  receiveNotificationsFromGov: Joi.boolean(),
  status: Joi.string(),
  creator: Joi.string().valid(...Object.values(UserCreator)),
})
