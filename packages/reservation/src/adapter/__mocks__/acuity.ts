import {BadRequestException} from '../../../../common/src/exceptions/bad-request-exception'
import {Config} from '../../../../common/src/utils/config'

//import {AcuityAvailableSlots} from '../../models/acuity'
import {AppointmentAcuityResponse, DeadlineLabel, Gender} from '../../models/appointment'
import {AppointmentTypes} from '../../models/appointment-types'
import {Calendar} from '../../models/calendar'
import {AcuityAvailableSlots} from '../../models/acuity'
//import {AcuityCouponCodeResponse} from '../../models/coupons'
import {Certificate} from '../../models/packages'
import {CouponCheckResponse, DiscountTypes} from '../../models/coupons'

type AppointmentAcuityFormField = {
  fieldID: number
  value: string
}

type AppointmentAcuityForm = {
  values: Array<AppointmentAcuityFormField>
}

type LabelsAcuityResponse = {
  id: number
  name: string
  color: string
}

export type RawAcuityResponse = {
  appointmentTypeID: number
  calendar: string
  calendarID: number
  canceled: boolean
  canClientCancel: boolean
  certificate: string
  date: string
  datetime: string
  email: string
  firstName: string
  forms: Array<AppointmentAcuityForm>
  id: number
  labels: LabelsAcuityResponse[]
  lastName: string
  location: string
  phone: string
  time: string
}

const dataSuccess = {
  id: 535235625,
  firstName: 'TESTFNAME',
  lastName: 'TESTLNAME',
  phone: '0954145424',
  email: 'pavel+1@stayopn.com',
  date: 'February 27, 2021',
  time: '12:00pm',
  endTime: '12:30pm',
  dateCreated: 'February 26, 2021',
  datetimeCreated: '2021-02-26T13:39:19-0600',
  datetime: '2021-02-27T12:00:00-0500',
  price: '45.00',
  priceSold: '45.00',
  paid: 'no',
  amountPaid: '0.00',
  type: 'Consultation',
  appointmentTypeID: 19422018,
  classID: null,
  addonIDs: [],
  category: '',
  duration: '30',
  calendar: 'Milton Area Clinic',
  calendarID: 4764795,
  certificate: null,
  confirmationPage:
    'https://app.acuityscheduling.com/schedule.php?owner=20901096&action=appt&id%5B%5D=d300df9ce521abf78c570e370f7e51eb',
  location: 'Milton',
  notes: '',
  timezone: 'America/Toronto',
  calendarTimezone: 'America/Toronto',
  canceled: false,
  canClientCancel: false,
  canClientReschedule: false,
  labels: [
    {
      id: 4508822,
      name: 'NextDay',
      color: 'yellow',
    },
  ],
  forms: [
    {
      id: 1567398,
      name: '',
      values: [
        {
          id: 1630276643,
          fieldID: 8637043,
          value: '4-11-1989',
          name: 'Date Of Birth',
        },
      ],
    },
    {
      id: 1657549,
      name: 'Health Card (Optional)',
      values: [
        {
          id: 1630276644,
          fieldID: 9158796,
          value: '123',
          name: 'OHIP',
        },
      ],
    },
    {
      id: 1564839,
      name: 'Internal Details',
      values: [
        {
          id: 1630276645,
          fieldID: 8622334,
          value: 'TEST10000220',
          name: 'Bar code Id',
        },
        {
          id: 1630276646,
          fieldID: 8622344,
          value: '',
          name: 'Nurse',
        },
        {
          id: 1630276647,
          fieldID: 8842033,
          value: '',
          name: 'Organization Id',
        },
        {
          id: 1630276648,
          fieldID: 8981060,
          value: '',
          name: 'Please upload your agreement',
        },
        {
          id: 1630276649,
          fieldID: 9158271,
          value: '',
          name: 'Swab Method',
        },
      ],
    },
    {
      id: 1644637,
      name: 'Home Address',
      values: [
        {
          id: 1630276650,
          fieldID: 9082854,
          value: '123',
          name: 'Home Address',
        },
        {
          id: 1630276651,
          fieldID: 9082855,
          value: '123',
          name: 'Home Address (Unit Number etc.)',
        },
      ],
    },
    {
      id: 1657461,
      name: 'Travel Details',
      values: [
        {
          id: 1630276652,
          fieldID: 9158228,
          value: '123',
          name: 'Travel ID',
        },
        {
          id: 1630276653,
          fieldID: 9158231,
          value: '123',
          name: 'Travel ID Issuing Country',
        },
      ],
    },
    {
      id: 1644640,
      name: 'Terms & Conditions',
      values: [
        {
          id: 1630276654,
          fieldID: 9082890,
          value: 'yes',
          name: 'I read and accept the terms and conditions above',
        },
        {
          id: 1630276655,
          fieldID: 9082891,
          value: 'yes',
          name:
            'I accept to receive my results at the email specified above (only way possible right now)',
        },
        {
          id: 1630276656,
          fieldID: 9082892,
          value: 'yes',
          name:
            'I agree to conduct the FH Health self-assessment screening questionnaire the day of and prior to my appointment.  Questionnaire: https://www.fhhealth.ca/selfassessment-screening',
        },
        {
          id: 1630276657,
          fieldID: 9082893,
          value: 'yes',
          name:
            'I  agree to receiving communication from FH Health regarding government updates, new requirements and advancements in COVID-19 screening tests',
        },
      ],
    },
    {
      id: 1649724,
      name: '',
      values: [
        {
          id: 1630276658,
          fieldID: 9112802,
          value: 'yes',
          name:
            'I agree and permit FH Health to provide the results of my SARS-Cov-2 screening test with my employer (including HR personnel and/or Covid coordinator)  via email for the sole purpose of ensuring employee safety within the workplace',
        },
      ],
    },
  ],
  formsText:
    'Name: Max Pain\nPhone: 0954145424\nEmail: pavel+1@stayopn.com\nPrice: $45.00\n\nLocation\n============\nMilton\n\n\n\n============\nDate Of Birth: 4-11-1989\n\n\n\nHealth Card (Optional)\n============\nOHIP: 123\n\n\n\nInternal Details\n============\nBar code Id: TEST10000220\n\nNurse: \n\nOrganization Id: \n\nPlease upload your agreement: \n\nSwab Method: \n\n\n\nHome Address\n============\nHome Address: 123\n\nHome Address (Unit Number etc.): 123\n\n\n\nTravel Details\n============\nTravel ID: 123\n\nTravel ID Issuing Country: 123\n\n\n\nTerms & Conditions\n============\nI read and accept the terms and conditions above: yes\n\nI accept to receive my results at the email specified above (only way possible right now): yes\n\nI agree to conduct the FH Health self-assessment screening questionnaire the day of and prior to my appointment.  Questionnaire: https://www.fhhealth.ca/selfassessment-screening: yes\n\nI  agree to receiving communication from FH Health regarding government updates, new requirements and advancements in COVID-19 screening tests: yes\n\n\n\n\n============\nI agree and permit FH Health to provide the results of my SARS-Cov-2 screening test with my employer (including HR personnel and/or Covid coordinator)  via email for the sole purpose of ensuring employee safety within the workplace: yes\n\n',
  isVerified: false,
  scheduledBy: null,
}

abstract class AcuityAdapter {
  /*
  protected async cancelAppointmentOnAcuityService(id: number): Promise<AppointmentAcuityResponse> {
    return
  }

  protected async updateAppointmentOnAcuityService(
    id: number,
    fields: unknown,
  ): Promise<AppointmentAcuityResponse> {
    return Promise.resolve(this.customFieldsToAppoinment(dataSuccess))
  }

  protected async updateAppointmentLabelOnAcuityService(
    id: number,
    label: DeadlineLabel,
  ): Promise<AppointmentAcuityResponse> {
    return
  }
  */
  protected async getAppointmentByIdFromAcuityService(
    id: number,
  ): Promise<AppointmentAcuityResponse> {
    if (id === 100) {
      throw new BadRequestException('Invalid')
    }
    return Promise.resolve(this.customFieldsToAppoinment(dataSuccess))
  }

  protected async getPackagesFromAcuityService(): Promise<Certificate[]> {
    return
  }

  protected async getAppointmentTypes(): Promise<AppointmentTypes[]> {
    return
  }

  protected async getCalendars(): Promise<Calendar[]> {
    return
  }
  /*
  protected async createCouponCodeOnAcuityService(
    couponID: number,
    emailToLockCoupon: string,
  ): Promise<AcuityCouponCodeResponse> {
    return
  }

  protected async getAvailabilityDatesList(
    appointmentTypeID: number,
    month: string,
    calendarID: number,
    timezone: string,
  ): Promise<{date: string}[]> {
    return
  }
  */

  protected async createAppointmentOnAcuityService(
    datetime: string,
    appointmentTypeID: number,
    firstName: string,
    lastName: string,
    email: string,
    phone: string,
    certificate: string,
    calendarID: number,
    // fields: Record<string, string | boolean>,
  ): Promise<AppointmentAcuityResponse> {
    return {
      address: 'string',
      addressUnit: 'string',
      agreeToConductFHHealthAssessment: true,
      appointmentTypeID,
      barCode: 'string',
      calendar: 'string',
      calendarID: calendarID,
      canceled: false,
      canClientCancel: true,
      canClientReschedule: true,
      certificate,
      date: 'string',
      dateOfBirth: 'string',
      datetime,
      email,
      firstName,
      lastName,
      gender: Gender.PreferNotToSay,
      id: Math.floor(100000 + Math.random() * 90000),
      labels: [
        {
          id: 1,
          name: DeadlineLabel.NextDay,
          color: 'green',
        },
      ],
      ohipCard: 'string',
      organizationId: 'PUBLIC_ORG_ID',
      location: 'string',
      phone: '111222333',
      postalCode: '1112223',
      readTermsAndConditions: true,
      receiveNotificationsFromGov: true,
      receiveResultsViaEmail: true,
      shareTestResultWithEmployer: true,
      agreeCancellationRefund: true,
      hadCovidConfirmedOrSymptoms: false,
      hadCovidConfirmedOrSymptomsDate: '',
      hadCovidExposer: false,
      hadCovidExposerDate: '',
      forms: [],
      time: '2021-05-02T08:10:00-0400',
      swabMethod: 'string',
      registeredNursePractitioner: '',
      travelID: 'string',
      travelIDIssuingCountry: 'string',
      city: 'string',
      province: 'string',
      country: 'string',
    }
  }

  protected async checkCouponCode(
    certificate: string,
    appointmentTypeID: number,
  ): Promise<CouponCheckResponse> {
    return {
      id: 1,
      certificate,
      couponID: 'string',
      appointmentTypeIDs: [appointmentTypeID],
      productIDs: ['ProductIds'],
      name: 'Appointments Coupon - 10$',
      type: 'appointments',
      expiration: null,
      discountType: DiscountTypes.price,
      discountAmount: 10,
    }
  }

  protected async getAvailableSlotsList(
    _: number,
    __: string,
    ___: number,
    ____: string,
  ): Promise<AcuityAvailableSlots[]> {
    return [
      {time: '2021-05-02T08:05:00-0400', slotsAvailable: 2},
      {time: '2021-05-02T08:10:00-0400', slotsAvailable: 2},
      {time: '2021-05-02T08:15:00-0400', slotsAvailable: 2},
      {time: '2021-05-02T08:20:00-0400', slotsAvailable: 2},
    ]
  }

  private customFieldsToAppoinment(
    rawAcuityAppointment: RawAcuityResponse,
  ): AppointmentAcuityResponse {
    // @ts-ignore
    const appointment: AppointmentAcuityResponse = {
      ...rawAcuityAppointment,
      barCode: '',
      dateOfBirth: '',
      organizationId: null,
      registeredNursePractitioner: '',
      address: '',
      addressUnit: '',
      agreeToConductFHHealthAssessment: false,
      readTermsAndConditions: false,
      receiveResultsViaEmail: false,
      shareTestResultWithEmployer: false,
      receiveNotificationsFromGov: false,
      agreeCancellationRefund: false,
      hadCovidConfirmedOrSymptoms: false,
      hadCovidConfirmedOrSymptomsDate: '',
      hadCovidExposer: false,
      hadCovidExposerDate: '',
      swabMethod: 'Deep Nasal',
      ohipCard: '',
      travelIDIssuingCountry: '',
      travelID: '',
    }

    if (Array.isArray(appointment.forms)) {
      appointment.forms.forEach((form) => {
        form.values.some((field) => {
          if (field.fieldID == Number(Config.get('ACUITY_FIELD_DATE_OF_BIRTH'))) {
            appointment.dateOfBirth = field.value
          }
          if (field.fieldID == Number(Config.get('ACUITY_FIELD_NURSE_NAME'))) {
            appointment.registeredNursePractitioner = field.value
          }
          if (field.fieldID == Number(Config.get('ACUITY_FIELD_BARCODE'))) {
            appointment.barCode = field.value
          }
          if (field.fieldID == Number(Config.get('ACUITY_FIELD_ORGANIZATION_ID'))) {
            appointment.organizationId = field.value
          }
          if (field.fieldID == Number(Config.get('ACUITY_FIELD_ADDRESS'))) {
            appointment.address = field.value
          }
          if (field.fieldID == Number(Config.get('ACUITY_FIELD_ADDRESS_UNIT'))) {
            appointment.addressUnit = field.value
          }
          if (field.fieldID == Number(Config.get('ACUITY_FIELD_SHARE_TEST_RESULT_WITH_EMPLOYER'))) {
            appointment.shareTestResultWithEmployer = field.value === 'yes'
          }
          if (field.fieldID == Number(Config.get('ACUITY_FIELD_READ_TERMS_AND_CONDITIONS'))) {
            appointment.readTermsAndConditions = field.value === 'yes'
          }
          if (field.fieldID == Number(Config.get('ACUITY_FIELD_RECEIVE_RESULTS_VIA_EMAIL'))) {
            appointment.receiveResultsViaEmail = field.value === 'yes'
          }
          if (field.fieldID == Number(Config.get('ACUITY_FIELD_RECEIVE_NOTIFICATIONS_FROM_GOV'))) {
            appointment.receiveNotificationsFromGov = field.value === 'yes'
          }
          if (
            field.fieldID ==
            Number(Config.get('ACUITY_FIELD_AGREE_TO_CONDUCT_FH_HEALTH_ACCESSMENT'))
          ) {
            appointment.agreeToConductFHHealthAssessment = field.value === 'yes'
          }
          if (field.fieldID == Number(Config.get('ACUITY_FIELD_AGREE_CANCELLATION_REFUND'))) {
            appointment.agreeCancellationRefund = field.value === 'yes'
          }
          if (field.fieldID == Number(Config.get('ACUITY_FIELD_HAD_COVID_CONFIRMED'))) {
            appointment.hadCovidConfirmedOrSymptoms = field.value === 'yes'
          }
          if (field.fieldID == Number(Config.get('ACUITY_FIELD_HAD_COVID_CONFIRMED_DATE'))) {
            appointment.hadCovidConfirmedOrSymptomsDate = field.value
          }
          if (field.fieldID == Number(Config.get('ACUITY_FIELD_HAD_COVID_EXPOSURE'))) {
            appointment.hadCovidExposer = field.value === 'yes'
          }
          if (field.fieldID == Number(Config.get('ACUITY_FIELD_HAD_COVID_EXPOSURE_DATE'))) {
            appointment.hadCovidExposerDate = field.value
          }
          if (field.fieldID == Number(Config.get('ACUITY_FIELD_TRAVEL_ID'))) {
            appointment.travelID = field.value
          }
          if (field.fieldID == Number(Config.get('ACUITY_FIELD_TRAVEL_ID_ISSUEING_COUNTRY'))) {
            appointment.travelIDIssuingCountry = field.value
          }
          if (field.fieldID == Number(Config.get('ACUITY_FIELD_OHIP_CARD')) && field.value) {
            appointment.ohipCard = field.value
          }
          if (field.fieldID == Number(Config.get('ACUITY_FIELD_SWAB_METHOD'))) {
            if (!!field.value) {
              appointment.swabMethod = field.value
            }
          }
        })
      })
    }
    return appointment
  }
}

export default AcuityAdapter
