import Joi from 'joi'
import {FirestoreTimestamp} from '../../../common/src/utils/joi-extensions'

export default Joi.object({
  testRunId: Joi.string().required(),
  testRunDate: Joi.string().required(),
  testRunDateTime: FirestoreTimestamp.isValid(),
  name: Joi.string().required(),
})
