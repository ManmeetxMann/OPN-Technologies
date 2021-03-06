import * as express from 'express'
import {Handler, Router} from 'express'
import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {UserService} from '../../services/user-service'
import {OrganizationService} from '../../services/organization-service'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'
import {authorizationMiddleware} from '../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../common/src/types/authorization'
import {ResourceNotFoundException} from '../../../../common/src/exceptions/resource-not-found-exception'
import {NfcTagService} from '../../../../common/src/service/hardware/nfctag-service'
import {CreateNfcTagRequest} from '../../../../common/src/types/nfc-tag-request'

const userService = new UserService()
const tagService = new NfcTagService()
const organizationService = new OrganizationService()

/**
 * Creates a NFC tag and returns tagId
 */
const addNfcTagId: Handler = async (req, res, next): Promise<void> => {
  try {
    const {organizationId, userId} = req.body as CreateNfcTagRequest

    const tag = await tagService.getByOrgUserId(organizationId, userId)
    if (tag) {
      res.json(actionSucceed(tag))
      return
    }

    const checkIfOrganizationExists = await organizationService.findOneById(organizationId)
    if (!checkIfOrganizationExists) {
      throw new ResourceNotFoundException(`No organization found for this id ${organizationId}`)
    }

    const user = await userService.getById(userId)
    const tagId = await tagService.create(organizationId, user.id)

    res.json(actionSucceed(tagId))
  } catch (error) {
    next(error)
  }
}

/**
 * Get user details by tagId
 */
const getUserByTagId: Handler = async (req, res, next): Promise<void> => {
  try {
    const {tagId} = req.params
    const {legacyMode} = req.query as {legacyMode?: boolean}

    const tag =
      legacyMode === true ? await tagService.getByLegacyId(tagId) : await tagService.getById(tagId)
    if (!tag) {
      throw new ResourceNotFoundException(`NFC tag not found with tagId: ${tagId}`)
    }

    const [user, userGroup] = await Promise.all([
      userService.getById(tag.userId),
      organizationService.getUserGroup(tag.organizationId, tag.userId),
    ])

    res.json(
      actionSucceed({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        // @ts-ignore
        photo: user.photo ?? user.base64Photo,
        groupName: userGroup.name,
      }),
    )
  } catch (error) {
    next(error)
  }
}

class AdminTagController implements IControllerBase {
  public router = express.Router()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = () => Router({mergeParams: true})
    const root = '/enterprise/admin/api/v3/tags'

    const tags = innerRouter().use(
      '/',
      innerRouter()
        .post('/', authorizationMiddleware([RequiredUserPermission.OrgAdmin], true), addNfcTagId)
        .get(
          '/:tagId/user',
          authorizationMiddleware([RequiredUserPermission.OrgAdmin], false),
          getUserByTagId,
        ),
    )

    this.router.use(root, tags)
  }
}

export default AdminTagController
