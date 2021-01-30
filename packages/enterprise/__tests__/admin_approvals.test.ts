import {AdminApprovalService} from '../../common/src/service/user/admin-service'

describe('admin tests', () => {
  test('Admin Approval > Find', async () => {
    // Get approval
    const adminApprovalService = new AdminApprovalService()
    const approval = await adminApprovalService.findOneByEmail('sep@stayopn.com')
    console.log(approval)
  })
})
