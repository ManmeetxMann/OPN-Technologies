import fetch from 'node-fetch'

export interface MailInfo {
    email: string,
    name?: string,
    parameters: any
}

export abstract class Mail {
    private recipient: MailInfo
    private static readonly APIKEY = "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"
    
    protected abstract templateId : number

    constructor(recipient: MailInfo) {
        this.recipient = recipient
    }

    async send() {
        const email = {
            to: [{
                email: this.recipient.email,
                name: this.recipient.name
            }],
            templateId: this.templateId,
            params: this.recipient.parameters,
            // headers: {
            //     'X-Mailin-custom': 'custom_header_1:custom_value_1|custom_header_2:custom_value_2'
            // }
        }

        // FYI: Their Node and Typescript libraries are garbage!

        await fetch('https://api.sendinblue.com/v3/smtp/email', {
            method: 'post',
            body: JSON.stringify(email),
            headers: {'Content-Type': 'application/json', 'accept': 'application/json', 'api-key': Mail.APIKEY}
        });
        // const json = await response.json();
        // console.log(json)
    }
}
