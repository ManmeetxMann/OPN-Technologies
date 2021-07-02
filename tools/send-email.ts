import {EmailService} from '../packages/common/src/service/messaging/email-service'

async function main() {
  const emailService = new EmailService()
  await emailService.send({
    to: [
      {
        email: 'tsovak@stayopn.com',
        name: 'Tsovak Harutyunyan',
      },
    ],
    templateId: 1,
    params: {
      confirmed_date: 'Wednesday, May 22, 2021 at 3:30pm',
      location: 'Brampton',
      street: 'Ontario',
      address_n_zip: '0048',
      country: 'Canada',
      note: 'Greate choice',
      lat: '40.179188',
      lng: '44.499104',
      tests: [
        {
          name: 'Covid-19 PCR Test',
          location: 'Forest Hill In-Clinic',
          patname: 'John Doe',
          date: 'September 9th @ 10:00am',
          quantity: '1',
          total: '200',
        },
      ],
      subtotal: '$600',
      tax: '$200',
      total: '$800',
      billing_name: 'Tsovak Harutyunyabn',
      billing_note: 'by credit card',
      billing_address: 'Nork Marash',
      billing_country: 'Armenia',
      contact_name: 'Fax',
      contact_email: 'tsovakh@gmail.com',
      contact_phone: '+37441102090',
      ending_with: '1993',
    },
  })
}

main().then(async (response) => {
  console.log(response)
})
