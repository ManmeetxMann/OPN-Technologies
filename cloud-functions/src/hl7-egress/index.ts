import type {EventFunctionWithCallback} from '@google-cloud/functions-framework/build/src/functions'

const hl7Handler: EventFunctionWithCallback = async (pubSubMessage, context, callback) => {
  // tslint:disable: no-console
  console.log('Test')
  callback()
}

export {hl7Handler}
