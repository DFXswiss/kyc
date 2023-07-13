import { Injectable } from '@nestjs/common';
import { Config } from 'src/config/config';
import { CountryService } from 'src/subdomains/master-data/country/country.service';
import { KycDataDto } from 'src/subdomains/user/api/dto/user-in.dto';
import { AccountType, User } from 'src/subdomains/user/entities/user.entity';
import { Customer, Organization, SubmitResponse } from '../dto/spider.dto';
import { SpiderApiRegistry } from './spider-api.registry';

@Injectable()
export class SpiderService {
  constructor(private readonly spiderRegistry: SpiderApiRegistry, private readonly countryService: CountryService) {}

  async createCustomer(user: User, data: KycDataDto): Promise<SubmitResponse> {
    const apiService = this.spiderRegistry.get(user.mandator.reference);

    const contract = this.contract(user.reference);
    const customer = await this.buildCustomer(user, data);
    const organization = data.accountType !== AccountType.PERSONAL && (await this.buildOrganization(user, data));

    return data.accountType === AccountType.PERSONAL
      ? apiService.createPersonalCustomer(contract, customer)
      : apiService.createOrganizationCustomer(contract, customer, organization);
  }

  // --- HELPER METHODS --- //
  private async buildCustomer(user: User, data: KycDataDto): Promise<Partial<Customer>> {
    // check country
    data.address.country = await this.countryService.getOrThrow(data.address.country.id);

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
    data.organizationAddress.country = await this.countryService.getOrThrow(data.organizationAddress.country.id);

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
}
