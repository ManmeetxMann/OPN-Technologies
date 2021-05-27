export class CaptchaService {
  async verify(_: string): Promise<boolean> {
    return true
  }
}
