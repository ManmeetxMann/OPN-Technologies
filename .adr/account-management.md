# Workflow:
## Authentication & registration
### Net new user 
Mobile:
- Fetch organization by key: `GET -> /api/v1/organizations/one?key={orgKey}`
- Init user's profile: `POST -> /api/v3/users \d {email, firstName, lastName, photo, organizationId}`

`Note: This steps requires to have one same screen with email/firstname/lastname, photo inputs`

Server:
- Check if email already used
- Check if organization.id exists
- Create user profile with email, first name and last name
- Trigger magic-link with `email`, `organizationId` embedded in query-param
- Return created user

User:
- Click magic-link

Mobile: 
- Extract `email` and `organizationId` from query param     
- Retrieve credentials (`idToken` and `refreshToken`) with firebase auth SDK
- Save credentials `[{email, idToken, refreshToken}]` on device 
- Complete registration: `POST -> /api/v3/users/auth/confirmation \d {email, idToken, organizationId}`

Server:
- Verify id-token
- Fetch user by email
- Fetch organization by id
- Activate user and link with `authUserId`
- Connect to the organization
- Return updated user 

Mobile:
- Display success state
- Go to main screen

### Existing user
Mobile:
- Fetch organization by key: `GET -> /api/v1/organizations/one?key={orgKey}`
- Fetch all the locally-stored emails

User:
- Select or add a new email if none found

Mobile: 
- Trigger magic-link: `POST -> /api/v3/users/auth \d {userId, email, organizationId}`

Server: 
- Trigger magic-link with `userId`, `email`, `organizationId` embedded in query-param

User: 
- Click on magic-link

Mobile:
- Extract `userId`, `email` and `organizationId` from query param     
- Retrieve credentials (`idToken` and `refreshToken`) with firebase auth SDK
- Save or update credentials `[{email, idToken, refreshToken}]` on device 
- Complete registration: `POST -> /api/v3/users/auth/confirmation \d {email, idToken, organizationId, userId}`

Server:
- Verify id-token
- Fetch user by ID
- Fetch organization by id
- Activate user and link it with `email` and `authUserId`
- Connect to the organization
- Return updated user

Mobile:
- Display success state
- Go to main screen

### Main screen
On load for the selected organization:
- Fetch groups: `GET -> /api/v3/users/self/groups?organizationId`
- If group found sends user to subsequent screen (eg. Dashboard)
- Else:
    - fetch groups in org: `GET -> /api/organizations/{orgId}/groups/public`
    - request user to connect to a group: `POST -> /api/v3/users/self/groups \d {organizationId, groupId}` 

```
Note: 
That requires to have one screen where user selects groups. 

Having a separate screen for connecting a group also prevents the user to miss connecting a group, 
in case it closes the app and come back, we make sure the user has a group before moving forward in the experience
```

- Fetch dependents
- Fetch for an active test-results
- Fetch active attestation 
- If attestation found and status is `proceed` look for an active access
