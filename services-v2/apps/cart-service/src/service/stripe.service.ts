import {Stripe} from 'stripe'
import {Config} from '@opn-common-v1/utils/config'

/**
 * TODO:
 * 1. Logging
 * 2. Nest config
 */
export class StripeService {
  private stripe = new Stripe(Config.get('STRIPE_SECRET_KEY'), null)
  private commonOptions = {
    apiVersion: '2020-08-27',
  }
  private currency = 'cad'

  async createUser(): Promise<Stripe.Customer> {
    let customer = null
    try {
      customer = this.stripe.customers.create(this.commonOptions)
    } catch (err) {}
    return customer
  }

  async customerEphemeralKeys(customer: string): Promise<Stripe.EphemeralKey> {
    let ephemeralKeys = null
    try {
      ephemeralKeys = this.stripe.ephemeralKeys.create({customer}, this.commonOptions)
    } catch (err) {}

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
        },
        this.commonOptions,
      )
    } catch (err) {
      // Error code will be authentication_required if authentication is needed
      console.log('Error code is: ', err.code)
      intentResult = await this.stripe.paymentIntents.retrieve(
        err.raw.payment_intent.id,
        null,
        this.commonOptions,
      )
      console.log('PI retrieved: ', intentResult.id)
    }
    return intentResult
  }

  isPaymentIntentSuccess(paymentIntent: Stripe.PaymentIntent): boolean {
    return paymentIntent.status === 'succeeded'
  }
}
