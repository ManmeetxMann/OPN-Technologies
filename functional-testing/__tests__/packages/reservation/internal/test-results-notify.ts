/*
 * Test Result Notification via Email
 * PreRequiste: Appointment and Result Created Successfully
 */
import frisby from 'frisby'
import helpersCommon from '../../../../helpers/helpers_common'
import testProfile from '../../../../test_data/test_profile'

// Do setup first
frisby.globalSetup({
    request: {
        headers: helpersCommon.headers()
    }
});
const reservationServiceUrl = process.env.RESERVATION_SERVICE_URL
/**
 * @group reservation-service
 * @group /reservation/internal/api/v1/test-result/notify-by-email
 * @group test-result-notify-by-email
 */
describe('test results notify-by-email', () => {
    test('Succcessfully notify by email', async () => {
        const url = `${reservationServiceUrl}/reservation/internal/api/v1/test-result/notify-by-email`
        const data = {
            id: 'J3xibYMIbBaFhDIxm7S3',
            result: 'Positive',
            date: '2021-07-11',
            userId: 'string',
            organizationId: 'string',
            actionType: 'SendThisResult',
            phone: 'string',
            firstName: 'string',
        }
        const base64data = Buffer.from(JSON.stringify(data)).toString('base64')
        const response = await frisby
            .post(
                url,
                {
                    message: {
                        data: base64data,
                    }
                }
            )
        expect(response.status).toEqual(200)
    })
})