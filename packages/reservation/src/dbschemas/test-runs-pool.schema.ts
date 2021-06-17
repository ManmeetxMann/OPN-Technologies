import * as Joi from 'joi'

export default Joi.object({
  appointmentIds: Joi.array().required(),
  testRunId: Joi.string().required(),
  well: Joi.string().required(),
})
