import {Test, TestingModule} from '@nestjs/testing'
import {HttpService} from '@nestjs/common'
import * as request from 'supertest'
import {FastifyAdapter, NestFastifyApplication} from '@nestjs/platform-fastify'

import {App} from '../src/main'

// const userID = 'CART_USER_TEST'
const organizationId = 'CART_ORG_TEST'

export const cartItem = {
  slotId:
    'eyJhcHBvaW50bWVudFR5cGVJZCI6MTk0MjIwMTgsImNhbGVuZGFyVGltZXpvbmUiOiJBbWVyaWNhL1Rvcm9udG8iLCJjYWxlbmRhcklkIjo0NTcxMTAzLCJjYWxlbmRhck5hbWUiOiJCcmFtcHRvbjogTW91bnQgUGxlYXNhbnQgVmlsbGFnZSIsImRhdGUiOiIyMDIxLTA1LTAyIiwidGltZSI6IjIwMjEtMDUtMDJUMDg6MTA6MDAtMDQwMCIsIm9yZ2FuaXphdGlvbklkIjoidkd2cUpVTGZ3SUMwQ0R3VnlBREkiLCJwYWNrYWdlQ29kZSI6IjBGN0U0REI1In0=',
  firstName: 'string',
  lastName: 'string',
  gender: 'Male',
  phone: {
    code: 0,
    number: 0,
  },
  dateOfBirth: '2021-04-17',
  address: 'string',
  addressUnit: 'string',
  postalCode: 'string',
  couponCode: 'string',
  shareTestResultWithEmployer: true,
  agreeToConductFHHealthAssessment: true,
  readTermsAndConditions: true,
  receiveResultsViaEmail: true,
  receiveNotificationsFromGov: true,
}

const headers = {
  accept: 'application/json',
  organizationId: organizationId,
  Authorization: 'Bearer RegUser',
}

/**
 * Mock remote dependencies
 */
jest.mock('@opn-services/common/services/auth/firebase-auth.service')
jest.mock('@opn-reservation-v1/adapter/acuity')
jest.mock('@opn-services/cart/service/stripe.service')

/**
 * TODO:
 * 1. User check
 * 2. Tests cross users and organizations
 */
describe('CartController', () => {
  let app: NestFastifyApplication
  let server: HttpService

  beforeAll(async () => {
    const testAppModule: TestingModule = await Test.createTestingModule({
      imports: [App],
    }).compile()

    app = testAppModule.createNestApplication(new FastifyAdapter())

    server = app.getHttpServer()
    await new Promise(resolve => app.listen(81, resolve))
  })

  afterAll(async () => {
    await app.close()
  })

  test('get cart success status code', async done => {
    const url = `/api/v1/cart`
    const result = await request(server)
      .get(url)
      .set(headers)

    expect(result.status).toBe(200)
    expect(Array.isArray(result.body.data.cartItems)).toBe(true)
    expect(Array.isArray(result.body.data.paymentSummary)).toBe(true)
    done()
  })

  test('add and read the cart', async done => {
    const url = `/api/v1/cart`

    const getBefore = await request(server)
      .get(url)
      .set(headers)

    const beforeAddCount = getBefore.body.data.cartItems.length
    const result = await request(server)
      .post(url)
      .set({
        ...headers,
        'Content-Type': 'application/json',
      })
      .send({items: [cartItem]})

    const getAfter = await request(server)
      .get(url)
      .set(headers)
    const afterAddCount = getAfter.body.data.cartItems.length

    // Http codes
    expect(getBefore.status).toBe(200)
    expect(result.status).toBe(201)
    expect(getAfter.status).toBe(200)
    // Card save operation
    expect(afterAddCount - beforeAddCount).toBe(1)
    // Data sanity
    expect(getAfter.body.data.paymentSummary.length).toBeGreaterThan(2)
    getAfter.body.data.paymentSummary.forEach(summary => {
      expect(typeof summary.uid).toBe('string')
      expect(typeof summary.label).toBe('string')
      expect(typeof summary.amount).toBe('number')
    })

    getAfter.body.data.cartItems.forEach(cartItem => {
      expect(typeof cartItem.cartItemId).toBe('string')
      expect(typeof cartItem.label).toBe('string')
      expect(typeof cartItem.subLabel).toBe('string')
      expect(typeof cartItem.patientName).toBe('string')
      expect(typeof cartItem.date).toBe('string')
      expect(typeof cartItem.price).toBe('number')
    })

    done()
  })

  test('add few card items and remove all', async done => {
    const url = `/api/v1/cart`

    // should have added item
    await request(server)
      .post(url)
      .set({
        ...headers,
        'Content-Type': 'application/json',
      })
      .send({items: Array(3).fill(cartItem)})
    const cart = await request(server)
      .get(url)
      .set(headers)
    expect(cart.body.data.paymentSummary.length).toBeGreaterThanOrEqual(3)

    // remove all cart items
    for (const item of cart.body.data.cartItems) {
      await request(server)
        .delete(`${url}/${item.cartItemId}`)
        .set(headers)
    }

    // should have not items
    const cartAfter = await request(server)
      .get(url)
      .set(headers)
    expect(cartAfter.body.data.paymentSummary.length).toBe(0)
    expect(cartAfter.body.data.cartItems.length).toBe(0)
    done()
  })
})
