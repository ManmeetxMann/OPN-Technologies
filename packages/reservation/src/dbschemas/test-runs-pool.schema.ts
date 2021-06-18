import * as Joi from 'joi'

export default Joi.object({
  testResultIds: Joi.array().required(),
  testRunId: Joi.string().required(),
  well: Joi.string().required(),
  numberOfSamples: Joi.number().required(),
})
