import * as Joi from 'joi'

export const cartItemSchema = Joi.object({
  id: Joi.string(),
  cartItemId: Joi.string().required(),
  patient: Joi.any(),
  appointment: {
    appointmentTypeId: Joi.number(),
    calendarTimezone: Joi.string(),
    calendarId: Joi.number(),
    date: Joi.string(),
    time: Joi.string(),
    organizationId: Joi.string().required(),
    packageCode: Joi.string().allow(''),
    calendarName: Joi.string(),
  },
  appointmentType: {
    price: Joi.string().required(),
    name: Joi.string().required(),
  },
})
