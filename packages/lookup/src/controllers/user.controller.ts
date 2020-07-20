import * as express from 'express'
import { Request, Response } from 'express'
import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
import { v4 as uuid } from 'uuid';

import Validation from '../../../common/src/utils/validation'


class UserController implements IControllerBase 
{
    public path = ''
    public router = express.Router()
    
    constructor()
    {
        this.initRoutes()
    }

    public initRoutes(): void
    {
        this.router.post(this.path + '/locations/list', this.getAll)
        this.router.post(this.path + '/attestation/get', this.getAttestationConfig)
    }

    getAll = (req: Request, res: Response): void => 
    {
        if (!Validation.validate(["connectedToken"], req, res))
        {
            return
        }

        console.log(req.body.longitude);
        console.log(req.body.latitude);
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
                        attestation: true,
                        divisions: [{
                            id : uuid(),
                            title :  "Floor 1",
                            address: "100 Queen's Park",
                            address2: "Suite 403",
                            city: "Toronto",
                            state: "Ontario",
                            zip: "M7V 1P9",
                            country: "Canada",
                            attestation: true
                        }, 
                        {
                            id : uuid(),
                            title :  "Floor 2",
                            address: "100 Queen's Park",
                            address2: "Suite 403",
                            city: "Toronto",
                            state: "Ontario",
                            zip: "M7V 1P9",
                            country: "Canada",
                            attestation: true
                        },
                        {
                            id : uuid(),
                            title :  "Second Building",
                            address: "95 Queen's Park",
                            city: "Toronto",
                            state: "Ontario",
                            zip: "M7V 1P9",
                            country: "Canada",
                            attestation: true
                        }]
                    }
                ],
                publicLocations : [
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
                        divisions: [],
                        attestation: true
                    },
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
                        divisions: [],
                        attestation: true
                    },
                ]
            },
            morePagedContent: true, // TODO: paging
            serverTimestamp: (new Date()).toISOString(),
            status : "complete"
        }

        res.json(response);
    }

    getAttestationConfig = (req: Request, res: Response): void => 
    {
        if (!Validation.validate(["statusToken", "locationId"], req, res))
        {
            return
        }

        console.log(req.body.locationId);
        const response = 
        {
            data : {
                // id: uuid(),
                attestation: true, // TODO: Can be true or false
                questions : {
                    1 : {
                        question : "Are you experiencing any new symptoms of COVID-19 (e.g. new onset shortness of breath, new onset cough, sore throat, fever, runny nose or feeling unwell)?",
                        answer: {1: "boolean"}
                    },
                    2 : {
                        question : "Have you traveled outside of Canada in the last 14 days?",
                        answer: {1: "boolean"}
                    },
                    3 : {
                        question : "Have you been in close contact with a person with acute respiratory illness or has confirmed COVID-19 in the past 14 days?",
                        answer: {1: "boolean"}
                    },
                    4 : {
                        question : "Have you answered yes to one of the above questions, but already contacted public health and determined you are not at risk for COVID-19 and/or do not ...",
                        answer: {1: "boolean", 2: "datetime"}
                    }
                }
            },
            serverTimestamp: (new Date()).toISOString(),
            status : "complete"
        }

        res.json(response);
    }
}

export default UserController