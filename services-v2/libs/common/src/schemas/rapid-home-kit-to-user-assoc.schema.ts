import * as Joi from 'joi'

export default Joi.object({
  rapidHomeKitId: Joi.string().required(),
  userId: Joi.string().required(),
})
