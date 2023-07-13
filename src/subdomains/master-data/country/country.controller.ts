import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { GetJwt } from 'src/shared/auth/get-jwt.decorator';
import { JwtPayload } from 'src/shared/auth/jwt-payload.interface';
import { MandatorService } from 'src/subdomains/user/services/mandator.service';
import { CountryService } from './country.service';
import { CountryDtoMapper } from './dto/country-dto.mapper';
import { CountryDto } from './dto/country.dto';

@ApiTags('Country')
@Controller('country')
export class CountryController {
  constructor(private readonly countryService: CountryService, private readonly mandatorService: MandatorService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: CountryDto, isArray: true })
  async getAllCountry(@GetJwt() { mandator }: JwtPayload): Promise<CountryDto[]> {
    const mandatorEntity = await this.mandatorService.getOrThrow(mandator);

    return this.countryService
      .getAll()
      .then((countries) => countries.filter((c) => mandatorEntity.isCountryAllowed(c)))
      .then(CountryDtoMapper.entitiesToDto);
  }
}
