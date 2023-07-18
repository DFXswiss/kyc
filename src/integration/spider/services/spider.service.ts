import { BadRequestException, Injectable } from '@nestjs/common';
import { Config } from 'src/config/config';
import { Country } from 'src/subdomains/master-data/country/country.entity';
import { CountryService } from 'src/subdomains/master-data/country/country.service';
import { CountryDto } from 'src/subdomains/master-data/country/dto/country.dto';
import { KycDataDto, SettingsDto } from 'src/subdomains/user/api/dto/user-in.dto';
import { Mandator } from 'src/subdomains/user/entities/mandator.entity';
import { User } from 'src/subdomains/user/entities/user.entity';
import { AccountType } from 'src/subdomains/user/enums/user.enum';
import {
  Customer,
  DocumentVersion,
  IdentificationLog,
  InitiateResponse,
  KycContentType,
  KycDocument,
  KycDocumentState,
  Organization,
  SubmitResponse,
} from '../dto/spider.dto';
import { SpiderApiRegistry } from './spider-api.registry';

@Injectable()
export class SpiderService {
  private readonly defaultDocumentPart = 'content';

  constructor(private readonly spiderRegistry: SpiderApiRegistry, private readonly countryService: CountryService) {}

  async createCustomer(user: User, data: KycDataDto): Promise<SubmitResponse> {
    const spiderApi = this.getApiService(user);

    const contract = this.contract(user.reference);
    const customer = await this.buildCustomer(user, data);

    if (data.accountType === AccountType.PERSONAL) {
      return spiderApi.createPersonalCustomer(contract, customer);
    } else {
      const organization = await this.buildOrganization(user, data);
      return spiderApi.createOrganizationCustomer(contract, customer, organization);
    }
  }

  async updateCustomer(user: User, settings: SettingsDto): Promise<void> {
    const spiderApi = this.getApiService(user);

    const customer = await spiderApi.getCustomer(this.reference(user.reference, false));
    if (customer) {
      const update = {
        ...customer,
        names: customer.names.filter((n) => n.firstName !== '' || n.lastName !== ''),
        ...this.buildSettings(settings),
      };
      await spiderApi.updateCustomer(update);
    }
  }

  async getKycDocumentVersion(
    user: User,
    document: KycDocument,
    version: string,
  ): Promise<DocumentVersion | undefined> {
    return this.getApiService(user).getDocumentVersion(this.reference(user.reference, false), document, version);
  }

  async uploadDocument(
    user: User,
    isOrganization: boolean,
    document: KycDocument,
    fileName: string,
    contentType: KycContentType | string,
    data: any,
    version: string = Date.now().toString(),
  ): Promise<boolean> {
    const spiderApi = this.getApiService(user);

    const reference = this.reference(user.reference, isOrganization);

    await spiderApi.createDocumentVersion(reference, document, version);
    await spiderApi.createDocumentVersionPart(
      reference,
      document,
      version,
      this.defaultDocumentPart,
      fileName,
      contentType,
    );
    let successful = await spiderApi.uploadDocument(
      reference,
      document,
      version,
      this.defaultDocumentPart,
      contentType,
      data,
    );
    if (successful) {
      successful = await spiderApi.changeDocumentState(reference, document, version, KycDocumentState.COMPLETED);
    }

    return successful;
  }

  async initiateKycDocument(user: User, document: KycDocument): Promise<InitiateResponse> {
    return this.getApiService(user).initiateIdentification(this.reference(user.reference, false), false, document);
  }

  async getSessionData(
    user: User,
    response: InitiateResponse,
  ): Promise<{ documentVersion?: string; sessionId?: string; sessionUrl?: string; setupUrl?: string }> {
    const { version: documentVersion, document } = response.locators[0];

    if ([KycDocument.ONLINE_IDENTIFICATION, KycDocument.VIDEO_IDENTIFICATION].includes(document)) {
      const sessionId = await this.getApiService(user)
        .getDocument<IdentificationLog>(
          this.reference(user.reference, false),
          document,
          documentVersion,
          KycDocument.IDENTIFICATION_LOG,
        )
        .then((l) => l?.identificationId);

      return {
        documentVersion,
        sessionId,
        sessionUrl:
          document === KycDocument.ONLINE_IDENTIFICATION && sessionId
            ? this.getOnlineIdUrl(user.mandator, sessionId)
            : response.sessionUrl,
        setupUrl: document === KycDocument.ONLINE_IDENTIFICATION ? response.sessionUrl : undefined,
      };
    }

    return {
      documentVersion,
      sessionUrl: response.sessionUrl,
    };
  }

  async uploadInitialCustomerInfo(user: User, data: KycDataDto): Promise<void> {
    // pre-fill customer info
    const customerInfo = this.buildInitialCustomerInfo(data);
    await this.uploadInitialInformation(user, false, customerInfo);

    if (data.accountType !== AccountType.PERSONAL) {
      // pre-fill organization info
      const organizationInfo = this.buildInitialOrganizationInfo(data);
      await this.uploadInitialInformation(user, true, organizationInfo);
    }
  }

  // --- HELPER METHODS --- //
  private async buildCustomer(user: User, data: KycDataDto): Promise<Partial<Customer>> {
    // check country
    data.address.country = await this.checkCountry(user, data.address.country);

    return {
      reference: this.reference(user.reference, false),
      type: 'PERSON',
      names: [{ firstName: data.firstName, lastName: data.lastName }],
      countriesOfResidence: [data.address.country.symbol],
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
      activationDate: {
        year: user.created.getFullYear(),
        month: user.created.getMonth() + 1,
        day: user.created.getDate(),
      },
      ...this.buildSettings({ ...data, language: user.language }),
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

  private buildInitialCustomerInfo(data: KycDataDto): any {
    return {
      type: 'AdditionalPersonInformation',
      nickName: data.firstName,
    };
  }

  private buildInitialOrganizationInfo(data: KycDataDto): any {
    return {
      type:
        data.accountType === AccountType.SOLE_PROPRIETORSHIP
          ? 'AdditionalOrganisationInformation'
          : 'AdditionalLegalEntityInformation',
      organisationType: data.accountType === AccountType.SOLE_PROPRIETORSHIP ? 'SOLE_PROPRIETORSHIP' : 'LEGAL_ENTITY',
    };
  }

  private uploadInitialInformation(user: User, isOrganization: boolean, info: any): Promise<boolean> {
    return this.uploadDocument(
      user,
      isOrganization,
      KycDocument.INITIAL_CUSTOMER_INFORMATION,
      'initial-customer-information.json',
      KycContentType.JSON,
      info,
      'v1',
    );
  }

  private reference(reference: string, isOrganization: boolean): string {
    return isOrganization ? `${reference}_organization` : reference;
  }

  private contract(reference: string): string {
    return `${reference}_contract`;
  }

  private buildSettings(settings: SettingsDto): Partial<Customer> {
    const language = Config.spider.languages.find((l) => l === settings.language?.symbol) ?? Config.defaultLanguage;

    return {
      ...(settings.mail ? { emails: [settings.mail] } : undefined),
      ...(settings.phone ? { telephones: [settings.phone.replace('+', '')] } : undefined),
      ...(settings.language ? { preferredLanguage: language.toLowerCase() } : undefined),
    };
  }

  private async checkCountry(user: User, country: CountryDto): Promise<Country> {
    const countryEntity = await this.countryService.getOrThrow(country.id);
    if (!user.mandator.isCountryAllowed(countryEntity))
      throw new BadRequestException(`Country ${country.name} not allowed`);

    return countryEntity;
  }

  private getOnlineIdUrl(mandator: Mandator, identificationId: string): string {
    const baseUrl = mandator.identUrl ?? 'https://go.online-ident.ch/app/kycspiderauto/identifications';
    return `${baseUrl}/${identificationId}/identification/start`;
  }

  private getApiService(user: User) {
    return this.spiderRegistry.get(user.mandator.reference);
  }
}
