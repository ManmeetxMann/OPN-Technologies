import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {NextFunction, Request, Response, Router} from 'express'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'
import {AppoinmentService} from '../../../services/appoinment.service'
import {PackageService} from '../../../services/package.service'
import {ScheduleWebhookRequest} from '../../../models/webhook'
import {ResourceNotFoundException} from '../../../../../common/src/exceptions/resource-not-found-exception'
import {isEmpty} from 'lodash'
import {AcuityUpdateDTO} from '../../../models/appoinment'
import {TestResultsService} from '../../../services/test-results.service'
import {app} from "../../../../../registry/src/server";

class WebhookController implements IControllerBase {
    public path = '/acuity_webhook'
    public router = Router()
    private appoinmentService = new AppoinmentService()
    private packageService = new PackageService()
    private testResultsService = new TestResultsService()

    constructor() {
        this.initRoutes()
    }

    public initRoutes(): void {
        this.router.post(this.path + '/api/v1/appointment/create', this.handleScheduleWebhook)
    }

    handleScheduleWebhook = async (
        req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> => {
        try {
            const {id} = req.body as ScheduleWebhookRequest

            const appointment = await this.appoinmentService.getAppointmentById(id)

            if (!appointment) {
                throw new ResourceNotFoundException(`Appointment with ${id} id not found`)
            }

            const dataForUpdate: AcuityUpdateDTO = {}

            if (!appointment.barCode) {
                dataForUpdate['barCodeNumber'] = await this.appoinmentService.getNextBarCodeNumber()
            }

            if (appointment.packageCode && !appointment.organizationId) {
                const packageResult = await this.packageService.getByPackageCode(appointment.packageCode)

                if (packageResult) {
                    dataForUpdate['organizationId'] = packageResult.organizationId
                } else {
                    console.log(
                        `WebhookController: NoPackageToORGAssoc AppoinmentID: ${id} -  PackageCode: ${appointment.packageCode}`,
                    )
                }
            }

            if (!isEmpty(dataForUpdate)) {
                console.log(
                    `WebhookController: SaveToAcuity AppoinmentID: ${id} barCodeNumber: ${JSON.stringify(
                        dataForUpdate,
                    )}`,
                )
                await this.appoinmentService.updateAppointment(id, dataForUpdate)
            } else {
                console.log(
                    `WebhookController: NoUpdateToAcuity AppoinmentID: ${id} barCodeNumber: ${appointment.barCode}  organizationId: ${appointment.organizationId}`,
                )
            }

            try {
                await this.testResultsService.saveAppoinmentDataToTestResults({
                    ...appointment,
                    appointmentId: id,
                    id: appointment.barCode,
                });
            } catch (e) {
                console.log(
                    `WebhookController: SaveToTestResults Failed AppoinmentID: ${id} barCodeNumber: ${JSON.stringify(
                        dataForUpdate,
                    )}`)
            }

            res.json(actionSucceed(''))
        } catch (error) {
            next(error)
        }
    }
}

export default WebhookController
