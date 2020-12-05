import DataStore from '../../data/datastore'
import {NfcTagRepository} from '../../repository/tag.repository'
import {NfcTag, NfcTagIdentifier} from '../../data/nfcTag'
import {DataModelFieldMapOperatorType} from '../../data/datamodel.base'
import {IdentifiersModel} from '../../data/identifiers'

export class NfcTagService {
  private tagRepository = new NfcTagRepository(new DataStore())
  private identifier = new IdentifiersModel(new DataStore())

  create(organizationId: string, userId: string): Promise<NfcTagIdentifier> {
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
        return {tagId: tag.id, legacyTagId: tag.legacyId}
      })
  }

  getById(tagId: string): Promise<NfcTag> {
    return this.tagRepository.get(tagId)
  }

  async getByLegacyId(legacyId: string): Promise<NfcTag> {
    const query = this.tagRepository
      .collection()
      // @ts-ignore
      .where('legacyId', '==', legacyId)

    const tags = await query.fetch()

    return tags.length > 0 ? tags[0] : null
  }

  getByOrgUserId(organizationId: string, userId: string): Promise<NfcTagIdentifier> {
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
        const nfcTag = nfcTags[0]
        return {tagId: nfcTag.id, legacyTagId: nfcTag.legacyId}
      })
  }
}
