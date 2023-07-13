import { Injectable, NotFoundException } from '@nestjs/common';
import { Config } from 'src/config/config';
import { LanguageService } from 'src/subdomains/master-data/language/language.service';
import { In } from 'typeorm';
import { SettingsDto } from '../api/dto/user-in.dto';
import { UserInfoMapper } from '../api/dto/user-info.mapper';
import { UserInfoDto } from '../api/dto/user-out.dto';
import { User } from '../entities/user.entity';
import { KycStatus } from '../entities/user.enum';
import { UserRepository } from '../repositories/user.repository';
import { MandatorService } from './mandator.service';

@Injectable()
export class UserService {
  constructor(
    private readonly repo: UserRepository,
    private readonly languageService: LanguageService,
    private readonly mandatorService: MandatorService,
  ) {}

  // --- INTERNAL METHODS --- //
  async get(mandator: string, reference: string): Promise<User | null> {
    return this.repo.findOneBy({ mandator: { reference: mandator }, reference });
  }

  async getOrThrow(mandator: string, reference: string): Promise<User> {
    const user = await this.get(mandator, reference);
    if (!user) throw new NotFoundException('User not found');

    return user;
  }
  async getInProgress(): Promise<User[]> {
    return this.repo.findBy({ kycStatus: KycStatus.IN_PROGRESS });
  }

  async getByReferences(mandator: string, references: string[]): Promise<User[]> {
    return this.repo.findBy({ mandator: { reference: mandator }, reference: In(references) });
  }

  async update(user: User): Promise<User> {
    return this.repo.save(user);
  }

  // --- API METHODS --- //
  async getOrCreate(mandator: string, reference: string): Promise<UserInfoDto> {
    const user = (await this.get(mandator, reference)) ?? (await this.createUser(mandator, reference));

    return UserInfoMapper.toDto(user);
  }

  async saveAndMap(user: User): Promise<UserInfoDto> {
    user = await this.update(user);

    return UserInfoMapper.toDto(user);
  }

  async updateSettings(mandator: string, reference: string, settings: SettingsDto): Promise<UserInfoDto> {
    const user = await this.getOrThrow(mandator, reference);

    user.language = await this.languageService.getOrThrow(settings.language.id);

    return this.saveAndMap(user);
  }

  // --- HELPER METHODS --- //

  private async createUser(mandator: string, reference: string): Promise<User> {
    const mandatorEntity = await this.mandatorService.getOrThrow(mandator);
    const languageEntity = await this.languageService.getBySymbolOrThrow(Config.defaultLanguage);

    return User.create(reference, mandatorEntity, languageEntity);
  }
}
