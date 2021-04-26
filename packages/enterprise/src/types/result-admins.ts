import {User} from '../../../common/src/data/user'

type ResultAdminsResponse = {
  id: string
  name: string
  avatar: string
}

export const resultAdminsDTO = (users: User[]): ResultAdminsResponse[] =>
  users.map((user) => ({
    id: user.id,
    name: `${user.firstName} ${user.lastName}`,
    avatar: user.base64Photo,
  }))
