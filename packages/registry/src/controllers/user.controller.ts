import * as express from 'express'
import { Request, Response } from 'express'
import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'

import Validation from '../../../common/src/utils/validation'

import DataStore from "../../../common/src/data/datastore"
import { RegistrationType, RegistrationModel } from "../../../common/src/data/registration"

class UserController implements IControllerBase 
{
    public path = '/user'
    public router = express.Router()
    
    constructor()
    {
        this.initRoutes()
    }

    public initRoutes() 
    {
        this.router.post(this.path + '/add', this.add)
        this.router.post(this.path + '/addNoPush', this.addNoPush)
    }

    add = async (req: Request, res: Response) => 
    {
        if (!Validation.validate(["registrationToken"], req, res))
        {
            return
        }

        // Add
        // Create DataStore
        const datastore = new DataStore()

        // Create
        const registration = new RegistrationModel(datastore)
    
        // Add
        const id1 = await registration.add({
            type: RegistrationType.User,
            pushToken: req.body.registrationToken
        })


        const response = 
        {
            status : "complete"
        }

        res.json(response);
    }

    addNoPush = (req: Request, res: Response) => 
    {
        const response = 
        {
            status : "complete"
        }

        res.json(response);
    }
}

export default UserController