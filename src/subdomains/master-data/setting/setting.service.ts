import { Injectable } from '@nestjs/common';
import { Setting } from './setting.entity';
import { SettingRepository } from './setting.repository';

@Injectable()
export class SettingService {
  constructor(private readonly settingRepo: SettingRepository) {}

  async getAll(): Promise<Setting[]> {
    return this.settingRepo.find();
  }

  get(key: string): Promise<string | undefined>;
  get(key: string, defaultValue: string): Promise<string>;

  async get(key: string, defaultValue?: string): Promise<string | undefined> {
    return this.settingRepo.findOneBy({ key }).then((d) => d?.value ?? defaultValue);
  }

  async set(key: string, value: string): Promise<void> {
    await this.settingRepo.save({ key, value });
  }

  getObj<T>(key: string): Promise<T | undefined>;
  getObj<T>(key: string, defaultValue: T): Promise<T>;

  async getObj<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    return this.settingRepo.findOneBy({ key }).then((d) => (d?.value ? JSON.parse(d.value) : defaultValue));
  }

  async setObj<T>(key: string, value: T): Promise<void> {
    await this.settingRepo.save({ key, value: JSON.stringify(value) });
  }
}
