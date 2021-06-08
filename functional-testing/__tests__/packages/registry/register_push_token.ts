import frisby from 'frisby';
import helpersCommon from '../../../helpers/helpers_common';
import testProfile from '../../../test_data/test_profile'

// Do setup first
frisby.globalSetup({
    request: {
        headers: helpersCommon.headers()
    }
});

const registryServiceUrl = process.env.REGISTRY_SERVICE_URL

describe('RegistryController', () => {

    describe('post:/user/add', () => {
        test('Create Push Token.', async () => {
            const url = `${registryServiceUrl}/user/add`
            const data = await frisby
                .post(
                    url,
                    {
                        "osVersion": "9",
                        "platform": "android",
                        //TODO: Dynamic Push Token
                        "pushToken": "ckegZ1-YRbqAL8irS7K54Z:APA91bH4iOTy3jNENzE7TX6x10Miu3BhroAVFwHtyaNN7Jogjj8L_BbFm8wNYD8qs8im2JcXeHfgPvoWQc-byvpPqwWuCmGlTtJxmO_fb2yDKzr1Xb6un4k_FTmBjEZduCoMf3aS1KIG"
                    }
                )
            expect(data.status).toEqual(200)
        })
    })
})