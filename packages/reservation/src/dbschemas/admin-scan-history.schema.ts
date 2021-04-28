import * as Joi from 'joi'

export default Joi.object({
  type: Joi.string().valid('PCR', 'RapidAntigen'),
  createdBy: Joi.string().required(),
  appointmentId: Joi.string().required(),
})
