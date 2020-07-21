import {Mail, MailInfo} from './email-service'

export class MagicLinkMail extends Mail {
    protected templateId: number = 1
}