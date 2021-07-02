export interface MailAppointmentDataModel {
  confirmed_date: string
  location: string
  street: string
  country: string
  address_n_zip: string
  note: string
  subtotal: string
  shipping: string
  total: string
  billing_name: string
  billing_note: string
  billing_address: string
  contact_name: string
  contact_email: string
  contact_phone: string
  ending_with: string
}

export interface TestData {
  name: string
  location: string
  patname: string
  date: string
  quantity: number
  total: string
}
