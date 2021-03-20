import Joi from 'joi'

export default Joi.object({
  registrationId: Joi.string().allow(null),
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  dateOfBirth: Joi.string(),
  base64Photo: Joi.string().allow(''),
  organizationIds: Joi.array(),
  email: Joi.string(),
  admin: Joi.object().allow(null),
  authUserId: Joi.string().allow(null),
  delegates: Joi.array().allow(null),
  agreeToConductFHHealthAssessment: Joi.boolean().required(),
  shareTestResultWithEmployer: Joi.boolean().required(),
  readTermsAndConditions: Joi.boolean().required(),
  receiveResultsViaEmail: Joi.boolean().required(),
  receiveNotificationsFromGov: Joi.boolean().required(),
})
