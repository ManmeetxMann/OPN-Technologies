/**
 * Gets payment ID for test user
 */
import {Stripe} from 'stripe'
import {Config} from '../packages/common/src/utils/config'

const stripe = new Stripe(Config.get('STRIPE_SECRET_KEY'), null)

async function main() {
  const paymentMethods = await stripe.paymentMethods.list({
    customer: 'cus_JJ0T3QA6kYrv9M',
    type: 'card',
  })
  return paymentMethods.data
}

main().then(async (result) => {
  const data = await result
  console.log(data)
})
