import {Middleware} from '../../../common/src/types/middleware'
import {of} from '../../../common/src/utils/response-wrapper'
import {ResponseStatusCodes} from '../../../common/src/types/response-status'
import {AdminProfile} from '../../../common/src/data/admin'
import {User} from '../../../common/src/data/user'

export const adminOrSelf: Middleware = (req, res, next): Promise<void> => {
  const {userId, parentUserId} = req.query
  const {organizationId} = req.params
  const authenticatedUser = res.locals.connectedUser as User
  let error = ''
  if (authenticatedUser.admin) {
    // if they are an admin, it must for for this organization
    if ((authenticatedUser.admin as AdminProfile).adminForOrganizationId !== organizationId) {
      error = `Only an admin for organization ${organizationId} can make this request`
    }
  } else {
    // if they are a regular user, they must be asking about themself or their dependant
    if ((parentUserId || userId) !== authenticatedUser.id) {
      error = `Only user ${parentUserId || userId} can make this request`
    }
  }
  if (!error) {
    next()
    return
  }
  const deniedResponse = of(null, ResponseStatusCodes.AccessDenied, error)
  res.status(403).json(deniedResponse)
}
