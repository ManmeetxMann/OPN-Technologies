import {ApiPropertyOptional} from '@nestjs/swagger'
import {IsOptional} from 'class-validator'

export class Page<T> {
  data: T[]
  page: number
  perPage: number
  totalPages: number
  totalItems: number

  // eslint-disable-next-line max-params
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
  @ApiPropertyOptional()
  @IsOptional()
  page?: number = 1

  @ApiPropertyOptional()
  @IsOptional()
  perPage?: number = 100

  @ApiPropertyOptional()
  @IsOptional()
  query?: string = null

  static of(page?: number, perPage?: number, query?: string): PageableRequestFilter {
    const filter = new PageableRequestFilter()

    if (page) filter.page = page

    if (perPage) filter.perPage = perPage

    if (query) filter.query = query

    return filter
  }
}
