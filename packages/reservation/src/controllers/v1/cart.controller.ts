import {NextFunction, Request, Response, Router} from 'express'
import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {authorizationMiddleware} from '../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../common/src/types/authorization'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'
import {safeTimestamp} from '../../../../common/src/utils/datetime-util'
import {now} from '../../../../common/src/utils/times'
import {Config} from '../../../../common/src/utils/config'
import {Stripe} from 'stripe'

/**
 * TODO:
 * 1. Stripe service
 * 2. DB integration
 */
class CartController implements IControllerBase {
  public router = Router()
  public path = '/reservation/api/v1'
  private stripe

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    this.router.get(
      this.path + '/cart',
      authorizationMiddleware([RequiredUserPermission.RegUser], true),
      this.getCart,
    )
    this.router.post(
      this.path + '/cart',
      authorizationMiddleware([RequiredUserPermission.RegUser], true),
      this.addToCart,
    )
    this.router.put(
      this.path + '/cart/:cartItemId',
      authorizationMiddleware([RequiredUserPermission.RegUser], true),
      this.updateCartItems,
    )
    this.router.delete(
      this.path + '/cart/:cartItemId',
      authorizationMiddleware([RequiredUserPermission.RegUser], true),
      this.deleteCartItems,
    )
    this.router.post(
      this.path + '/cart/ephemeral-keys',
      authorizationMiddleware([RequiredUserPermission.RegUser], true),
      this.creteEphemeralKeys,
    )
    this.router.post(
      this.path + '/cart/payment-authorization',
      authorizationMiddleware([RequiredUserPermission.RegUser], true),
      this.paymentAuthorization,
    )
    this.router.post(
      this.path + '/cart/remove-expired-items',
      authorizationMiddleware([RequiredUserPermission.SuperAdmin], true),
      this.removeExpired,
    )
  }

  getCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cartItems = [
        {
          cartItemId: '0ETNwX9mXw9WHSwkktV3',
          label: 'Covid-19 PCR Test',
          subLabel: 'Forest Hill In-Clinic',
          patientName: 'John Doe',
          date: safeTimestamp(now()),
          price: 159.79,
        },
        {
          cartItemId: '1ETNwX9mXw9WHSwkktV3',
          label: 'Covid-19 PCR Test',
          subLabel: 'Forest Hill In-Clinic',
          patientName: 'John Doe',
          date: safeTimestamp(now()),
          price: 159.79,
        },
      ]

      const total = 159.79 * 2
      const tax = 0.13

      const paymentSummary = [
        {
          uid: 'subTotal',
          label: 'SUBTOTAL',
          amount: total,
          currency: 'CAD',
        },
        {
          uid: 'tax',
          label: 'SUBTOTAL',
          amount: total * tax,
          currency: 'CAD',
        },
        {
          uid: 'total',
          label: 'Your Total',
          amount: total + total * tax,
          currency: 'CAD',
        },
      ]

      res.json(
        actionSucceed({
          cartItems,
          paymentSummary,
        }),
      )
    } catch (error) {
      next(error)
    }
  }

  addToCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json(actionSucceed({}))
    } catch (error) {
      next(error)
    }
  }

  updateCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json(actionSucceed({}))
    } catch (error) {
      next(error)
    }
  }

  updateCartItems = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json(actionSucceed({}))
    } catch (error) {
      next(error)
    }
  }

  deleteCartItems = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json(actionSucceed({}))
    } catch (error) {
      next(error)
    }
  }

  creteEphemeralKeys = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      this.stripe = new Stripe(Config.get('STRIPE_SECRET_KEY'), null)

      const ephemeralKeys = await this.stripe.ephemeralKeys.create(
        {customer: 'cus_JJ0T3QA6kYrv9M'},
        {apiVersion: '2020-08-27'},
      )
      res.json(ephemeralKeys)
    } catch (error) {
      next(error)
    }
  }

  paymentAuthorization = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json(actionSucceed({}))
    } catch (error) {
      next(error)
    }
  }

  removeExpired = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json(actionSucceed({}))
    } catch (error) {
      next(error)
    }
  }
}

export default CartController
