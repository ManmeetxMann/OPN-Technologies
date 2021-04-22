import * as Joi from 'joi'

export default Joi.object({
  name: Joi.string().required(),
  address: Joi.string().required(),
  acuityUser: Joi.string().required(),
  acuityPass: Joi.string().required(),
})
