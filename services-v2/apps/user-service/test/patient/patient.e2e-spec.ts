import {Test, TestingModule} from '@nestjs/testing'
import * as request from 'supertest'
import {App} from '../../src/main'

jest.mock('@opn-services/common/services/firebase/firebase-auth.service')

//TODO: fix post & put scenarios
describe('PatientController (e2e)', () => {
  let app
  const url = '/api/v1/patient'
  const userCreatePayload = {
    email: 'TEST_MAIL@stayopn.com',
    firstName: 'TestName',
    lastName: 'TestLastName',
    registrationId: 'T_111',
    photoUrl: 'photoUrl',
    phoneNumber: '111222333',
    consentFileUrl: 'photoUrl',
    dateOfBirth: '2021-01-01',
    homeAddress: 'Some Avenue 1',
    homeAddressUnit: 'Unit 1',
    city: 'Toronto',
    province: 'Ontario',
    country: 'Canada',
    postalCode: '10200',
    healthCardType: 'health card',
    healthCardNumber: '111222333',
    travelPassport: 'A1234',
    travelCountry: 'France',
    agreeToConductFHHealthAssessment: true,
    shareTestResultWithEmployer: true,
    readTermsAndConditions: true,
    receiveResultsViaEmail: true,
    receiveNotificationsFromGov: true,
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [App],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()
  })

  it('should create patient - / (POST)', async () => {
    return await request(app.getHttpServer())
      .post(url)
      .send(userCreatePayload)
      .expect(200)
  })

  it('should get all patients - / (GET)', async () => {
    return await request(app.getHttpServer())
      .get(url)
      .expect(200)
  })

  it('should get single patient - /:patientId (GET)', async () => {
    return await request(app.getHttpServer())
      .get(`${url}/5bce1233-9aef-4587-a4e0-92f977e0175e`)
      .expect(200)
  })

  it('should update patient - /:patientId (PUT)', async () => {
    return await request(app.getHttpServer())
      .put(`${url}/5bce1233-9aef-4587-a4e0-92f977e0175e`)
      .send({firstName: 'changedName'})
      .expect(200)
  })

  afterAll(async () => {
    await app.close()
  })
})
