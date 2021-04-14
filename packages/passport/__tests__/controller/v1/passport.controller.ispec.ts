import request from 'supertest'
import {app as server} from '../../../src/app'

import {createAttestation, deleteAttestationsById} from '../../__seeds__/attestation'
import {createOrganization, deleteOrgById} from '../../../../reservation/__tests__/__seeds__/organization'
import {createQuestion, deleteQuestionById} from '../../__seeds__/questionnaires'
import {createUser, deleteUserByIdTestDataCreator} from '../../../../reservation/__tests__/__seeds__/user'

jest.spyOn(global.console, 'error').mockImplementation()
jest.spyOn(global.console, 'info').mockImplementation()
jest.mock('../../../../common/src/middlewares/authorization')
jest.mock('../../../../common/src/utils/logging-setup')

const testDataCreator = __filename.split('/packages/')[1]

describe('Passport test suite', () => {
    const dateForCreation = '2020-02-05'
    const attestationId = 'IT_Attestation_1'
    const questionnaireId = 'IT_Questionary_1'
    const organizationId = 'IT_Organization_1'
    const userId = 'IT_User_1'

    beforeAll(async () => {
        await Promise.all([
            createUser({id: userId, organizationIds: [organizationId]}, testDataCreator),
            createOrganization({
                id: organizationId,
                name: '401',
                enableTemperatureCheck: true,
                questionnaireId,
                userIdToAdd: userId,
            }, testDataCreator),
            createQuestion({
                id: questionnaireId
            }, testDataCreator),
            createAttestation({id: attestationId, userId, questionnaireId, organizationId}, testDataCreator)
        ])
    })

    test('Get attestation by ID', async (done) => {
        const url = `passport/api/v1/attestation/${attestationId}`
        const headers = {
            authorization: `bearer bearer_token`,
            organizationId,
        }

        const result = await request(server.app).get(url).set(headers)
        expect(result.status).toBe(200)

        done()
    })

    afterAll(async () => {
        await Promise.all([
            deleteOrgById(organizationId, testDataCreator),
            deleteAttestationsById(attestationId, testDataCreator),
            deleteQuestionById(questionnaireId, testDataCreator),
            deleteUserByIdTestDataCreator(userId, testDataCreator)
        ]) 
    })
})
