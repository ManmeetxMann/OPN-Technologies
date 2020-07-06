import DataModel from "./datamodel.base"
import { RegistrationType, RegistrationSchema } from "../schemas/registration"


export class RegistrationModel extends DataModel<RegistrationSchema>
{
    readonly rootPath = "registration"
    readonly zeroSet = []
}