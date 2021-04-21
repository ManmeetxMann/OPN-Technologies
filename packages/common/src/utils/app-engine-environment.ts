export const NodeEnV = (): string => process.env.NODE_ENV
export const GAEService = (): string => process.env.GAE_SERVICE ?? 'local' //Only avaiable on Google App ENgine
export const GAEProjectID = (): string => process.env.GOOGLE_CLOUD_PROJECT ?? 'local' //Only avaiable on Google App ENgine
export const isGAEService = (): boolean => GAEService() !== 'local'
