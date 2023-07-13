import { NotFoundException } from '@nestjs/common';
import { User } from 'src/subdomains/user/entities/user.entity';
import { MandatorService } from 'src/subdomains/user/services/mandator.service';
import { UserService } from 'src/subdomains/user/services/user.service';
import { KycDataDto } from '../api/dto/kyc-in.dto';
import { KycInfoDto } from '../api/dto/kyc-out.dto';
import { KycInfoMapper } from '../api/mappers/kyc-info.mapper';

export class KycService {
  constructor(private readonly mandatorService: MandatorService, private readonly userService: UserService) {}

  // --- USER API --- //
  async getKycStatus(mandator: string, reference: string): Promise<KycInfoDto> {
    const user = (await this.userService.get(mandator, reference)) ?? (await this.createUser(mandator, reference));

    return KycInfoMapper.toDto(user);
  }

  async continueKyc(mandator: string, reference: string): Promise<KycInfoDto> {
    const user = await this.findUserOrThrow(mandator, reference);

    // TODO: next step / retry

    return this.saveAndMap(user);
  }

  async updateKycData(mandator: string, reference: string, data: KycDataDto): Promise<KycInfoDto> {
    const user = await this.findUserOrThrow(mandator, reference);

    user.setData(data);

    // TODO: create customer at spider
    // TODO: update user (spiderReference)

    return this.saveAndMap(user);
  }

  async uploadIncorporationCertificate(
    mandator: string,
    reference: string,
    file: Express.Multer.File,
  ): Promise<KycInfoDto> {
    const user = await this.findUserOrThrow(mandator, reference);

    // TODO: update user
    // TODO: update spider

    return this.saveAndMap(user);
  }

  // --- SPIDER SYNC --- //

  // TODO

  // --- HELPER METHODS --- //
  private async findUserOrThrow(mandator: string, reference: string): Promise<User> {
    const user = await this.userService.get(mandator, reference);
    if (!user) throw new NotFoundException('User not found');

    return user;
  }

  private async createUser(mandator: string, reference: string): Promise<User> {
    const mandatorEntity = await this.mandatorService.get(mandator);
    return User.create(mandatorEntity, reference);
  }

  private async saveAndMap(user: User): Promise<KycInfoDto> {
    user = await this.userService.update(user);

    return KycInfoMapper.toDto(user);
  }
}
