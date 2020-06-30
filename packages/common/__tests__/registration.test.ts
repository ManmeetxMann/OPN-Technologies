
import DataStore from "../src/data/datastore"
import { RegistrationModel, RegistrationType } from "../src/data/registration"

describe("registration tests", () => {
    test("registration > init", () => {
        // Create DataStore
        const datastore = new DataStore()
    
        // Create
        const registration = new RegistrationModel(datastore)

    });

    test("registration > reset", async () => {
        // Create DataStore
        const datastore = new DataStore()
    
        // Create Identifier
        const registration = new RegistrationModel(datastore)
    
        // Test reset
        registration.reset()
    });
    
    test("registration > add", async () => {
        // Create DataStore
        const datastore = new DataStore()
    
        // Create
        const registration = new RegistrationModel(datastore)
    
        // Add
        const id1 = await registration.add({
            type: RegistrationType.User,
            pushToken: "S1234567898765431"
        })
        const id2 = await registration.add({
            type: RegistrationType.Admin,
            pushToken: "S1234567898765432"
        })
    });
})

