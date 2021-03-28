#!/bin/bash
ts-node ./migrations/add-private-field-to-groups
ts-node ./migrations/migrate-dependants
ts-node ./update-admin-approval-emails
ts-node ./update-user-emails
ts-node ./add-orgId-to-attestations
ts-node ./relocate-auth-id
ts-node ./remove-admin-auth-id
ts-node ./update-organizationids-for-users
ts-node ./trim-firstname-lastname-and-fix-last-name
ts-node ./add-questionnaireid-to-attestation
ts-node ./test-results-to-pcr
ts-node ./acuity-to-appointments
ts-node ./acuity-to-pcr-results
