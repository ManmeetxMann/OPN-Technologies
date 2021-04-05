import {ApiModelPropertyOptional} from '@nestjs/swagger/dist/decorators/api-model-property.decorator'

export class Page<T> {
  data: T[]
  page: number
  perPage: number
  totalPages: number
  totalItems: number

  static of<T>(data: T[], page: number, perPage: number, totalItems: number): Page<T> {
    return {
      data,
      page,
      perPage,
      totalItems,
      totalPages: Math.ceil(totalItems / perPage),
    } as Page<T>
  }
}

export class PageableRequestFilter {
  @ApiModelPropertyOptional()
  page?: number = 0

  @ApiModelPropertyOptional()
  perPage?: number = 100

  @ApiModelPropertyOptional()
  query?: string = null

  static of(page?: number, perPage?: number, query?: string) {
    const filter = new PageableRequestFilter()

    if (page) filter.page = page

    if (perPage) filter.perPage = perPage

    if (query) filter.query = query

    return filter
  }
}
