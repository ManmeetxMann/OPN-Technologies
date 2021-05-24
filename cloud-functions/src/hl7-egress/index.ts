import type {
  EventFunctionWithCallback,
  HttpFunction,
} from '@google-cloud/functions-framework/build/src/functions'
import fetch from 'node-fetch';

type PubSubMessage = {
  data: string
}

type AppointmentData = {
  patientCode: string
  barCode: string
  dateTimeForAppointment: string
  firstName: string
  lastName: string
  healthCard: string
  dateOfBirth: string
  gender: string
  address1: string
  address2: string
  city: string
  province: string
  postalCode: string
  country: string
  testType: string
  clinicCode: string
}

const sendMessage = async (appointment:AppointmentData) => {
  console.log('Message Sending')
  fetch('http://192.168.68.18:6011', {
    method: 'post',
    body: JSON.stringify(appointment),
    headers: { 'Content-Type': 'application/json' },
  })
  .then(res => res.json())
  .then(json => console.log(json));
  console.log('Message Sent')
}

const requestHandler: EventFunctionWithCallback = async (pubSubMessage:PubSubMessage, context, callback) => {
  // tslint:disable: no-console
  const data = JSON.parse(Buffer.from(pubSubMessage.data, 'base64').toString())
  // tslint:disable: no-console
  console.log(data)
  await sendMessage(data as AppointmentData)
  callback()
}

const httpTestHandler: HttpFunction = async (req, res) => {
  await sendMessage(req.body)
  res.send('No function to test!')
}

export {requestHandler, httpTestHandler}
