/**
 * Gets payment ID for test user
 */
import {Stripe} from 'stripe'
import {Config} from '../packages/common/src/utils/config'

const stripe = new Stripe(Config.get('STRIPE_SECRET_KEY'), null)

const customer = 'cus_JNlGwhhox8WlZH'

async function main() {
  const paymentMethods = await stripe.paymentMethods.list({
    customer,
    type: 'card',
  })

  if (paymentMethods.data.length === 0) {
    console.log(`Customer ${customer} doesn't have any payment method, adding a new one`)
    const newPayment = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        number: '4242424242424242',
        exp_month: 4,
        exp_year: 2022,
        cvc: '314',
      },
    })

    await stripe.paymentMethods.attach(newPayment.id, {
      customer,
    })

    const paymentMethods = await stripe.paymentMethods.list({
      customer,
      type: 'card',
    })

    console.log(paymentMethods.data)
  }

  return paymentMethods.data
}

main().then(async (result) => {
  const data = await result
  console.log(data)
})
