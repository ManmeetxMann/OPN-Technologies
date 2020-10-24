import {ConnectionStatuses} from '../models/user'
import {Middleware} from '../../../common/src/types/middleware'
import {UserService} from '../services/user-service'
import {of} from '../../../common/src/utils/response-wrapper'
import {ResponseStatusCodes} from '../../../common/src/types/response-status'

export const assertHasAuthorityOnDependent: Middleware = (req, res, next): Promise<void> => {
  const {authenticatedUser} = res.locals
  const {dependentId} = req.params
  return new UserService()
    .getDirectDependents(authenticatedUser.id, [ConnectionStatuses.Approved])
    .then((activeDependents) => {
      if (activeDependents.find(({id}) => dependentId === id)) {
        next()
        return
      }

      res
        .status(403)
        .json(
          of(
            null,
            ResponseStatusCodes.AccessDenied,
            `Don't have enough authority on dependent with ID [${dependentId}]`,
          ),
        )
    })
}
