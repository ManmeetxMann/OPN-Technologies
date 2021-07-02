import frisby from 'frisby'
import helpersCommon from '../../../../helpers/helpers_common'


frisby.globalSetup({
  request: {
    headers: helpersCommon.headers(),
  },
});

const reservationServiceUrl = process.env.RESERVATION_SERVICE_URL;


describe('Admin create transport ', () => {
    test('---', function() {
      return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
        const url = `${reservationServiceUrl}/reservation/admin/api/v1/transport-runs`;
        return frisby
            .setup({
              request: {
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              },
            })
            .post(
                url,
                {
                    "transportDateTime": "2021-06-29T22:21:42.905Z",
                },
            )
            .expect('status', 200)
            .inspectBody();
      });
    });
});
