import * as Joi from 'joi'
import {firestore} from 'firebase-admin'

export const FirestoreTimestamp = Joi.extend((joi) => {
  return {
    type: 'isValid',
    base: joi.object(),
    messages: {
      invalid_timestamp: '{{#label}} invalid timestamp',
    },
    validate(value, helpers) {
      if (!(value instanceof firestore.Timestamp)) {
        return {value, errors: helpers.error('invalid_timestamp')}
      }
    },
  }
})
