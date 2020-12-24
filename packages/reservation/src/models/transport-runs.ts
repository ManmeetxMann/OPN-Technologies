export type TransportRunsDbModel = {
    id: string
    transportRunId: string
    transportDateTime: string
    driverName: string
}

export type TransportRunsIdentifier = {
    id: string
    transportRunId: string
}

export const TransportRunsDTOResponse = (
    transportRun: TransportRunsDbModel
) => ({
    transportRunId: transportRun.transportRunId,
    transportDateTime: transportRun.transportDateTime,
    driverName: transportRun.driverName,
})