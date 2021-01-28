import Joi from 'joi'
import {FirestoreTimestamp} from '../../../common/src/utils/joi-extensions'

export default Joi.object({
  adminId: Joi.string().required(),
  appointmentId: Joi.string().required(),
  barCode: Joi.string().required(),
  dateOfAppointment: Joi.string().required(),
  deadline: FirestoreTimestamp.isValid().required(),
  displayForNonAdmins: Joi.boolean().required(),
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  linkedBarCodes: Joi.array().required(),
  organizationId: Joi.string().allow('', null),
  reSampleNumber: Joi.number().required(),
  result: Joi.string().required(),
  resultSpecs: Joi.object({
    action: Joi.string().required(),
    autoResult: Joi.string().required(),
    calRed61Ct: Joi.string().required(),
    calRed61RdRpGene: Joi.string().required(),
    famCt: Joi.string().required(),
    famEGene: Joi.string().required(),
    hexCt: Joi.string().required(),
    hexIC: Joi.string().required(),
    quasar670Ct: Joi.string().required(),
    quasar670NGene: Joi.string().required(),
    resultDate: Joi.string().required(),
    notify: Joi.boolean().required(),
  }),
  runNumber: Joi.number().required(),
  testRunId: Joi.string(),
  //updatedAt: FirestoreTimestamp.isValid().required(), //Added after validation
  waitingResult: Joi.boolean().required(),
})
