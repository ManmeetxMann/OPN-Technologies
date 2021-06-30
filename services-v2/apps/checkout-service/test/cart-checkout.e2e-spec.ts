/* eslint-disable max-lines-per-function */
import * as request from 'supertest'
import {Test, TestingModule} from '@nestjs/testing'
import {HttpService} from '@nestjs/common'
import {FastifyAdapter, NestFastifyApplication} from '@nestjs/platform-fastify'

import {App} from '../src/main'
import {cartItem} from './cart-seed'

import {
  createUser,
  deleteUserByIdTestDataCreator,
  deleteAppointmentsById,
  createUpdateAcuityTypes,
  commonHeaders,
} from '@opn-services/test/utils'

/**
 * Mock remote dependencies
 */
jest.mock('@opn-services/common/services/firebase/firebase-auth.service')
jest.mock('@opn-reservation-v1/adapter/acuity')
jest.mock('stripe')

jest.setTimeout(15000)

/**
 * TODO:
 * 1. User check
 * 2. Tests cross users and organizations
 */
describe('Cart checkout', () => {
  const url = '/api/v1/cart'
  let app: NestFastifyApplication
  let server: HttpService

  const userId = 'CART_USER_CHECKOUT'
  const organizationId = 'CART_ORG_TEST_CHECKOUT'
  const testDataCreator = __filename.split('/services-v2/')[1]
  const headers = {
    accept: 'application/json',
    organizationid: organizationId,
    authorization: `Bearer userId:${userId}`,
    ...commonHeaders,
  }

  beforeAll(async () => {
    await createUpdateAcuityTypes(testDataCreator)
    await createUser(
      {
        id: userId,
        organizationIds: [organizationId],
      },
      testDataCreator,
    )

    const testAppModule: TestingModule = await Test.createTestingModule({
      imports: [App],
    }).compile()

    app = testAppModule.createNestApplication(new FastifyAdapter())

    server = app.getHttpServer()
    await new Promise(resolve => app.listen(80, resolve))
  })

  test('get stripe ephemeral keys', async done => {
    const paymentUrl = `${url}/ephemeral-keys`
    const paymentResult = await request(server)
      .post(paymentUrl)
      .set(headers)

    expect(typeof paymentResult.body.id).toEqual('string')
    expect(typeof paymentResult.body.object).toEqual('string')
    expect(typeof paymentResult.body.associated_objects).toEqual('object')
    expect(typeof paymentResult.body.created).toEqual('number')
    expect(typeof paymentResult.body.expires).toEqual('number')
    expect(typeof paymentResult.body.livemode).toEqual('boolean')
    expect(typeof paymentResult.body.secret).toEqual('string')

    done()
  })

  test('add item, use invalid payment method and process payment canceled_intent', async done => {
    // remove all cart items
    const cart = await request(server)
      .get(url)
      .set(headers)
    for (const item of cart.body.data.cartItems) {
      await request(server)
        .delete(`${url}/${item.cartItemId}`)
        .set(headers)
    }

    // add item in cart
    await request(server)
      .post(url)
      .set({
        ...headers,
        'Content-Type': 'application/json',
      })
      .send({items: [cartItem]})

    // checkout with payment
    const paymentUrl = `${url}/checkout-payment`
    const paymentResult = await request(server)
      .post(paymentUrl)
      .set(headers)
      .send({
        paymentMethodId: 'invalid-stripe-payment-method',
      })

    expect(paymentResult.body.data.payment.isValid).toBe(false)
    expect(paymentResult.body.data.payment.status).toBe('canceled_intent')
    expect(paymentResult.body.data.cart.isValid).toBe(true)
    expect(paymentResult.body.data.cart.items.length).toEqual(0)

    done()
  })

  test('add item and checkout successfully', async done => {
    // remove all cart items
    const cart = await request(server)
      .get(url)
      .set(headers)
    for (const item of cart.body.data.cartItems) {
      await request(server)
        .delete(`${url}/${item.cartItemId}`)
        .set(headers)
    }

    // add item in cart
    await request(server)
      .post(url)
      .set({
        ...headers,
        'Content-Type': 'application/json',
      })
      .send({items: [cartItem]})

    // checkout with payment
    const paymentUrl = `${url}/checkout-payment`
    const paymentResult = await request(server)
      .post(paymentUrl)
      .set(headers)
      .send({
        paymentMethodId: 'valid_payment_method',
      })

    expect(paymentResult.body.data.payment.isValid).toBe(true)
    expect(paymentResult.body.data.payment.status).toBe('succeeded')
    expect(paymentResult.body.data.cart.isValid).toBe(true)
    done()
  })

  afterAll(async () => {
    await Promise.all([
      deleteUserByIdTestDataCreator(userId, testDataCreator),
      deleteAppointmentsById(userId),
      app.close(),
    ])
  })
})
