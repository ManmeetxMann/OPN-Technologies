import Joi from 'joi'

export default Joi.object({
  id: Joi.string(),
  key: Joi.number(),
  name: Joi.string().required(),
  type: Joi.string().allow('default', 'childcare'),
  allowsSelfCheckInOut: Joi.boolean(),
  allowDependants: Joi.boolean(),
  organization_groups: Joi.array(),
  hourToSendReport: Joi.number().min(0).max(23).allow(null),
  dayShift: Joi.number().min(0),
  dailyReminder: Joi.object({
    enabled: Joi.boolean().required(),
    enabledOnWeekends: Joi.boolean().required(),
    timeOfDayMillis: Joi.number().min(0).max(86400000).required(),
  }),
  enablePushNotifications: Joi.boolean(),
  notificationFormatCaution: Joi.string(),
  notificationFormatStop: Joi.string(),
  notificationIconCaution: Joi.string(),
  notificationIconStop: Joi.string(),
  enableTemperatureCheck: Joi.boolean().required(),
  enablePulseOxygen: Joi.boolean().required(),
  legacyMode: Joi.boolean().required(),
  enableTesting: Joi.boolean().required(),
  questionnaireId: Joi.string(),
})
