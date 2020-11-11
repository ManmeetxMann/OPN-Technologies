#  [594](https://github.com/OPN-Technologies/services/issues/594) Feature to encrypt/decrypt data of Firestore in client side

## Status

Proposed - 2020/10/26

## Context
We want to encrypt health related data in the client side before writing to Firestore so that 
Firestore users wouldn't be able to see the test result data.
We think that this needs to be extended feature in the DataModel level so that any future data entities can choose fields that needs to be 
encrypted.

**Requirements**
- Any data collection/field can be encryptable/decryptable

- The CRUD operation should be available for the encrypted fields

- The encryption key should be configurable by env variable

## Decision

- We will use symmetric encryption using Node.js crypto builtin library

- We will implement this in the DataModel or add another EncryptedDataModel

- Repositories will be able to extend from this extended DataModel

- The DataModel will have a private array of encryptedFields

- All necessary methods for CRUD and search function of the DataModel will need to implement the
encryption/decryption before/after reading/writing operation to Firestore

- The repositories which need to encrypt fields should define encrypted fields when initializing DataStore

- Other higher layer logic will be the same
