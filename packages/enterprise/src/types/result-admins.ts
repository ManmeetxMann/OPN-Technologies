import {User} from '../../../common/src/data/user'

type ResultAdminsResponse = {
  id: string
  name: string
}

export const resultAdminsDTO = (users: User[]): ResultAdminsResponse[] =>
  users.map((user) => ({
    id: user.id,
    name: `${user.firstName} ${user.lastName}`,
}))
