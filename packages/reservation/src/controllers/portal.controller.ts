import {Request, Response, Router} from 'express'

import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'

import {AppoinmentService} from '../services/appoinment.service'
import {AppointmentDTO} from '../models/appoinment'
import * as _ from 'lodash'

class PortalController implements IControllerBase {
  public path = '/admin'
  public router = Router()
  private appoinmentService = new AppoinmentService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    this.router.get(this.path + '/page/appointment-by-bar-code', this.displayFormToEnterBarCode)
    this.router.post(this.path + '/page/appointment-by-bar-code', this.displayFormToEnterBarCode)
  }

  displayFormToEnterBarCode = async (req: Request, res: Response): Promise<void> => {
    const {barCodeNumber} = req.body
    try {
      if (_.isEmpty(barCodeNumber)) {
        throw new BadRequestException('Please provide Bar Code Number')
      }
      const appointment: AppointmentDTO = await this.appoinmentService.getAppoinmentByBarCode(
        barCodeNumber,
      )
      res.render('bar_code_form', {
        barCodeNumber: barCodeNumber,
        firstName: appointment.firstName,
        lastName: appointment.lastName,
        email: appointment.email,
        phone: appointment.phone,
      })
    } catch (err) {
      res.render('bar_code_form', {
        barCodeNumber: barCodeNumber,
        invalidBarCodeNumber: true,
      })
    }
  }
}

export default PortalController
