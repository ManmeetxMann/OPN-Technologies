import * as express from 'express'
import {Handler, Router} from 'express'
import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {UserService} from '../../services/user-service'
import {OrganizationService} from '../../services/organization-service'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'
import {authMiddleware} from '../../../../common/src/middlewares/auth'
import {ResourceNotFoundException} from '../../../../common/src/exceptions/resource-not-found-exception'
import {ResourceAlreadyExistsException} from '../../../../common/src/exceptions/resource-already-exists-exception'
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
      throw new ResourceAlreadyExistsException(
        `NFC Tag for the organization ${organizationId} and userId ${userId}: TagId ${tag.id}`,
      )
    }

    const checkIfOrganizationExists = await organizationService.findOneById(organizationId)
    if (!checkIfOrganizationExists) {
      throw new ResourceNotFoundException(`No organization found for this id ${organizationId}`)
    }

    const user = await userService.getById(userId)
    const tagId = await tagService.create(organizationId, user.id)

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

    const [user, userGroup] = await Promise.all([
      userService.getById(tag.userId),
      organizationService.getUserGroup(tag.organizationId, tag.userId),
    ])

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
        .post('/', authMiddleware, addNfcTagId)
        .get('/:tagId/user', authMiddleware, getUserByTagId),
    )

    this.router.use(root, tags)
  }
}

export default AdminTagController
