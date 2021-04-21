import * as Joi from 'joi'

export default Joi.object({
  appointmentType: Joi.number().required(),
  testType: Joi.string().required().valid('PCR', 'RapidAntigen'),
})
