import {CorsOptions} from '@nestjs/common/interfaces/external/cors-options.interface'
import {envConfig} from '@opn-common-v1/env-config'

/**
 * Should use v1 config module since v2 is not initiated before all server launch
 */
const config = envConfig()
const dashboardUrl = config['DASHBOARD_URL'] as string
const devDashboardUrl = config['DEV_DASHBOARD_URL'] as string

if (!dashboardUrl) {
  console.error('No DASHBOARD_URL defined')
}

const allowedOrigins = [dashboardUrl]
if (devDashboardUrl) {
  allowedOrigins.push(devDashboardUrl)
}

export const corsOptions: CorsOptions = {
  origin: allowedOrigins,
  methods: 'GET,PUT,POST,DELETE',
}
