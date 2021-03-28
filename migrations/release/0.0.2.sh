#!/bin/bash
ts-node ./migrations/add-display-in-result-flag-to-pcr-results
ts-node ./migrations/fix-deadline-for-future-pcr-results
ts-node ./migrations/remove-pcr-results-for-canceled-appointments
ts-node ./migrations/fix-pcr-organization-id
ts-node ./migrations/update-organization-legacy
ts-node ./migrations/pcr-datetime-to-date
ts-node ./migrations/pcr-add-test-type
ts-node ./migrations/appointments-add-test-type
ts-node ./migrations/migrate-pcr-to-analysis-id
ts-node ./migrations/pcr-add-sort-order
ts-node ./migrations/add-locationName-and-locationAddress-to-appointments
ts-node ./migrations/add-questionnaireid-to-organization
ts-node ./migrations/appointments-add-lab-id
ts-node ./migrations/test-runs-add-lab-id
ts-node ./migrations/transport-runs-add-lab-id