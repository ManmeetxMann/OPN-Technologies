import {nanoid} from 'nanoid'
import {applyDecorators} from '@nestjs/common'
import {ApiHeader} from '@nestjs/swagger'
import {OpnLang, OpnRawHeaders, OpnSources} from '../types/authorization'

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function ApiCommonHeaders() {
  return applyDecorators(
    ApiHeader({
      name: OpnRawHeaders.OpnDeviceId,
      required: true,
      schema: {
        default: nanoid(),
      },
    }),

    ApiHeader({
      name: OpnRawHeaders.OpnSource,
      required: true,
      enum: OpnSources,
      schema: {
        default: OpnSources.FH_RapidHome_Web,
      },
    }),

    ApiHeader({
      name: OpnRawHeaders.OpnRequestId,
      required: true,
      schema: {
        default: nanoid(),
      },
    }),

    ApiHeader({
      name: OpnRawHeaders.OpnLang,
      required: true,
      enum: OpnLang,
      schema: {
        default: OpnLang.en,
      },
    }),

    ApiHeader({
      name: OpnRawHeaders.OpnAppVersion,
      required: true,
      schema: {
        default: '1.0.0',
      },
    }),
  )
}
