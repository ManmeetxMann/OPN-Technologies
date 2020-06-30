import DataStore from "./datastore";
import { HasId, OptionalIdStorable, Storable } from "@firestore-simple/admin/dist/types"

abstract class DataModel<T extends HasId>
{
    abstract readonly rootPath: string
    protected abstract readonly zeroSet: Array<Storable<T>>
    private datastore : DataStore

    constructor(datastore: DataStore)
    {
        this.datastore = datastore
    }

    /**
     * Resets the collection
     */
    reset() : void
    {
        // Add all intial values
        for (const record of this.zeroSet)
        {
            // Create
            this.update(record)
        }
    }

    /**
     * Adds data to the collection
     * @param data Data to add - id does not need to be present.
     */
    async add(data: OptionalIdStorable<T>) : Promise<string>
    {
        const dao = this.datastore.firestoreSimple.collection<T>({ path: this.rootPath })
        const id = await dao.add(data)
        return id
    }

    /**
     * Updates data in the collection
     * @param data Data to update – id property must be present
     */
    async update(data: Storable<T>) : Promise<void>
    {
        const dao = this.datastore.firestoreSimple.collection<T>({ path: this.rootPath })
        await dao.set(data)
    }
}

export default DataModel