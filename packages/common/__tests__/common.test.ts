
import DataStore from "../src/data/datastore"
import { IdentifiersModel } from "../src/data/identifiers"


test("class instantiates", () => {
    // Create
    const datastore = new DataStore()

    // Test
    expect(datastore)
});


test("create identifier class", () => {
    // Create DataStore
    const datastore = new DataStore()

    // Create Identifier
    const identifier = new IdentifiersModel(datastore)

    // Test initializer
    identifier.reset()
});
