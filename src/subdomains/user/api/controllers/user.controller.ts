import { Body, Controller, Get, Post, Put, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { GetJwt } from 'src/shared/auth/get-jwt.decorator';
import { JwtPayload } from 'src/shared/auth/jwt-payload.interface';
import { CountryDtoMapper } from 'src/subdomains/master-data/country/dto/country-dto.mapper';
import { CountryDto } from 'src/subdomains/master-data/country/dto/country.dto';
import { KycService } from '../../services/kyc.service';
import { MandatorService } from '../../services/mandator.service';
import { UserService } from '../../services/user.service';
import { KycDataDto, SettingsDto } from '../dto/user-in.dto';
import { UserInfoDto } from '../dto/user-out.dto';

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly mandatorService: MandatorService,
    private readonly kycService: KycService,
  ) {}

  // --- USER --- //
  @Get()
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: UserInfoDto })
  async getUser(@GetJwt() { mandator, user }: JwtPayload): Promise<UserInfoDto> {
    return this.userService.getOrCreate(mandator, user);
  }

  @Put()
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: UserInfoDto })
  async updateUser(@GetJwt() { mandator, user }: JwtPayload, settings: SettingsDto): Promise<UserInfoDto> {
    return this.userService.updateSettings(mandator, user, settings);
  }

  @Get('countries')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: CountryDto, isArray: true })
  async getCountries(@GetJwt() { mandator }: JwtPayload): Promise<CountryDto[]> {
    return this.mandatorService.getAllowedCountries(mandator).then(CountryDtoMapper.entitiesToDto);
  }

  // --- KYC --- //
  @Put('kyc')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiCreatedResponse({ type: UserInfoDto })
  async continueKyc(@GetJwt() { mandator, user }: JwtPayload): Promise<UserInfoDto> {
    return this.kycService.continueKyc(mandator, user);
  }

  @Post('data')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiCreatedResponse({ type: UserInfoDto })
  async updateKycData(@GetJwt() { mandator, user }: JwtPayload, @Body() data: KycDataDto): Promise<UserInfoDto> {
    return this.kycService.updateKycData(mandator, user, data);
  }

  @Post('incorporation-certificate')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @UseInterceptors(FilesInterceptor('files'))
  @ApiCreatedResponse({ type: Boolean })
  async uploadIncorporationCertificate(
    @GetJwt() { mandator, user }: JwtPayload,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<UserInfoDto> {
    return this.kycService.uploadIncorporationCertificate(mandator, user, files[0]);
  }
}
