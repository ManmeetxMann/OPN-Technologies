import {AdminApprovalService} from '../../common/src/service/user/admin-service'

describe('admin tests', () => {
  test.skip('Admin Approval > Create', async () => {
    // Create
    const adminApprovalService = new AdminApprovalService()
    await adminApprovalService.create({
      email: 'testo2@i239.co',
      enabled: true,
      adminForLocationIds: ['organizations/6J2JhcUIKE3JyagfKCor/locations/7okpD6yrbuZxAeCUukMo'],
      superAdminForOrganizationIds: ['aXHNhWJ5zVAGT1hafXeW'],
    })
  })

  test('Admin Approval > Find', async () => {
    // Get approval
    const adminApprovalService = new AdminApprovalService()
    const approval = await adminApprovalService.findOneByEmail('sep@stayopn.com')
    console.log(approval)
  })
})
