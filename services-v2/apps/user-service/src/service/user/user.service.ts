import {Injectable} from '@nestjs/common'
import {UserFilter} from '../../dto/user'
import {Page} from '@opn/common/dto'
import {ResourceNotFoundException} from '@opn/common/exception'
import {UserRepository} from '../../repository/user.repository'
import {User} from '../../model/user/user.entity'
import {Brackets, SelectQueryBuilder} from 'typeorm'

@Injectable()
export class UserService {
  constructor(private userRepository: UserRepository) {}

  /**
   * Find all users with pagination
   * @param filter
   */
  findAll({query, organizationId, groupId, page, perPage}: UserFilter): Promise<Page<User>> {
    let queryBuilder: SelectQueryBuilder<User> = this.userRepository
      .createQueryBuilder('u')
      .select()
      .leftJoinAndSelect('user_organization', 'uo', 'u.id = uo.userId')
      .where(`uo.organizationId='${organizationId}'`)

    if (groupId) {
      queryBuilder = queryBuilder
        .leftJoinAndSelect('user_group', 'ug', 'u.id = ug.userId')
        .andWhere(`ug.groupId='${groupId}'`)
    }

    if (query) {
      const lower = query.toLowerCase()
      const matches = (property: Partial<keyof User>) => `LOWER(u.${property}) like '%${lower}%'`
      queryBuilder = queryBuilder.andWhere(
        new Brackets((sqb) => {
          sqb.where(matches('firstName'))
          sqb.orWhere(matches('lastName'))
          sqb.orWhere(matches('email'))
        }),
      )
    }

    return queryBuilder
      .limit(perPage)
      .offset(page * perPage)
      .getManyAndCount()
      .then(([data, totalItems]) => Page.of(data, page, perPage, totalItems))
  }

  /**
   * Find one user
   * @param userId
   */
  findOne(userId: string): Promise<User> {
    return this.userRepository.findOne(userId)
  }

  /**
   * Find one user and throw Error if not found
   * @param userId
   * @throws ResourceNotFoundException
   */
  getOne(userId: string): Promise<User> {
    return this.findOne(userId).then((target) => {
      if (target) return target

      throw new ResourceNotFoundException(`Cannot find user [${userId}]`)
    })
  }
}
