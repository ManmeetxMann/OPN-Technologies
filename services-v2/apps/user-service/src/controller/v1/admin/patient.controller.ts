import {Body, Controller, Get, Param, Post, Put, Query, UseGuards} from '@nestjs/common'
import {ApiBearerAuth, ApiTags} from '@nestjs/swagger'

import {ResponseWrapper} from '@opn-services/common/dto/response-wrapper'
import {AuthGuard} from '@opn-services/common/guard'
import {RequiredUserPermission} from '@opn-services/common/types/authorization'
import {UserLogsEvents as events} from '@opn-services/common/types/activity-logs'
import {Roles} from '@opn-services/common/decorator'

import {assignWithoutUndefined, ResponseStatusCodes} from '@opn-services/common/dto'
import {AuthUserDecorator} from '@opn-services/common/decorator'
import {Patient} from '../../../model/patient/patient.entity'
import {
  DependantCreateDto,
  PatientCreateDto,
  PatientFilter,
  PatientUpdateDto,
  patientProfileDto,
} from '../../../dto/patient'
import {PatientService} from '../../../service/patient/patient.service'
import {LogInfo} from '@opn-services/common/utils/logging'
import {BadRequestException, ResourceNotFoundException} from '@opn-services/common/exception'

@ApiTags('Patients - Admin')
@ApiBearerAuth()
@Controller('/api/v1/admin/patients')
@UseGuards(AuthGuard)
export class AdminPatientController {
  constructor(private patientService: PatientService) {}

  @Get()
  @Roles([RequiredUserPermission.OPNAdmin])
  async getAll(@Query() filter: PatientFilter): Promise<ResponseWrapper<Patient[]>> {
    const {data, page, totalItems, totalPages} = await this.patientService.getAll(
      assignWithoutUndefined(filter, new PatientFilter()),
    )

    return ResponseWrapper.of(data, ResponseStatusCodes.Succeed, null, page, totalPages, totalItems)
  }

  @Get('/:patientId')
  @Roles([RequiredUserPermission.OPNAdmin])
  async getById(@Param('patientId') id: string): Promise<ResponseWrapper<PatientUpdateDto>> {
    const patient = await this.patientService.getProfilebyId(id)

    if (!patient) {
      throw new ResourceNotFoundException('User with given id not found')
    }

    return ResponseWrapper.actionSucceed(patientProfileDto(patient))
  }

  @Post()
  @Roles([RequiredUserPermission.OPNAdmin])
  async add(@Body() patientDto: PatientCreateDto): Promise<ResponseWrapper<Patient>> {
    const patientExists = await this.patientService.getAuthByEmail(patientDto.email)

    if (patientExists) {
      throw new BadRequestException('User with given email already exists')
    }

    const patient = await this.patientService.createProfile(patientDto)

    return ResponseWrapper.actionSucceed(patient)
  }

  @Put('/:patientId')
  @Roles([RequiredUserPermission.OPNAdmin])
  async update(
    @AuthUserDecorator() authUser,
    @Param('patientId') id: string,
    @Body() patientUpdateDto: PatientUpdateDto,
  ): Promise<ResponseWrapper> {
    const patientExists = await this.patientService.getbyId(id)

    if (!patientExists) {
      throw new ResourceNotFoundException('User with given id not found')
    }
    const newUser = await this.patientService.updateProfile(id, patientUpdateDto)

    LogInfo(events.update, events.updateProfile, {
      oldUser: patientExists,
      newUser: newUser,
      updatedBy: authUser.id,
    })

    return ResponseWrapper.actionSucceed()
  }

  @Post('/:patientId/dependant')
  @Roles([RequiredUserPermission.OPNAdmin])
  async addDependents(
    @Param('patientId') delegateId: string,
    @Body() dependantBody: DependantCreateDto,
  ): Promise<ResponseWrapper<Patient>> {
    const delegateExists = await this.patientService.getbyId(delegateId)

    if (!delegateExists) {
      throw new ResourceNotFoundException('Delegate with given id not found')
    }

    const dependant = await this.patientService.createDependant(delegateId, dependantBody)

    return ResponseWrapper.actionSucceed(dependant)
  }
}
