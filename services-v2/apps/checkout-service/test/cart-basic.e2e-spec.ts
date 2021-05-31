import {Test, TestingModule} from '@nestjs/testing'
import {HttpService} from '@nestjs/common'
import * as request from 'supertest'
import {FastifyAdapter, NestFastifyApplication} from '@nestjs/platform-fastify'

import {App} from '../src/main'

import {createUser, deleteUserByIdTestDataCreator, commonHeaders} from '@opn-services/test/utils'
import {cartItem} from './cart-seed'
/**
 * Mock remote dependencies
 */
jest.mock('@opn-services/common/services/firebase/firebase-auth.service')
jest.mock('@opn-reservation-v1/adapter/acuity')
jest.mock('@opn-services/checkout/service/stripe.service')

/**
 * TODO:
 * 1. User check
 * 2. Tests cross users and organizations
 */
describe('Cart basic', () => {
  const url = `/api/v1/cart`
  let app: NestFastifyApplication
  let server: HttpService

  const userId = 'CART_USER_BASIC'
  const organizationId = 'CART_ORG_BASIC'
  const testDataCreator = __filename.split('/services-v2/')[1]
  const headers = {
    accept: 'application/json',
    organizationid: organizationId,
    authorization: `Bearer userId:${userId}`,
    ...commonHeaders,
  }

  beforeAll(async () => {
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
    await new Promise(resolve => app.listen(81, resolve))
  })

  test('get cart success status code', async done => {
    const result = await request(server)
      .get(url)
      .set(headers)

    expect(result.status).toBe(200)
    expect(Array.isArray(result.body.data.cartItems)).toBe(true)
    expect(Array.isArray(result.body.data.paymentSummary)).toBe(true)
    done()
  })

  test('add and read the cart', async done => {
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
    expect(afterAddCount - beforeAddCount).toBeGreaterThanOrEqual(1)
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

    const promises = []
    // remove all cart items
    for (const item of cart.body.data.cartItems) {
      promises.push(
        request(server)
          .delete(`${url}/${item.cartItemId}`)
          .set(headers),
      )
    }
    await Promise.all(promises)

    // should have not items
    const cartAfter = await request(server)
      .get(url)
      .set(headers)
    expect(cartAfter.body.data.paymentSummary.length).toBe(0)
    expect(cartAfter.body.data.cartItems.length).toBe(0)
    done()
  })

  afterAll(async () => {
    await Promise.all([await app.close(), deleteUserByIdTestDataCreator(userId, testDataCreator)])
  })
})
