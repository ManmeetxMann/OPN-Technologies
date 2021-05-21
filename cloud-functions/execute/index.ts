/*
 * Helper for local development ONLY.
 * Avoids a need to run a local emulator for cloud function and pub sub
 * Export background functions as HTTP method
 */
import * as dotenv from 'dotenv'
import * as SmsNotification from '../src/sms-notification'

// Set local environmental variables
dotenv.config({path: __dirname + '/../../.env'})

/**
 * Rudimentary router function only for localhost testing
 */
exports.index = (req, res) => {
  // Routing based on the path, e.g. http://localhost:8080/smsNotification
  // tslint:disable: no-console
  console.log(process.env.TO_TEST_NUMBER)
  switch (req.path) {
    case '/smsNotification':
      const toTestNumber = process.env.TO_TEST_NUMBER

      const message = {
        data: '',
        attributes: {
          toPhoneNumber: toTestNumber,
          messageType: 'MessageTypeOne',
        },
      }
      SmsNotification.smsNotification(message, null, () => {
        res.sendStatus(200)
      })
      return

    default:
      res.send('No function to test!')
  }
}
