import * as Joi from 'joi'

export default Joi.object({
  resultId: Joi.string().required(),
  appointmentId: Joi.string().required(),
  reasons: Joi.array().required(),
  source: Joi.string().required().valid('transportRun', 'confirmatoryRequest'),
})
