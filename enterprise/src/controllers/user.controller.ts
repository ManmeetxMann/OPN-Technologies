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

        /**
         * Implementaiton Notes:
         * - Make sure that last name initial is only one character
         * - Ensure that a key is mapped to an org and a location (for now)
         */

        console.log(req.body.key);
        console.log(req.body.photo);
        console.log(req.body.firstName);
        console.log(req.body.lastNameInitial); // TODO: Make sure that this is only one character long
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
                        id: uuid(),
                        orgId: uuid(),
                        title :  "Royal Ontario Museum",
                        address: "100 Queen's Park",
                        address2: "Suite 403",
                        city: "Toronto",
                        state: "Ontario",
                        zip: "M7V 1P9",
                        country: "Canada",
                        divisions: [{
                            id : uuid(),
                            title :  "Floor 1",
                            address: "100 Queen's Park",
                            address2: "Suite 403",
                            city: "Toronto",
                            state: "Ontario",
                            zip: "M7V 1P9",
                            country: "Canada"
                        }, 
                        {
                            id : uuid(),
                            title :  "Floor 2",
                            address: "100 Queen's Park",
                            address2: "Suite 403",
                            city: "Toronto",
                            state: "Ontario",
                            zip: "M7V 1P9",
                            country: "Canada"
                        },
                        {
                            id : uuid(),
                            title :  "Second Building",
                            address: "95 Queen's Park",
                            city: "Toronto",
                            state: "Ontario",
                            zip: "M7V 1P9",
                            country: "Canada"
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