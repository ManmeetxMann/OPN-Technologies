import {v4 as uuidv4} from 'uuid'

const commonHeaders = {
  'opn-device-id': 'jest-test',
  'opn-source': 'Admin_Dashboard',
  'opn-request-id': uuidv4(),
  'opn-lang': 'en',
  'opn-app-version': '0.0.1',
}

export {commonHeaders}
