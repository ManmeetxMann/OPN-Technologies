import * as Joi from 'joi'
import {FirestoreTimestamp} from '../../../common/src/utils/joi-extensions'

export default Joi.object({
  lotNumber: Joi.string().required(),
  hardwareName: Joi.string().required(),
  expiry: FirestoreTimestamp.isValid(),
  manufacturer: Joi.string().required(),
  createdBy: Joi.string().required(),
})
