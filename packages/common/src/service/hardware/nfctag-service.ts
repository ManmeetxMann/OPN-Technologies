import DataStore from '../../data/datastore'
import {NfcTagRepository} from '../../repository/tag.repository'
import {NfcTag} from '../../data/nfcTag'
import {DataModelFieldMapOperatorType} from '../../data/datamodel.base'
import {IdentifiersModel} from '../../data/identifiers'

export class NfcTagService {
  private tagRepository = new NfcTagRepository(new DataStore())
  private identifier = new IdentifiersModel(new DataStore())

  create(organizationId: string, userId: string): Promise<string> {
    return this.identifier
      .getUniqueId('nfcId')
      .then((nfcId) => {
        return this.tagRepository.add({
          organizationId,
          userId,
          legacyId: nfcId,
        })
      })
      .then((tag: NfcTag) => {
        return tag.id
      })
  }

  getById(tagId: string): Promise<NfcTag> {
    return this.tagRepository.get(tagId)
  }

  getByOrgUserId(organizationId: string, userId: string): Promise<NfcTag> {
    return this.tagRepository
      .findWhereEqualInMap([
        {
          map: '/',
          key: 'organizationId',
          operator: DataModelFieldMapOperatorType.Equals,
          value: organizationId,
        },
        {
          map: '/',
          key: 'userId',
          operator: DataModelFieldMapOperatorType.Equals,
          value: userId,
        },
      ])
      .then((nfcTags: NfcTag[]) => {
        if (!nfcTags || nfcTags.length === 0) return null
        return nfcTags[0]
      })
  }
}
