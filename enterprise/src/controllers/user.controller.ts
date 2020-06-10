import * as express from 'express'
import { Request, Response } from 'express'
import IControllerBase from 'interfaces/IControllerBase.interface'
import { request } from 'http'
import { v4 as uuid } from 'uuid';

import Validation from '../utils/validation'


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
        this.router.post(this.path + '/connect/add', this.connect)
        this.router.post(this.path + '/connect/remove', this.disconnect)
        this.router.post(this.path + '/connect/locations', this.connectedLocations)
    }

    connect = (req: Request, res: Response) => 
    {
        if (!Validation.validate(["key", "photo", "firstName", "lastNameInitial", "yearOfBirthIfLessThan18"], req, res))
            // TODO: yearOfBirthIfLessThan18 should be optional
        {
            return
        }

        console.log(req.body.key);
        console.log(req.body.photo);
        console.log(req.body.firstName);
        console.log(req.body.lastNameInitial);
        const response = 
        {
            data : {
                orgId : uuid(),
                connectedToken : uuid()
            },
            status : "complete"
        }

        res.json(response);
    }

    disconnect = (req: Request, res: Response) => 
    {
        if (!Validation.validate(["key"], req, res))
        {
            return
        }

        console.log(req.body.key);
        const response = 
        {
            // data : {
                
            // },
            status : "complete"
        }

        res.json(response);
    }

    connectedLocations = (req: Request, res: Response) => 
    {
        if (!Validation.validate(["connectedToken"], req, res))
        {
            return
        }

        console.log(req.body.connectedToken);
        const response = 
        {
            data : {
                registeredLocations : [
                    {
                        id: "987654321",
                        title :  "Royal Ontario Museum",
                        address: "95 Queen's Park",
                        address2: "Suite 403",
                        city: "Toronto",
                        state: "Ontario",
                        zip: "M7V 1P9",
                        country: "Canada",
                        divisions: [{
                            id : "987654321A",
                            title :  "Floor 1"
                        }, 
                        {
                            id : "987654321B",
                            title :  "Floor 2"
                        }]
                    },
                ]
            },
            status : "complete"
        }

        res.json(response);
    }
}

export default UserController