## OPN - Account management

# Middlewares
## Authentication
- Checks and decode JWT
- Add claims in the request security-context

## Admin context
Runs after authentication middleware. 
- Fetch and assert an active admin profile exists for a given `uid`
- Add authenticated-admin in the request security-context

## User context
Runs after authentication middleware. 
- Fetch and assert an active user profile exists for a given `uid`
- Add authenticated-user in the request security-context

# APIs
## Authentication & Registration:
**Unprotected:**
- `POST -> /api/v3/users`: Creates a user profile with `CreateUserProfileRequest` payload and returns a `User` 
- `POST -> /api/v3/users/auth`: Sends a magic-link to authenticate the user with a `AuthenticationRequest` payload
- `POST -> /api/v3/users/auth/registration-confirmation`: Completes user registration with magic-link information (cf. `RegistrationConfirmationRequest`)

## Profile management:
**User-auth aware:**
- `GET -> /api/v3/users/self`: Gets authenticated user details
- `PUT -> /api/v3/users/self`: Updates authenticated user (only first name, last name and photo. cf `UserUpdateRequest`)

## User organization management:
**User-auth aware:**
- `POST -> /api/v3/users/self/organizations`: Connects the authenticated user to an organization using the org key
- `GET -> /api/v3/users/self/organizations`: Get all the connected organization of the authenticated user
- `DELETE -> /api/v3/users/self/organizations/{orgId}`: Removes the authenticated user from an organization and all the groups within that organization. 
(also consider archiving the created accesses at the organization's location)

## User group management:
**User-auth aware:**
- `GET -> /api/v3/users/self/groups`: Get all the user's connected-groups
- `POST -> /api/v3/users/self/groups`: Connects the authenticated user to a group
- `DELETE -> /api/v3/users/self/groups/{groupId}`: Removes the authenticated user from a group

Note: `Groups` would need to be part of an outer collection and refer to an organization
 
## User dependencies:
- `GET -> /api/v3/users/self/dependents`: Gets the authenticated user's direct dependents
- `GET -> /api/v3/users/self/parents`: Gets the authenticated user's parents
- `POST -> /api/v3/users/self/dependents`: Links one or multiple user(s) to the authenticated user (Link strategy to be defined)
- `PUT -> /api/v3/users/self/dependents/{depId}`: Update a dependent
- `DELETE -> /api/v3/users/self/dependants/{depId}`: Removes a user as a dependent of the authenticated user 
- `POST -> /api/v3/users/self/dependents/{depId}/organizations`: Link a dependent to an organization
- `DELETE -> /api/v3/users/self/dependents/{depId}/organizations/{organizationId}`: Unlink a dependent organization and all the groups within that organization. 
- `POST -> /api/v3/users/self/dependents/{depId}/groups`: Link a dependent to a group
- `PUT -> /api/v3/users/self/dependents/{depId}/groups`: Update a dependent groups

## User search
- `POST -> /api/v3/users/search`: Find a user by `firstName`, `lastName`, `organizationId` and `identifier`   

## Admin requests:
**Admin-auth aware:**
- `POST -> /api/v3/users`: Create a user profile
- `GET -> /api/v3/users/{id}`: Gets a user profile
- `PUT -> /api/v3/users/{id}`: Updates any property of a user
- `GET -> /api/v3/users/{id}/dependents`: Gets the direct-dependents of a user 
- `GET -> /api/v3/users/{id}/parents`: Gets the parents of a user

# Schemas

## Profile

### Models
```typescript
type User = Auditable & {
  id: string
  firstName: string
  lastName: string
  active: boolean
 
  // Optional
  email?: string
  photo?: string // photo url
  phone?: Phone
}
```
```typescript
type UserDependency = Auditable & {
  id: string  // Can be either generated or a concat of userId and parentUserId
  userId: string
  parentUserId: string
}
```
```typescript
type UserOrganization = Auditable & {
  id: string
  userId: string
  organizationId: string
  status: 'pending'|'approved'|'rejected'
}
```
```typescript
type Admin = Auditable & {
  id: string
  email: string
}
```

### Requests
```typescript
type CreateUserProfileRequest = {
  
  email: string
  firstName: string
  lastName: string
  
  // Optional
  id?: string
  photo?: string //url
  phone?: Phone
}
```
```typescript
type UserUpdateRequest = {
  firstName?: string
  lastName?: string
  photo?: string
}
```
```typescript
type AuthenticationRequest = {
  email: string
}
```
```typescript
type RegistrationConfirmationRequest = {
  // TODO
}
```

## Common
```typescript
type Auditable = {
  createdAt: Date   // TBD: either a timestamp or ISO-8601 date-time without timezone (eg. 2020-10-07T01:40:06.000Z)
  updatedAt: Date   // TBD: either a timestamp or ISO-8601 date-time without timezone (eg. 2020-10-07T01:40:06.000Z)
  updatedBy: string // userId or adminId
}

type Phone = {
  diallingCode: number // International calling code
  number: number
}
```

# Workflow
## Registration
1. Create user profile
eg.
```bash
curl --location --request POST 'http://localhost:5003/api/v3/users' \
--header 'Content-Type: application/json' \
--data-raw '{
    "email": "lyrold+10@stayopn.com",
    "firstName": "Lyrold10",
    "lastName": "Careto10"
}'
```
Response
```json
{
    "data": {
        "id": "FKAxpBY7Y3b4kajFaP6k",
        "active": false,
        "firstName": "Lyrold12",
        "lastName": "Careto12",
        "email": "lyrold+12@stayopn.com",
        "identifier": "lyrold+12@stayopn.com",
        "photo": null,
        "authUserId": null
    },
    "status": {
        "code": "succeed",
        "message": null
    }
}
```
2. Use verification email to confirm email and extract id-token

3. Complete registration to activate user account
eg. 
```bash
curl --location --request POST 'http://localhost:5003/api/v3/users/auth/registration-confirmation' \
--header 'Content-Type: application/json' \
--data-raw '{
    "userId": "FKAxpBY7Y3b4kajFaP6k",
    "idToken": "eyJhbG...."
}'
```
Response:
```json
{
    "data": {
        "id": "FKAxpBY7Y3b4kajFaP6k",
        "lastName": "Careto10",
        "authUserId": "pOC6y2qEdRgbgJX7omjX0U0Wcni1",
        "identifier": "lyrold+10@stayopn.com",
        "active": true,
        "email": "lyrold+10@stayopn.com",
        "firstName": "Lyrold10",
        "photo": null
    },
    "status": {
        "code": "succeed",
        "message": null
    }
}
```
==> The user is now active and linked to an external-auth ID

# TODO
- Write a workflow for connecting dependents

- Support pre-loaded users API
- Support pre-loaded users matcher key at org or request level

- admin API to approve user relation with organization
- admin API to approve user relation with another user

- add remove user API

- Support Access & Passport v2 APIs
- Support Stats v2 APIs
- Design Permission management 

- /internal/api middleware
- /internal/api create users 
- /internal/api create admins

- Anonymous user - Support `identityRequired` flag to an Organization  
- Anonymous user - Handle `identityRequired` flag when connecting to an organization  
- Anonymous user - Handle `identityRequired` flag when operating from an organization  


- if two organizations share the same questionnaire, 
the user status should be the same for both organizations

- Rule engine for questionnaire attestation

  
