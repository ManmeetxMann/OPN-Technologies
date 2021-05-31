import frisby from 'frisby';
import helpersCommon from '../../../../../helpers/helpers_common';
import { getLocations } from './booking_locations_get';

const reservationServiceUrl = process.env.RESERVATION_SERVICE_URL;
let encodedId: string = null
let locations = []
let token: string = null

// Do setup first
frisby.globalSetup({
    request: {
        headers: helpersCommon.headers(),
    },
});

const getAvailabilityDates = (token: string, encodedId:string) => {
    const dateObj = new Date()
    const currentYear = dateObj.getFullYear()
    const currentMonth = dateObj.getMonth()+2

    const url = `${reservationServiceUrl}/reservation/api/v1/availability/dates?year=${currentYear}&month=${currentMonth}&id=${encodedId}`;
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
}


if (!module.parent) {
    /**
     * @group reservation-service
     * @group /reservation/api/v1/booking-locations
     * @group get-availability-dates
     * @group reg-user
     */
    beforeAll(async () => {
        token = await helpersCommon.runAuthenticatedTest(frisby)
        const response = await getLocations(token)
        locations = response.json.data
        encodedId = locations[0].id
        expect(locations.length).toBeGreaterThan(0);
    })

    describe('get:availability dates', () => {
        it('should get availability dates successfully?', async () => {
            await getAvailabilityDates(token, encodedId)
                .expect('status', 200)
                //.inspectBody();
        });

        it('should fail to get availability dates: Missing Month', async () => {
            const url = `${reservationServiceUrl}/reservation/api/v1/availability/dates?year=2020&id=${encodedId}`;
            await frisby
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

        it('should fail to get availability dates: Missing Year', async () => {
            const url = `${reservationServiceUrl}/reservation/api/v1/availability/dates?month=12&id=${encodedId}`;
            await frisby
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

        it('should fail to get availability dates: Missing ID', async () => {
            const url = `${reservationServiceUrl}/reservation/api/v1/availability/dates?year=2020&month=12`;
            await frisby
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

        it('should fail to get availability dates for bad YEAR', async () => {
            const url = `${reservationServiceUrl}/reservation/api/v1/availability/dates?year=202232320&month=12&id=${encodedId}`;
            await frisby
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

        it('should fail to get availability dates for bad Month', async () => {
            const url = `${reservationServiceUrl}/reservation/api/v1/availability/dates?year=2021&month=16&id=${encodedId}`;
            await frisby
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

        it('should fail to get availability dates for bad ID', async () => {
            const url = `${reservationServiceUrl}/reservation/api/v1/availability/dates?year=2020&month=12&id=sdsdss`;
            await frisby
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
    })
}
export {getAvailabilityDates}