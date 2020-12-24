import IControllerBase from "../../../../common/src/interfaces/IControllerBase.interface";
import {Handler, Router} from "express";
import {adminAuthMiddleware} from "../../../../common/src/middlewares/admin.auth";
import {TransportRunsService} from "../../services/transport-runs.service";
import {actionSucceed} from "../../../../common/src/utils/response-wrapper";
import {TransportRunsDTOResponse} from "../../models/transport-runs";

class TransportRunsController implements IControllerBase {
    public path = '/reservation/admin/api/v1/transport-runs'
    public router = Router()
    private transportRunsService = new TransportRunsService()


    constructor() {
        this.initRoutes()
    }

    public initRoutes(): void {
        const innerRouter = Router({mergeParams: true})
        innerRouter.get(this.path + '/', this.listTransportRun)
        innerRouter.post(this.path + '/', this.createTransportRun)

        this.router.use('/', innerRouter)
    }

    createTransportRun:Handler = async (req, res, next): Promise<void> => {
        try {
            const {transportDateTime, driverName} = req.body as {transportDateTime: string, driverName: string}

            const transportRuns = await this.transportRunsService.create(transportDateTime, driverName)

            res.json(
                actionSucceed({
                    transportRunId: transportRuns.id,
                }),
            )
        } catch (error) {
            next(error)
        }
    }
    listTransportRun:Handler = async (req, res, next): Promise<void> => {
        try {
            const {transportDate} = req.query as {transportDate: string}

            const transportRuns = await this.transportRunsService.getByDate(transportDate);

            res.json(
                actionSucceed(transportRuns.map(TransportRunsDTOResponse)),
            )
        } catch (error) {
            next(error)
        }
    }
}

export default TransportRunsController;