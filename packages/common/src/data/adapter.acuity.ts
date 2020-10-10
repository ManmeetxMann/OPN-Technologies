import fetch from 'node-fetch'
import {Config} from '../utils/config'
import querystring from 'querystring';

const API_USERNAME = Config.get('ACUITY_SCHEDULER_USERNAME')
const API_PASSWORD = Config.get('ACUITY_SCHEDULER_PASSWORD')
const APIURL = Config.get('ACUITY_SCHEDULER_API_URL')

abstract class AcuityScheduling {
    constructor() {}

    protected async getAppointments(data: querystring.ParsedUrlQueryInput): Promise<unknown> {

        const userPassBuf = new Buffer(API_USERNAME + ":" + API_PASSWORD);
        const userPassBase64 = userPassBuf.toString('base64');
        const apiUrl = APIURL+'/api/v1/appointments?'+querystring.stringify(data)
        console.log('ACUITYURL: '+apiUrl);

        return fetch(apiUrl, {
            method: 'get',
            headers: {
                'Authorization': 'Basic ' + userPassBase64,
                'Content-Type': 'application/json',
                accept: 'application/json'
            },
        })
        .then((res: any) => res.json())
        .catch((error: string) => console.error('error: '+error));
    }
}

export default AcuityScheduling