import * as Joi from 'joi'
import {FirestoreTimestamp} from '@opn-common-v1/utils/joi-extensions'

export const pcrTestResultSchema = Joi.object({
  id: Joi.string(),
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  dateOfBirth: Joi.string().required(),
  postalCode: Joi.string().required(),
  testType: Joi.string()
    .required()
    .valid(
      'PCR',
      'RapidAntigen',
      'RapidAntigenAtHome',
      'Temperature',
      'Attestation',
      'EmergencyRapidAntigen',
      'Antibody_All',
      'Antibody_IgM',
      'ExpressPCR',
    ),
  userId: Joi.string().required(),
  displayInResult: Joi.boolean().required(),
  dateTime: FirestoreTimestamp.isValid().required(),
  homeKitId: Joi.string().required(),
  photoUrl: Joi.string().required(),
  result: Joi.string()
    .required()
    .valid('Positive', 'Negative', 'Invalid'),
  reportAs: Joi.string()
    .required()
    .valid('Individual', 'Family', 'PartOfATeam'),
})
