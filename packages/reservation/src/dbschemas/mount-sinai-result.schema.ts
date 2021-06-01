import * as Joi from 'joi'

export default Joi.object({
  patientCode: Joi.string().required(),
  barCode: Joi.string().required(),
  dateTime: Joi.string().required(),
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  healthCard: Joi.string().allow(''),
  dateOfBirth: Joi.string().required(),
  gender: Joi.string().required().valid('A', 'F', 'M', 'N', 'O', 'U'),
  address1: Joi.string().required(),
  address2: Joi.string().allow(''),
  city: Joi.string().allow(''),
  province: Joi.string().allow(''),
  postalCode: Joi.string().allow(''),
  country: Joi.string().allow(''),
  clinicCode: Joi.string().required(),
  testType: Joi.string()
    .required()
    .valid(
      'PCR',
      'RapidAntigen',
      'Temperature',
      'Attestation',
      'EmergencyRapidAntigen',
      'Antibody_All',
      'Antibody_IgM',
      'ExpressPCR',
    ),
  specimenSource: Joi.string()
    .required()
    .valid('NASOP', 'NASD', 'NARES', 'NTS', 'TS', 'VSALV', 'NMT'),
})
