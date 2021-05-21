import * as Joi from 'joi'

export const acuityTypesSchema = Joi.object({
  id: Joi.string(),
  price: Joi.string().required(),
  name: Joi.string().required(),
})
