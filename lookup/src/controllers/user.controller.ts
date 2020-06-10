import * as express from 'express'
import { Request, Response } from 'express'
import IControllerBase from 'interfaces/IControllerBase.interface'
import { request } from 'http'

import Validation from '../utils/validation'


class UserController implements IControllerBase 
{
    public path = ''
    public router = express.Router()
    
    constructor()
    {
        this.initRoutes()
    }

    public initRoutes() 
    {
        this.router.post(this.path + '/locations/list', this.getAll)
        this.router.post(this.path + '/attestation/get', this.getAttestationConfig)
    }

    getAll = (req: Request, res: Response) => 
    {
        if (!Validation.validate(["longitude", "latitude"], req, res))
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
                ],
                publicLocations : [
                    {
                        id: "987654321",
                        title :  "Royal Ontario Museum",
                        address: "95 Queen's Park",
                        address2: "Suite 403",
                        city: "Toronto",
                        state: "Ontario",
                        zip: "M7V 1P9",
                        country: "Canada",
                        divisions: []
                    },
                    {
                        id: "987654321",
                        title :  "Royal Ontario Museum",
                        address: "95 Queen's Park",
                        address2: "Suite 403",
                        city: "Toronto",
                        state: "Ontario",
                        zip: "M7V 1P9",
                        country: "Canada",
                        divisions: []
                    },
                ]
            },
            morePagedContent: true, // TODO: paging
            status : "complete"
        }

        res.json(response);
    }

    getAttestationConfig = (req: Request, res: Response) => 
    {
        if (!Validation.validate(["locationId"], req, res))
        {
            return
        }

        console.log(req.body.locationId);
        const response = 
        {
            data : {
                questions : {
                    1 : {
                        question : "Are you experiencing any new symptoms of COVID-19 (e.g. new onset shortness of breath, new onset cough, sore throat, fever, runny nose or feeling unwell)?",
                        answer: "boolean"
                    },
                    2 : {
                        question : "Have you traveled outside of Canada in the last 14 days?",
                        answer: "boolean"
                    },
                    3 : {
                        question : "Have you been in close contact with a person with acute respiratory illness or has confirmed COVID-19 in the past 14 days?",
                        answer: "boolean"
                    },
                    4 : {
                        question : "Have you answered yes to one of the above questions, but already contacted public health and determined you are not at risk for COVID-19 and/or do not ...",
                        answer: "boolean"
                    }
                }
            },
            status : "complete"
        }

        res.json(response);
    }
}

export default UserController