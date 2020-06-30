
import DataStore from "../src/data/datastore"
import { IdentifiersModel } from "../src/data/identifiers";

test("datastore class instantiates", () => {
    // Create
    const datastore = new DataStore()

    // Test
    expect(datastore)
});