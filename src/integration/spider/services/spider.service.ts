import { BadRequestException, Injectable } from '@nestjs/common';
import { Config } from 'src/config/config';
import { Country } from 'src/subdomains/master-data/country/country.entity';
import { CountryService } from 'src/subdomains/master-data/country/country.service';
import { CountryDto } from 'src/subdomains/master-data/country/dto/country.dto';
import { KycDataDto } from 'src/subdomains/user/api/dto/user-in.dto';
import { KycStep } from 'src/subdomains/user/entities/kyc-step.entity';
import { AccountType, User } from 'src/subdomains/user/entities/user.entity';
import { Customer, DocumentVersion, KycDocuments, Organization, SubmitResponse } from '../dto/spider.dto';
import { SpiderApiRegistry } from './spider-api.registry';

@Injectable()
export class SpiderService {
  constructor(private readonly spiderRegistry: SpiderApiRegistry, private readonly countryService: CountryService) {}

  async createCustomer(user: User, data: KycDataDto): Promise<SubmitResponse> {
    const apiService = this.spiderRegistry.get(user.mandator.reference);

    const contract = this.contract(user.reference);
    const customer = await this.buildCustomer(user, data);

    if (data.accountType === AccountType.PERSONAL) {
      return apiService.createPersonalCustomer(contract, customer);
    } else {
      const organization = await this.buildOrganization(user, data);
      return apiService.createOrganizationCustomer(contract, customer, organization);
    }
  }

  async getKycDocumentVersion(user: User, kycStep: KycStep): Promise<DocumentVersion | null> {
    if (!kycStep.documentVersion) throw new Error(`No document version for user ${user.id} and step ${kycStep.id}`);

    return this.spiderRegistry
      .get(user.mandator.reference)
      .getDocumentVersion(user.reference, KycDocuments[kycStep.name].document, kycStep.documentVersion);
  }

  // --- HELPER METHODS --- //
  private async buildCustomer(user: User, data: KycDataDto): Promise<Partial<Customer>> {
    // check country
    data.address.country = await this.checkCountry(user, data.address.country);

    const language = Config.spider.languages.find((l) => l === user.language.symbol) ?? Config.defaultLanguage;

    return {
      reference: this.reference(user.reference, false),
      type: 'PERSON',
      names: [{ firstName: data.firstName, lastName: data.lastName }],
      countriesOfResidence: [data.address.country.symbol],
      emails: [data.mail],
      telephones: [data.phone.replace('+', '')],
      structuredAddresses: [
        {
          type: 'BASIC',
          street: data.address.street,
          houseNumber: data.address.houseNumber,
          zipCode: data.address.zip,
          city: data.address.city,
          countryCode: data.address.country.symbol,
        },
      ],
      preferredLanguage: language.toLowerCase(),
      activationDate: { year: new Date().getFullYear(), month: new Date().getMonth() + 1, day: new Date().getDate() },
    };
  }

  private async buildOrganization(user: User, data: KycDataDto): Promise<Partial<Organization>> {
    // check country
    data.organizationAddress.country = await this.checkCountry(user, data.organizationAddress.country);

    return {
      reference: this.reference(user.reference, true),
      type: 'ORGANISATION',
      names: [data.organizationName],
      countriesOfResidence: [data.organizationAddress.country.symbol],
      structuredAddresses: [
        {
          type: 'BASIC',
          street: data.organizationAddress.street,
          houseNumber: data.organizationAddress.houseNumber,
          zipCode: data.organizationAddress.zip,
          city: data.organizationAddress.city,
          countryCode: data.organizationAddress.country.symbol,
        },
      ],
    };
  }

  private reference(reference: string, isOrganization: boolean): string {
    return isOrganization ? `${reference}_organization` : reference;
  }

  private contract(reference: string): string {
    return `${reference}_contract`;
  }

  private async checkCountry(user: User, country: CountryDto): Promise<Country> {
    const countryEntity = await this.countryService.getOrThrow(country.id);
    if (!user.mandator.isCountryAllowed(countryEntity))
      throw new BadRequestException(`Country ${country.name} not allowed`);

    return countryEntity;
  }
}
