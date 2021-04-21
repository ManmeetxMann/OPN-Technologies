import * as Joi from 'joi'

export default Joi.object({
  pulse: Joi.number().required(),
  oxygen: Joi.number().required(),
  organizationId: Joi.string().required(),
  locationId: Joi.string().required(),
  userId: Joi.string().required(),
  status: Joi.string().valid('Failed', 'Passed'),
})
