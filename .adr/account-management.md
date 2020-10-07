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
- Fetch and assert an active admin profile exists for a given `uid`
- Add authenticated-user in the request security-context

# APIs
## Authentication & Registration:
**Unprotected:**
- `POST -> /api/v1/users`: Creates a user profile with `CreateUserProfileRequest` payload and returns a `User` 
- `POST -> /api/v1/users/auth`: Sends a magic-link to authenticate the user with a `AuthenticationRequest` payload

**user-auth aware:**
- `POST -> /api/v1/users/self/registration-confirmation`: Completes user registration with magic-link information (cf. `RegistrationConfirmationRequest`)

## Profile management:
**User-auth aware:**
- `GET -> /api/v1/users/self`: Gets authenticated user details
- `PUT -> /api/v1/users/self`: Updates authenticated user (only first name, last name and photo. cf `UserUpdateRequest`)

## User organization management:
**User-auth aware:**
- `POST -> /api/v1/users/self/organizations`: Connects the authenticated user to an organization using the org key
- `GET -> /api/v1/users/self/organizations`: Get all the connected organization of the authenticated user
- `DELETE -> /api/v1/users/self/organizations/{orgId}`: Removes the authenticated user from an organization and all the groups within that organization. 
(also consider archiving the created accesses at the organization's location)

## User group management:
**User-auth aware:**
- `POST -> /api/v1/users/self/groups`: Connects the authenticated user to a group
- `DELETE -> /api/v1/users/self/groups/{groupId}`: Removes the authenticated user from a group

Note: `Groups` would need to be part of an outer collection and refer to an organization
 
## User dependencies:
- `GET -> /api/v1/users/self/dependents`: Gets the authenticated user's direct dependents
- `GET -> /api/v1/users/self/parents`: Gets the authenticated user's parents
- `POST -> /api/v1/users/self/dependents`: Links one or multiple user(s) to the authenticated user (Link strategy to be defined)
- `DELETE -> /api/v1/users/self/dependants/{depId}`: Removes a user as a dependant of the authenticated user 

## Admin requests:
**Admin-auth aware:**
- `GET -> /api/v1/users/{id}`: Gets a user profile
- `PUT -> /api/v1/users/{id}`: Updates any property of a user
- `GET -> /api/v1/users/{id}/dependents`: Gets the direct-dependents of a user 
- `GET -> /api/v1/users/{id}/parents`: Gets the parents of a user

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
