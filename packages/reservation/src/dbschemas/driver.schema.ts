import * as Joi from 'joi'

export default Joi.object({
    name: Joi.string().required(),
    enabled: Joi.boolean().required(),
    adminId: Joi.string().required(),
    timeStamps: Joi.object({})
})