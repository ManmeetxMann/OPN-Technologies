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

describe('Cart coupons', () => {
  const url = '/api/v1/cart'
  let app: NestFastifyApplication
  let server: HttpService

  const userId = 'CART_USER_COUPON'
  const organizationId = 'CART_ORG_TEST_COUPON'
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

  test('add cart item, use 10$ coupon', async done => {
    // remove all cart items
    const cart = await request(server)
      .get(url)
      .set(headers)
    for (const item of cart.body.data.cartItems) {
      await request(server)
        .delete(`${url}/${item.cartItemId}`)
        .set(headers)
    }

    // put item in cart
    await request(server)
      .post(url)
      .set({
        ...headers,
        'Content-Type': 'application/json',
      })
      .send({items: [cartItem]})

    // apply 10$ coupon
    const couponResult = await request(server)
      .post(`${url}/coupons`)
      .set({
        ...headers,
        'Content-Type': 'application/json',
      })
      .send({coupon: 'COUPON_CODE'})

    expect(couponResult.body.data.cartItems[0].price).toBe(45)
    expect(couponResult.body.data.cartItems[0].discountedPrice).toBe(35)
    done()
  })

  afterAll(async () => {
    await Promise.all([await app.close(), deleteUserByIdTestDataCreator(userId, testDataCreator)])
  })
})
