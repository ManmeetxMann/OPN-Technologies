import * as Joi from 'joi'

export const opnHeadersSchema = Joi.object({
  opnDeviceIdHeader: Joi.string().required(),
  opnSourceHeader: Joi.string().required(),
  opnRequestIdHeader: Joi.string().required(),
  opnLangHeader: Joi.string()
    .allow('en', 'fr')
    .required(),
  opnAppVersion: Joi.string()
    .allow('FH_IOS', 'FH_Android', 'OPN_IOS', 'OPN_Android', 'Admin_Dashboard', 'FH_RapidHome_Web')
    .required(),
})
