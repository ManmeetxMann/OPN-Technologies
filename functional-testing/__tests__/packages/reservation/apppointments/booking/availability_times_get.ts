import { getAvailabilityDates } from "./availability_dates_get";
import { getLocations } from "./booking_locations_get";
import helpersCommon from '../../../../../helpers/helpers_common';

const frisby = require('frisby');

const reservationServiceUrl = process.env.RESERVATION_SERVICE_URL;
let encodedId: string = null
let token: string = null
let availabilityDates = []
// Do setup first
frisby.globalSetup({
    request: {
        headers: helpersCommon.headers(),
    },
});


/**
 * @group reservation-service
 * @group /reservation/api/v1/availability/slots
 * @group get-availability-times
 * @group reg-user
 */
beforeAll(async () => {
    token = await helpersCommon.runAuthenticatedTest(frisby)
    const responseForLocations = await getLocations(token)
    const locations = responseForLocations.json.data
    encodedId = locations[0].id
    expect(locations.length).toBeGreaterThan(0)

    const responseForDates = await getAvailabilityDates(token, encodedId)
    availabilityDates = responseForDates.json.data
    expect(availabilityDates.length).toBeGreaterThan(0)
})

describe('get:availability times', () => {
    test('should get availability times successfully?', function () {
        const url = `${reservationServiceUrl}/reservation/api/v1/availability/times?date=${availabilityDates[0].date}&id=${encodedId}`;
        return frisby
            .setup({
                request: {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                },
            })
            .get(
                url,
            )
            .expect('status', 200)
        //.inspectBody();
    })

    test('should fail to get availability times: Missing Date', function () {
        const url = `${reservationServiceUrl}/reservation/api/v1/availability/times?id=${encodedId}`;
        return frisby
            .setup({
                request: {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                },
            })
            .get(
                url,
            )
            .expect('status', 400);
    });


    test('should fail to get availability times: Missing ID', function () {
        const url = `${reservationServiceUrl}/reservation/api/v1/availability/times?date=2021-02-02`;
        return frisby
            .setup({
                request: {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                },
            })
            .get(
                url,
            )
            .expect('status', 400)
    });

    test('should fail to get availability times for bad data', function () {
        const url = `${reservationServiceUrl}/reservation/api/v1/availability/times?date=2021-02-02&id=1`;
        return frisby
            .setup({
                request: {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                },
            })
            .get(
                url,
            )
            .expect('status', 400);
    });
});
