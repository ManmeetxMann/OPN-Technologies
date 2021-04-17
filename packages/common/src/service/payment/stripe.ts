import {Stripe} from 'stripe'
import {Config} from '../../utils/config'

export class StripeService {
  private stripe = new Stripe(Config.get('STRIPE_SECRET_KEY'), null)
  private apiVersion = '2020-08-27'

  async createUser(): Promise<Stripe.Customer> {
    return await this.stripe.customers.create()
  }

  async customerEphemeralKeys(customerId): Promise<Stripe.EphemeralKey> {
    return this.stripe.ephemeralKeys.create(
      {customer: 'cus_JJ0T3QA6kYrv9M'},
      {apiVersion: this.apiVersion},
    )
  }
}
