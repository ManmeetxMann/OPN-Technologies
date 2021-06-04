import frisby from 'frisby';
import helpersCommon from '../../../../helpers/helpers_common'
import testProfile from '../../../../test_data/test_profile';

// Do setup first
frisby.globalSetup({
  request: {
    headers: helpersCommon.headers(),
  },
});

const enterpriseServiceUrl = process.env.ENTERPRISE_SERVICE_URL;
const organizationId = testProfile.get().organizationId;

/**
 * @group enterprise-service
 * @group /user/connect/v2/add
 * @group create-admin-user-permissions
 */
describe('admin:operations:create', () => {
  test('create Admin Approvals?', () => {
    const url = `${enterpriseServiceUrl}/internal/admin/operations/create`;
    return frisby
        .post(
            url,
            {
              'email': 'gabriel@stayopn.com',
              'organizationId': organizationId,
              'locationIds': [
              ],
              'superAdminForOrganizationIds': [
                organizationId,
              ],
              'healthAdminForOrganizationIds': [
                organizationId,
              ],
              'nfcAdminForOrganizationIds': [
                organizationId,
              ],
              'nfcGateKioskAdminForOrganizationIds': [
                organizationId,
              ],
              'groupIds': [
              ],
              'showReporting': false,
              'isOpnSuperAdmin': false,
              'isManagementDashboardAdmin': true,
              'isTestReportsAdmin': true,
              'isTestAppointmentsAdmin': true,
              'isLabUser': false,
              'isLabAppointmentsAdmin': false,
              'isLabResultsAdmin': false,
              'isTransportsRunsAdmin': false,
              'isReceivingAdmin': false,
              'isTestRunsAdmin': false,
              'isDueTodayAdmin': false,
              'isBulkUploadAdmin': false,
              'isConfirmResultAdmin': false,
              'isPackageAdmin': false,
              'isCheckInAdmin': false,
              'isGenerateAdmin': false,
              'isLookupAdmin': false,
              'isRapidResultSenderAdmin': false,
              'adminForLabIds': [],
              'isClinicUser': false,
              'isOrganizeAdmin': false,
              'isSingleResultSendAdmin': false,
              'isRapidResultOrgAdmin': false,
            },
        )
        .expect('status', 200);
  });
});
