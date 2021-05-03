import {Stripe} from 'stripe'

import {ConfigService} from '@nestjs/config'
import {Injectable} from '@nestjs/common'

import {StripeFunctions, StripeEvent} from '@opn-services/common/types/activity-logs'
import {LogError} from '@opn-services/common/utils/logging'

@Injectable()
export class StripeService {
  constructor(private configService: ConfigService) {}

  private stripe = new Stripe(this.configService.get('STRIPE_SECRET_KEY'), null)
  private commonOptions = {
    apiVersion: '2020-08-27',
  }
  private currency = 'cad'

  async createUser(): Promise<Stripe.Customer> {
    let customer = null
    try {
      customer = this.stripe.customers.create(this.commonOptions)
    } catch (err) {
      LogError(StripeFunctions.createUser, StripeEvent.ephemeralKeysError, {...err})
    }
    return customer
  }

  async customerEphemeralKeys(customer: string): Promise<Stripe.EphemeralKey> {
    let ephemeralKeys = null
    try {
      ephemeralKeys = this.stripe.ephemeralKeys.create({customer}, this.commonOptions)
    } catch (err) {
      LogError(StripeFunctions.customerEphemeralKeys, StripeEvent.ephemeralKeysError, {...err})
    }

    return ephemeralKeys
  }

  /**
   * https://stripe.com/docs/payments/save-during-payment?platform=ios#ios-create-payment-intent-off-session
   */
  async createPaymentIntent(
    customerId: string,
    amount: number,
    paymentMethodId: string,
  ): Promise<Stripe.PaymentIntent> {
    let intentResult = null

    try {
      // off_session and confirm equal true means payment method needs validation
      intentResult = await this.stripe.paymentIntents.create(
        {
          amount,
          currency: this.currency,
          customer: customerId,
          payment_method: paymentMethodId,
          off_session: true,
          confirm: true,
          capture_method: 'manual',
        },
        this.commonOptions,
      )
    } catch (err) {
      LogError(StripeFunctions.createPaymentIntent, StripeEvent.paymentIntentsError, {...err})
      // Error code will be authentication_required if authentication is needed
      if (err.raw.payment_intent) {
        intentResult = await this.stripe.paymentIntents.retrieve(
          err.raw.payment_intent.id,
          null,
          this.commonOptions,
        )
      }
    }
    return intentResult
  }

  async cancelPaymentIntent(paymentIntentId: string) {
    let intentResult = null
    try {
      intentResult = this.stripe.paymentIntents.cancel(paymentIntentId, {
        cancellation_reason: 'abandoned',
      })
    } catch (err) {
      LogError(StripeFunctions.cancelPaymentIntent, StripeEvent.paymentIntentsError, {...err})
    }
    return intentResult
  }

  async capturePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    let intentResult = null
    try {
      intentResult = this.stripe.paymentIntents.capture(paymentIntentId)
    } catch (err) {
      LogError(StripeFunctions.capturePaymentIntent, StripeEvent.paymentIntentsError, {...err})
    }
    return intentResult
  }

  isPaymentIntentSuccess(paymentIntent: Stripe.PaymentIntent): boolean {
    return paymentIntent?.status === 'requires_capture'
  }

  isPaymentIntentCaptureSuccess(paymentIntent: Stripe.PaymentIntent): boolean {
    return paymentIntent?.status === 'succeeded'
  }
}
