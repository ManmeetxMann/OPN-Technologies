const frisby = require('frisby');
const helpersCommon = require('helpers_common');
// const testProfile = require('test_profile');

// Do setup first
frisby.globalSetup({
  request: {
    headers: helpersCommon.headers(),
    timeout: 60000,
  },
});
jest.setTimeout(60000);
const reservationServiceUrl = process.env.RESERVATION_SERVICE_URL;
// const organizationId = testProfile.get().organizationId;
/**
 * @group reservation-service
 * @group /reservation/admin/api/v1/appointments
 * @group copy-appointments
 */
describe('Copy Appointment', () => {
  test('Copy Appointments as super admin?', function() {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${reservationServiceUrl}/reservation/admin/api/v1/appointments/copy`;
      return frisby
          .setup({
            request: {
              headers: {
                'Authorization': `Bearer ${token}`,
                'timeout': 60000,
              },
            },
          })
          .post(
              url,
              {
                appointmentIds: [
                  'aVK36E35BQcRpFi0q7N9',
                  'aY26d2FFKLozdbTiX9sb',
                  'aYHwJvGcXdC1O4OUnMjo',
                  'adSmIpVEC2QPKDoR0n16',
                  'amCO3tEhxIRdnrVQGdmz',
                  'aqCdjHbm9TD7OuiVisjO',
                  'au9vH2LSSYxWdK5oYHOY',
                  'b7aVTOHp7homEARJekP6',
                  'b7yQzyUkzsyEw7aR5f7K',
                  'b8xxFey27ktjNcL6dw9o',
                  'bMjckLVZwLL8MNFq5Jdn',
                  'bdd7u6CJ6FwQzaLEoUO4',
                  'bgFN991ohgeIFM3MrG6e',
                  'bkc9IvsEFBKV3sqwuAG2',
                  'bvKg3GGFTVbYBLsotD6g',
                  'bxLtkwSrsVevq4T3xeXp',
                  'c7XqcCM7K23rzMdN4tkq',
                  'c7aaQdYAHMGYJweerqfP',
                  'cBcxI0EkQ7gtrL96N2gC',
                ],
                date: '2021-04-15',
              },
          )
          .expect('status', 200)
          .inspectBody();
    });
  });
});

