import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNotEmptyObject,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { EntityDto } from 'src/shared/dto/entity.dto';
import { Util } from 'src/shared/utils/util';
import { IsPhone } from 'src/shared/validators/phone.validator';
import { CountryDto } from 'src/subdomains/master-data/country/dto/country.dto';
import { LanguageDto } from 'src/subdomains/master-data/language/dto/language.dto';
import { AccountType } from '../../enums/user.enum';

export class SettingsDto {
  @ApiProperty({ type: EntityDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => EntityDto)
  language: LanguageDto;
}

export class AddressDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  street: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  houseNumber: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  city: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  zip: string;

  @ApiProperty({ type: EntityDto })
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => EntityDto)
  country: CountryDto;
}

export class KycDataDto {
  @ApiProperty({ enum: AccountType })
  @IsNotEmpty()
  @IsEnum(AccountType)
  accountType: AccountType;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  mail: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @IsPhone()
  @Transform(Util.trim)
  phone: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty({ type: AddressDto })
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;

  @ApiPropertyOptional()
  @ValidateIf(isBusinessAccount)
  @IsNotEmpty()
  @IsString()
  organizationName: string;

  @ApiPropertyOptional({ type: AddressDto })
  @ValidateIf(isBusinessAccount)
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => AddressDto)
  organizationAddress: AddressDto;
}

export function isBusinessAccount(d: KycDataDto) {
  return d.accountType && d.accountType !== AccountType.PERSONAL;
}
