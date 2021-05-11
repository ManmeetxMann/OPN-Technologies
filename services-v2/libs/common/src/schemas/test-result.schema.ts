import * as Joi from 'joi'

export const pcrTestResultSchema = Joi.object({
  id: Joi.string(),
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  dateOfBirth: Joi.string().required(),
  postalCode: Joi.string().required(),
  homeKitId: Joi.string().required(),
  photoUrl: Joi.string().required(),
  testResult: Joi.string()
    .required()
    .valid('Positive', 'Negative', 'Invalid'),
  reportAs: Joi.string()
    .required()
    .valid('Individual', 'Family', 'PartOfATeam'),
})
