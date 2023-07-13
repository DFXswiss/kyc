import { Body, Controller, Get, Post, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { GetJwt } from 'src/shared/auth/get-jwt.decorator';
import { JwtPayload } from 'src/shared/auth/jwt-payload.interface';
import { KycService } from '../../services/kyc.service';
import { KycDataDto } from '../dto/kyc-in.dto';
import { KycInfoDto } from '../dto/kyc-out.dto';

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(private readonly kycService: KycService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: KycInfoDto })
  async getKycProgress(@GetJwt() { mandator, user }: JwtPayload): Promise<KycInfoDto> {
    return this.kycService.getKycStatus(mandator, user);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiCreatedResponse({ type: KycInfoDto })
  async continueKyc(@GetJwt() { mandator, user }: JwtPayload): Promise<KycInfoDto> {
    return this.kycService.continueKyc(mandator, user);
  }

  @Post('data')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiCreatedResponse({ type: KycInfoDto })
  async updateKycData(@GetJwt() { mandator, user }: JwtPayload, @Body() data: KycDataDto): Promise<KycInfoDto> {
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
  ): Promise<KycInfoDto> {
    return this.kycService.uploadIncorporationCertificate(mandator, user, files[0]);
  }
}
