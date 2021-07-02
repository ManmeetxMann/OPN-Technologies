import frisby from 'frisby'
import helpersCommon from '../../../../helpers/helpers_common'


frisby.globalSetup({
  request: {
    headers: helpersCommon.headers(),
  },
});

const reservationServiceUrl = process.env.RESERVATION_SERVICE_URL;


describe('post:appointments', () => {
  test('Appointment Sync is working', function() {
    return helpersCommon.runAuthenticatedTest(frisby).then(async function(token) {
      const url = 'https://acuityscheduling.com/api/v1/appointments';
      return frisby
          .setup({
            request: {
              headers: {
                'Authorization': 'Basic MjA5MDEwOTY6ZmE5ZDM3ZGZhNDg4M2MzM2ZmOTk5NDc2MWFjOGRmYmY=',
                'Content-Type': 'application/json',
                'Cookie': '; PHPSESSID=ei674vjl4esn4i8tqfau4q9mpn'
              },
            },
          })
          .post(
              url,
             {
                "datetime": "2021-04-29T20:30:00-0400",
                "calendarID": 4571103,
                "appointmentTypeID": 19422018,
                "firstName": "H_PCR_Caleigh",
                "lastName": "Jacobs",
                "email": "stayopndev@gmail.com",
                "phone": "1111112121",
                "fields": [
                  {
                    "id": 8637043,
                    "value": "01 Jan 2001"
                  },
                  {
                    "id": 9082893,
                    "value": "yes"
                  },
                  {
                    "id": 9112802,
                    "value": "yes"
                  },
                  {
                    "id": 9082892,
                    "value": "yes"
                  },
                  {
                    "id": 9082891,
                    "value": "yes"
                  },
                  {
                    "id": 9082854,
                    "value": "HOME ADDRESS..."
                  },
                  {
                    "id": 9082890,
                    "value": "HOME UNIT..."
                  }
                ]
              })
              const makesynccall = async () => {
                const url = `${reservationServiceUrl}/reservation/internal/api/v1/appointments/sync-from-acuity`;
                const response = await frisby
                    .post(
                        url,
                        {
                            "calendarID": "aaaaa",
                            "appointmentTypeID": "aaaaa",
                            "action": "staaaaring",
                            "acuityID": "asffdf"
                        }
                    )
            
            
                return response;
            }
            const makesynccallRes = await makesynccall();
            expect(makesynccallRes.status).toEqual(200)
            expect(makesynccallRes.json.data.status).toBe('proceed')
          
    });
  });
});




