export class Stripe {
  constructor() {
    console.log('Stripe mock was constucted!')
  }

  paymentIntentMock = {
    id: 'pi_1DoRpz2eZvKYlo2CdQQ82XqG',
    object: 'payment_intent',
    amount: 1099,
    amount_capturable: 0,
    amount_received: 0,
    application: null,
    application_fee_amount: null,
    canceled_at: null,
    cancellation_reason: null,
    capture_method: 'automatic',
    charges: {
      object: 'list',
      data: [],
      has_more: false,
      url: '/v1/charges?payment_intent=pi_1DoRpz2eZvKYlo2CdQQ82XqG',
    },
    client_secret: 'pi_1DoRpz2eZvKYlo2CdQQ82XqG_secret_UgP1bnfegkmauIYt3crKMi07G',
    confirmation_method: 'automatic',
    created: 1546505159,
    currency: 'eur',
    customer: null,
    description: null,
    invoice: null,
    last_payment_error: null,
    livemode: false,
    metadata: {},
    next_action: null,
    on_behalf_of: null,
    payment_method: null,
    payment_method_options: {},
    payment_method_types: ['card'],
    receipt_email: null,
    review: null,
    setup_future_usage: null,
    shipping: null,
    statement_descriptor: null,
    statement_descriptor_suffix: null,
    status: 'requires_capture',
    transfer_data: null,
    transfer_group: null,
  }

  customers = {
    create: async function(): Promise<unknown> {
      return {
        id: 'cus_AJ6bvXbVofMpsW',
        object: 'customer',
        address: null,
        balance: 0,
        created: 1489792893,
        currency: 'usd',
        default_source: 'card_19yUO12eZvKYlo2CQF18JytV',
        delinquent: true,
        description: 'My First Test Customer (created for API docs)',
        discount: null,
        email: 'consuelo@stayopn.com',
        invoice_prefix: 'B568657',
        invoice_settings: {
          custom_fields: null,
          default_payment_method: null,
          footer: null,
        },
        livemode: false,
        metadata: {},
        name: null,
        next_invoice_sequence: 42780,
        phone: null,
        preferred_locales: [],
        shipping: null,
        tax_exempt: 'none',
      }
    },
  }

  ephemeralKeys = {
    create: async (): Promise<unknown> => {
      return {
        id: 'ephkey_2IlIq9DSeop22AOrZzSgsY2Z',
        object: 'ephemeral_key',
        associated_objects: [
          {
            type: 'customer',
            id: 'cus_JO50mgLC6GLyk1',
          },
        ],
        created: 1619637269,
        expires: 1619640869,
        livemode: false,
        secret:
          'ek_test_YWNjdF8xSWN6TERT2VvcDIyQU9yLG1jNWdaa1NpTFZBcFhBY1k1RTZLR1Z2ZVRxNGltbk0_00aISCap12',
      }
    },
  }

  paymentIntents = {
    retrieve: async (): Promise<unknown> => {
      return this.paymentIntentMock
    },
    create: async (params: {payment_method: string}): Promise<unknown> => {
      const status =
        params.payment_method == 'invalid-stripe-payment-method'
          ? 'canceled_intent'
          : 'requires_capture'

      return {...this.paymentIntentMock, status}
    },
    cancel: async (): Promise<unknown> => {
      return {...this.paymentIntentMock, status: 'canceled'}
    },
    capture: async (): Promise<unknown> => {
      return {...this.paymentIntentMock, status: 'succeeded'}
    },
  }
}
