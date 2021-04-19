import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  NotFoundException,
  Query,
} from '@nestjs/common'
import {ApiTags} from '@nestjs/swagger'
import {ResponseWrapper} from '@opn-services/common/dto/response-wrapper'
import {assignWithoutUndefined, ResponseStatusCodes} from '@opn-services/common/dto'
import {Patient} from '../../../model/patient/patient.entity'
import {
  PatientCreateDto,
  PatientFilter,
  patientProfileDto,
  PatientUpdateDto,
} from '../../../dto/patient'
import {PatientService} from '../../../service/patient/patient.service'
import {FirebaseAuthService} from '@opn-services/common/services/auth/firebase-auth.service'

@ApiTags('Patients')
@Controller('/api/v1/patient')
//TODO: auth & track updatedBy
export class PatientController {
  constructor(
    private patientService: PatientService,
    private firebaseAuthService: FirebaseAuthService,
  ) {}

  @Get()
  async getAll(@Query() filter: PatientFilter): Promise<ResponseWrapper<Patient[]>> {
    const {data, page, totalItems, totalPages} = await this.patientService.getAll(
      assignWithoutUndefined(filter, new PatientFilter()),
    )

    return ResponseWrapper.of(data, ResponseStatusCodes.Succeed, null, page, totalPages, totalItems)
  }

  @Get('/:patientId')
  async getById(@Param('patientId') id: string): Promise<ResponseWrapper<PatientUpdateDto>> {
    const patient = await this.patientService.getProfilebyId(id)

    if (!patient) {
      throw new NotFoundException('User with given id not found')
    }

    return ResponseWrapper.actionSucceed(patientProfileDto(patient))
  }

  @Post()
  async add(@Body() patientDto: PatientCreateDto): Promise<ResponseWrapper<Patient>> {
    const patientExists = await this.firebaseAuthService.getUserByEmail(patientDto.email)

    if (patientExists) {
      throw new BadRequestException('User with given email already exists')
    }

    const patient = await this.patientService.createProfile(patientDto)

    return ResponseWrapper.actionSucceed(patient)
  }

  @Put('/:patientId')
  async update(
    @Param('patientId') id: string,
    @Body() patientUpdateDto: PatientUpdateDto,
  ): Promise<ResponseWrapper> {
    const patientExists = await this.patientService.getbyId(id)

    if (!patientExists) {
      throw new NotFoundException('User with given id not found')
    }

    await this.patientService.updateProfile(id, patientUpdateDto)

    return ResponseWrapper.actionSucceed()
  }
}
