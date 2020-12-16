import {OrganizationGroup} from '../models/organization'

export const dataConversionAndSortGroups = (groups: OrganizationGroup[]): OrganizationGroup[] => {
  return groups
    .sort((a, b) => {
      // if a has higher priority, return a negative number (a comes first)
      const bias = (b.priority || 0) - (a.priority || 0)
      return bias || a.name.localeCompare(b.name, 'en', {numeric: true})
    })
    .map((group) => ({...group, isPrivate: group.isPrivate ?? false}))
}
