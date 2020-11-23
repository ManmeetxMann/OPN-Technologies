import fetch from 'node-fetch'
import {Config} from '../../utils/config'

const MFAX_TOKEN = Config.get('MFAX_TOKEN')

export class FaxService {  
    async send(
        toNumber: string,
        data: string,
        filename: string
    ): Promise<void> {        
        fetch({
            method: 'POST',
            url: 'https://api.documo.com/v1/faxes',
            headers: {
                Authorization: `Basic ${MFAX_TOKEN}`,
                'content-type': 'multipart/form-data'
            },
            formData: {
                // callerId: fromNumber,
                faxNumber: toNumber,
                /** Make sure boolean coverPage passed as string, since formData only accepts string or Buffer. */
                coverPage: 'false',
                subject: 'COVID-19 Positive Report',
                attachments: {
                    value: new Blob([data], {type : 'application/json'}),
                    options: {
                        filename,
                        contentType: 'application/pdf'
                    }
                }
            }
        })
    }
}