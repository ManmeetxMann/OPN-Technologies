import * as express from 'express'
import {Handler, Router} from 'express'
import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {UserService} from '../../services/user-service'
import {OrganizationService} from '../../services/organization-service'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'
import {User} from '../../models/user'
import {ResourceNotFoundException} from '../../../../common/src/exceptions/resource-not-found-exception'
import {ResourceAlreadyExistsException} from '../../../../common/src/exceptions/resource-already-exists-exception'
import {NfcTagService} from '../../services/nfctag-service'
import {CreateNfcTagRequest} from '../../types/nfc-tag-request'

const userService = new UserService()
const tagService = new NfcTagService()
const organizationService = new OrganizationService()

/**
 * Creates a NFC tag and returns tagId
 */
const addNfcTagId: Handler = async (req, res, next): Promise<void> => {
  try {
    const {organizationId, userId} = req.query as CreateNfcTagRequest

    const tag = await tagService.getByOrgUserId(organizationId, userId)
    if (tag) {
      throw new ResourceAlreadyExistsException(
        `NFC Tag for the organization ${organizationId} and userId ${userId}: TagId ${tag.id}`,
      )
    }

    const tagId = await tagService.create(organizationId, userId)

    res.json(
      actionSucceed({
        tagId,
      }),
    )
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

    const tag = await tagService.getById(tagId)
    if (!tag) {
      throw new ResourceNotFoundException(`NFC tag not found with tagId: ${tagId}`)
    }

    const user: User = await userService.getById(tag.userId)
    const userGroup = await organizationService.getUserGroup(tag.organizationId, tag.userId)

    res.json(
      actionSucceed({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        photo: user.photo,
        groupName: userGroup.name,
      }),
    )
  } catch (error) {
    next(error)
  }
}

class AdminController implements IControllerBase {
  public router = express.Router()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = () => Router({mergeParams: true})
    const root = '/admin/api/v3/'

    const tags = innerRouter().use(
      '/',
      innerRouter()
        .post('/tags', addNfcTagId)
        .get('/tags/:tagId/user', getUserByTagId),
    )

    this.router.use(root, tags)
  }
}

export default AdminController
