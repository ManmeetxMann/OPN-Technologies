import {NextFunction, Request, Response, Router} from 'express'

// Common
import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {authorizationMiddleware} from '../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../common/src/types/authorization'
import {StripeService} from '../../../../common/src/service/payment/stripe'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'
import {AuthUser} from '../../../../common/src/data/user'

// Services
import {UserCardService} from '../../services/user-cart.service'

// Models
import {CartRequest} from '../../models/cart'
/**
 * TODO:
 * 2. DB integration
 */
class CartController implements IControllerBase {
  public router = Router()
  public path = '/reservation/api/v1'
  private userCardService = new UserCardService()
  private stripeService = new StripeService()

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
      const authenticatedUser = res.locals.authenticatedUser as AuthUser
      const organizationId = req.headers.organizationid as string
      const userCard = await this.userCardService.getUserCart(authenticatedUser, organizationId)

      res.json(actionSucceed(userCard))
    } catch (error) {
      next(error)
    }
  }

  addToCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cartItems = req.body as CartRequest[]
      const authenticatedUser = res.locals.authenticatedUser as AuthUser
      const organizationId = req.headers.organizationid as string

      this.userCardService.addItems(authenticatedUser, cartItems, organizationId)
      res.json(actionSucceed())
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
      const cartItemId = req.params.cartItemId as string
      const authenticatedUser = res.locals.authenticatedUser as AuthUser
      const organizationId = req.headers.organizationid as string

      this.userCardService.deleteItem(authenticatedUser, cartItemId, organizationId)
      res.json(actionSucceed({}))
    } catch (error) {
      next(error)
    }
  }

  creteEphemeralKeys = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // const authenticatedUser = res.locals.authenticatedUser as AuthUser
      const ephemeralKeys = await this.stripeService.customerEphemeralKeys('cus_JJ0T3QA6kYrv9M')
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
