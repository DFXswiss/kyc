import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Country } from './country/country.entity';
import { CountryRepository } from './country/country.repository';
import { CountryService } from './country/country.service';
import { LanguageController } from './language/language.controller';
import { Language } from './language/language.entity';
import { LanguageRepository } from './language/language.repository';
import { LanguageService } from './language/language.service';
import { Setting } from './setting/setting.entity';
import { SettingRepository } from './setting/setting.repository';
import { SettingService } from './setting/setting.service';

@Module({
  imports: [TypeOrmModule.forFeature([Country, Language, Setting])],
  controllers: [LanguageController],
  providers: [
    CountryRepository,
    LanguageRepository,
    SettingRepository,
    CountryService,
    LanguageService,
    SettingService,
  ],
  exports: [CountryService, LanguageService, SettingService],
})
export class MasterDataModule {}
