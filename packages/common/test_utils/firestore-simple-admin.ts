export class FieldValue {
  static increment(): FieldValue {
    return new FieldValue()
  }
  static serverTimestamp(): Date {
    return new Date()
  }
}
export class FieldPath {
  constructor(map: string, key: string) {
    if (!key) {
      this.value = map
    } else {
      this.value = key
    }
  }
  public value: string
}
export class Timestamp {}

const collections: Record<string, Record<string, Storable>> = {
  users: {
    sep: {
      id: 'sep',
      uid: 'sep',
      email: 'sep@stayopn.com',
      emailVerified: true,
      name: 'Sep Seyedi',
      displayName: 'Sep Seyedi',
      photoURL: 'www.google.com',
    },
  },
}

type Storable = {
  id: string
  [others: string]: unknown
}
const storableCheck = (item: Record<string, unknown>): item is Storable =>
  typeof item.id === 'string'

class Doc {
  private document: Storable
  constructor(doc: Storable) {
    this.document = doc
  }
  async get() {
    return {
      exists: !!this.document,
    }
  }
  async update(props: Record<string, unknown>): Promise<string> {
    if (!this.document) {
      throw new Error('Document does not exist')
    }
    Object.keys(props).forEach((k) => {
      const val = props[k]
      if (val instanceof FieldValue) {
        // increment, presumably by one
        // eslint-disable-next-line @typescript-eslint/no-extra-semi
        ;(this.document[k] as number) += 1
      } else {
        this.document[k] = val
      }
    })
    return this.document.id
  }
}

class Collection<T> {
  private documents: Record<string, Storable>
  private filters: ((item: Storable) => boolean)[] = []
  constructor(path: string) {
    if (!collections[path]) {
      collections[path] = {}
    }
    this.documents = collections[path]
  }

  doc(id: string): Doc {
    return new Doc(this.documents[id])
  }

  private storify(item: Record<string, unknown>): Storable {
    if (storableCheck(item)) {
      return item
    }
    let id = '1'
    while (Object.keys(this.documents).includes(id)) {
      id = Math.ceil(Math.random() * 1000000000).toString()
    }
    return {
      ...item,
      id,
    }
  }

  async bulkDelete(ids: string[]): Promise<void> {
    ids.forEach((key) => delete this.documents[key])
  }

  async bulkAdd(items: Record<string, unknown>[]): Promise<void> {
    items
      .map(this.storify)
      .filter(({id}) => !Object.keys(this.documents).includes(id))
      .forEach((item) => (this.documents[item.id] = item))
  }

  async addOrSet(item: Storable): Promise<string> {
    const storable = this.storify(item)
    this.documents[storable.id] = this.storify(storable)
    return storable.id
  }

  async set(item: Storable): Promise<string> {
    this.documents[item.id] = item
    return item.id
  }

  async fetch(id?: string): Promise<Storable[] | Storable> {
    if (typeof id !== 'string') {
      return Object.keys(this.documents)
        .filter((key) => this.filters.every((filter) => filter(this.documents[key])))
        .map((key) => this.documents[key])
    }
    if (!Object.keys(this.documents).includes(id)) {
      throw new Error('no such item!' + id)
    }
    return this.documents[id]
  }

  where(key: FieldPath, equals: '==', value: unknown): Collection<T> {
    this.filters.push((item) => item[key.value] === value)
    return this
  }
}

export class FirestoreSimpleMock {
  constructor() {
    // would accept firestore as an arg
  }
  collection<T>({path}: {path: string}): Collection<T> {
    return new Collection<T>(path)
  }
}

// need to mock Collection
// need to mock Query

// allow tests to overwrite and examine
export default collections
