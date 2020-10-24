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
- `POST -> /api/v3/users/self/dependents`: Add one or multiple user(s) to the authenticated user
- `PUT -> /api/v3/users/self/dependents/{depId}`: Update a dependent
- `DELETE -> /api/v3/users/self/dependants/{depId}`: Removes a user as a dependent of the authenticated user 

- `POST -> /api/v3/users/self/dependents/{depId}/organizations`: Link a dependent to an organization
- `DELETE -> /api/v3/users/self/dependents/{depId}/organizations/{organizationId}`: Unlink a dependent organization and all the groups within that organization. 
- `POST -> /api/v3/users/self/dependents/{depId}/groups`: Link a dependent to a group
- `PUT -> /api/v3/users/self/dependents/{depId}/groups`: Update a dependent groups

# Util Links
Sequence Diagrams: https://drive.google.com/file/d/1CTESC_2KY5PZTvbB2CLY-eaya3mshjli/view?usp=sharing
Graph: https://drive.google.com/file/d/146Fu6z3SvkmbaHVLqxVk-Ib34I1skZyA/view?usp=sharing

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

  
