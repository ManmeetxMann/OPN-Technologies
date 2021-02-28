const frisby = require('frisby');
const helpersCommon = require('helpers_common');
const testProfile = require('test_profile');

// Do setup first
frisby.globalSetup({
	request: {
		headers:  helpersCommon.headers()
	}
});

const enterpriseServiceUrl = process.env.ENTERPRISE_SERVICE_URL
const organizationId = testProfile.get().organizationId

/**
 * @group enterprise-service
 * @group /user/connect/v2/add
 * @group create-admin-user-permissions
 */
describe('admin:operations:create', () => {
    test('create Admin Approvals?',  () => {
        const url = `${enterpriseServiceUrl}/internal/admin/operations/create`
            return frisby
                .post(
                    url,
                    {
                        "email": 'harpreet+13@stayopn.com',
                        "organizationId": organizationId,
                        "locationIds": [
                        ],
                        "superAdminForOrganizationIds": [
                            organizationId
                        ],
                        "healthAdminForOrganizationIds": [
                        ],
                        "nfcAdminForOrganizationIds": [
                        ],
                        "nfcGateKioskAdminForOrganizationIds": [
                        ],
                        "groupIds": [
                        ],
                        "showReporting": false,
                        "isOpnSuperAdmin": false,
                        "isManagementDashboardAdmin": true,
                        "isTestReportsAdmin": true,
                        "isTestAppointmentsAdmin": true,
                        "isLabUser": false,
                        "isLabAppointmentsAdmin": false,
                        "isLabResultsAdmin": false,
                        "isTransportsRunsAdmin": false,
                        "isReceivingAdmin": false,
                        "isTestRunsAdmin": false,
                        "isDueTodayAdmin": false,
                        "isBulkUploadAdmin": false,
                        "isConfirmResultAdmin": false,
                        "isPackageAdmin": false,
                        "isCheckInAdmin": false,
                        "isGenerateAdmin": false,
                        "isLookupAdmin": false,
                        "isRapidResultSenderAdmin": false,
                        "adminForLabIds": [],
                        "isIDBarCodesAdmin": false,
                        "isSingleResultSendAdmin": false
                    }
                )
                .expect('status', 200); 
    })
})
