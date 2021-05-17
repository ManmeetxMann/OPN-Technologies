import type {EventFunctionWithCallback} from '@google-cloud/functions-framework/build/src/functions'

const requestHandler: EventFunctionWithCallback = async (pubSubMessage, context, callback) => {
  // tslint:disable: no-console
  console.log('Test')
  callback()
}

export {requestHandler}
