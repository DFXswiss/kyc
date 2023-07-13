import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CountryController } from './country/country.controller';
import { Country } from './country/country.entity';
import { CountryRepository } from './country/country.repository';
import { CountryService } from './country/country.service';
import { LanguageController } from './language/language.controller';
import { Language } from './language/language.entity';
import { LanguageRepository } from './language/language.repository';
import { LanguageService } from './language/language.service';

@Module({
  imports: [TypeOrmModule.forFeature([Country, Language])],
  controllers: [CountryController, LanguageController],
  providers: [CountryRepository, LanguageRepository, CountryService, LanguageService],
  exports: [CountryService, LanguageService],
})
export class MasterDataModule {}
