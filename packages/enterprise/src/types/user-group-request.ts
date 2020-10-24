export type ConnectGroupRequest = {
  organizationId: string
  groupId: string
}

export type UpdateGroupRequest = {
  organizationId: string // Won't be necessary once we flatten the sub-collections
  fromGroupId: string
  toGroupId: string
}
