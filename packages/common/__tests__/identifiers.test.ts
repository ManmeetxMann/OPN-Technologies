
import DataStore from "../src/data/datastore"
import { IdentifiersModel } from "../src/data/identifiers"

describe("identifier tests", () => {
    test("identifier > wipe", () => {
        // Create DataStore
        const datastore = new DataStore()
    
        // Create Identifier
        /* const identifier = */new IdentifiersModel(datastore)
    
        // Test wipe
        // identifier.deleteAll()
    });

    test("identifier > reset", async () => {
        // Create DataStore
        const datastore = new DataStore()
    
        // Create Identifier
        const identifier = new IdentifiersModel(datastore)
    
        // Test reset
        identifier.reset()

        expect((await identifier.get("status")).count).toEqual(10000)
        expect((await identifier.get("access")).count).toEqual(10000)
        expect((await identifier.get("attestation")).count).toEqual(10000)
    });
    
    test("identifier > increment", async () => {
        // Create DataStore
        const datastore = new DataStore()
    
        // Create Identifier
        const identifier = new IdentifiersModel(datastore)
    
        // Getting Value
        const id = await identifier.getUniqueValue("status")
        console.log(id)
    
        // Test
        expect(typeof(id)).toBe('string')
        expect(id.length).toBeGreaterThan(5)
    });
})

