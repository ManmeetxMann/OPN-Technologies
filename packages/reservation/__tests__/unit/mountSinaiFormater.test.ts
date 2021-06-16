import MountSinaiSchema from '../../src/dbschemas/mount-sinai-result.schema'
import {MountSinaiFormater} from '../../src/utils/mount-sinai-formater'
import moment from 'moment'
import {Gender, TestTypes, ThirdPartySyncSource} from '../../src/models/appointment'
import {firestore} from 'firebase-admin'

describe('Mount Sinai', () => {
  test('mount sinai formatter', (done) => {
    const data = {
      patientCode: 'FH000001', //FA...
      barCode: 'A11111',
      dateTime: firestore.Timestamp.fromDate(new Date()),
      firstName: 'test',
      lastName: 'test',
      healthCard: 'test',
      dateOfBirth: moment(new Date()).toISOString(),
      gender: Gender.Male,
      address1: 'test',
      address2: 'test',
      city: 'test',
      province: 'test',
      postalCode: 'A1A1A1',
      country: 'test',
      testType: TestTypes.PCR,
      source: ThirdPartySyncSource.ConfirmatoryRequest
    }

    const mountSinaiFormater = new MountSinaiFormater(data)
    const formatedORMData = mountSinaiFormater.get()
    MountSinaiSchema.validateAsync(formatedORMData)
      .then(() => {
        done()
      })
      .catch(() => {
        throw new Error('Data is not valid')
      })
  })
})
