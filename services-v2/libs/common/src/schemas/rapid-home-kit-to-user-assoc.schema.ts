import * as Joi from 'joi'

export const rapidHomeKitToUserAssocSchema = Joi.object({
  rapidHomeKitId: Joi.string().required(),
  userId: Joi.string().required(),
  usedCount: Joi.number().required(),
})
