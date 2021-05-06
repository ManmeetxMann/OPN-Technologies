import * as Joi from 'joi'

export default Joi.object({
  id: Joi.string(),
  price: Joi.string().required(),
  name: Joi.string().required(),
})
