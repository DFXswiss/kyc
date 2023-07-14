import { ServiceUnavailableException } from '@nestjs/common';
import { Method, ResponseType } from 'axios';
import { createHash } from 'crypto';
import { HttpError, HttpService } from 'src/shared/services/http.service';
import {
  Challenge,
  CheckResponse,
  CheckResult,
  CreateResponse,
  Customer,
  CustomerInformationResponse,
  DocumentInfo,
  DocumentVersion,
  DocumentVersionPart,
  InitiateResponse,
  KycContentType,
  KycDocument,
  KycDocumentState,
  KycRelationType,
  Organization,
  RiskResult,
  SubmitResponse,
} from '../dto/spider.dto';

export class SpiderApiService {
  private readonly baseUrl = 'https://kyc.eurospider.com/kyc-v8-api/rest';
  private readonly baseVersion = '2.0.0';

  private sessionKey = 'session-key-will-be-updated';

  constructor(
    private readonly http: HttpService,
    private readonly config: { mandator: string; user: string; password: string },
  ) {}

  // --- CUSTOMER --- //
  async getCustomer(reference: string): Promise<Customer | undefined> {
    return this.callApi<Customer>(`customers/${reference}`);
  }

  async getCustomerInfo(reference: string): Promise<CustomerInformationResponse | undefined> {
    return this.callApi<CustomerInformationResponse>(`customers/${reference}/information`);
  }

  async getChangedCustomers(modificationTime: number): Promise<string[]> {
    return this.callApi<string[]>(`customers?modificationTime=${modificationTime}`).then((r) => r ?? []);
  }

  async updateCustomer(customer: Customer): Promise<CreateResponse | undefined> {
    return this.callApi<CreateResponse>('customers/simple', 'POST', customer);
  }

  async createPersonalCustomer(contract: string, person: Partial<Customer>): Promise<SubmitResponse> {
    const personData = {
      contractReference: contract,
      customer: person,
      relationTypes: [
        KycRelationType.CONVERSION_PARTNER,
        KycRelationType.BENEFICIAL_OWNER,
        KycRelationType.CONTRACTING_PARTNER,
      ],
    };

    return this.callApi<SubmitResponse[]>('customers/contract-linked-list', 'POST', [personData]).then(
      (r: SubmitResponse[]) => r[0],
    );
  }

  async createOrganizationCustomer(
    contract: string,
    person: Partial<Customer>,
    organization: Partial<Organization>,
  ): Promise<SubmitResponse> {
    const personData = {
      contractReference: contract,
      customer: person,
      relationTypes: [KycRelationType.CONVERSION_PARTNER, KycRelationType.CONTROLLER],
    };

    const organizationData = {
      contractReference: contract,
      customer: organization,
      relationTypes: [KycRelationType.CONTRACTING_PARTNER],
    };

    return this.callApi<SubmitResponse[]>('customers/contract-linked-list', 'POST', [
      personData,
      organizationData,
    ]).then((r: SubmitResponse[]) => r[0]);
  }

  async renameCustomerReference(oldReference: string, newReference: string): Promise<boolean> {
    const result = await this.callApi<string>(`customers/${oldReference}/rename?newReference=${newReference}`);
    return result === 'done';
  }

  async renameContractReference(oldReference: string, newReference: string): Promise<boolean> {
    const result = await this.callApi<string>(`contracts/${oldReference}/rename?newReference=${newReference}`);
    return result === 'done';
  }

  // --- NAME CHECK --- //
  async checkCustomer(reference: string): Promise<CheckResponse[]> {
    return this.callApi<CheckResponse[]>('customers/check', 'POST', [reference]).then((r) => r ?? []);
  }

  async getCheckResult(reference: string): Promise<RiskResult> {
    const customerInfo = await this.getCustomerInfo(reference);
    if (!customerInfo || customerInfo.lastCheckId < 0) return { result: undefined, risks: [] };

    const customerCheckResult =
      customerInfo.lastCheckVerificationId < 0
        ? await this.callApi<CheckResult>(`customers/checks/${customerInfo.lastCheckId}/result/?detailed=true`)
        : await this.callApi<CheckResult>(
            `customers/checks/verifications/${customerInfo.lastCheckVerificationId}/result?detailed=true`,
          );

    return { result: customerCheckResult?.risks[0].categoryKey, risks: customerCheckResult?.risks ?? [] };
  }

  // --- DOCUMENTS --- //
  async getDocumentInfos(reference: string): Promise<DocumentInfo[]> {
    const customer = await this.getCustomer(reference);
    if (!customer) throw new Error(`Customer ${reference} not found`);

    const documentList: DocumentInfo[] = [];

    const documents = (await this.getDocuments(reference)) ?? [];
    for (const document of documents) {
      const versions = (await this.getDocumentVersions(reference, document)) ?? [];
      for (const version of versions) {
        const parts = (await this.getDocumentVersionParts(reference, document, version.name)) ?? [];

        documentList.push(
          ...parts.map((part) => ({
            document,
            version: version.name,
            part: part.name,
            state: version.state,
            creationTime: new Date(part.creationTime),
            modificationTime: new Date(part.modificationTime),
            label: part.label,
            fileName: part.fileName,
            contentType: part.contentType,
            url: this.getDocumentUrl(customer.id, document, version.name, part.name),
          })),
        );
      }
    }

    return documentList;
  }

  async getDocuments(reference: string): Promise<KycDocument[] | undefined> {
    return this.callApi(`customers/${reference}/documents`);
  }

  async getBinaryDocument(reference: string, document: KycDocument, version: string, part: string): Promise<Buffer> {
    return this.getDocument(reference, document, version, part, 'arraybuffer').then(Buffer.from);
  }

  async getDocument<T>(
    reference: string,
    document: KycDocument,
    version: string,
    part: string,
    responseType?: ResponseType,
  ): Promise<T | undefined> {
    return this.callApi<T>(
      `customers/${reference}/documents/${document}/versions/${version}/parts/${part}`,
      'GET',
      undefined,
      undefined,
      responseType,
    );
  }

  async getCompletedDocument<T>(reference: string, document: KycDocument, part: string): Promise<T | undefined> {
    const completedVersion = await this.findDocumentVersion(reference, document, KycDocumentState.COMPLETED);
    if (!completedVersion) return undefined;

    return this.getDocument(reference, document, completedVersion.name, part);
  }

  async changeDocumentState(
    reference: string,
    document: KycDocument,
    version: string,
    state: KycDocumentState,
  ): Promise<boolean> {
    const result = await this.callApi<string>(
      `customers/${reference}/documents/${document}/versions/${version}/state`,
      'PUT',
      JSON.stringify(state),
    );

    return result === 'done';
  }

  async getDocumentVersions(reference: string, document: KycDocument): Promise<DocumentVersion[] | undefined> {
    return this.callApi<DocumentVersion[]>(`customers/${reference}/documents/${document}/versions`);
  }

  async getDocumentVersion(
    reference: string,
    document: KycDocument,
    version: string,
  ): Promise<DocumentVersion | undefined> {
    return this.callApi<DocumentVersion>(`customers/${reference}/documents/${document}/versions/${version}`);
  }

  async findDocumentVersion(
    reference: string,
    document: KycDocument,
    state: KycDocumentState,
  ): Promise<DocumentVersion | undefined> {
    return this.getDocumentVersions(reference, document).then((versions) => versions?.find((v) => v?.state === state));
  }

  async createDocumentVersion(reference: string, document: KycDocument, version: string): Promise<boolean> {
    const data = {
      name: version,
    };
    const result = await this.callApi<string>(
      `customers/${reference}/documents/${document}/versions/${version}`,
      'PUT',
      data,
    );
    return result === 'done';
  }

  async getDocumentVersionParts(
    reference: string,
    document: KycDocument,
    version: string,
  ): Promise<DocumentVersionPart[] | undefined> {
    return this.callApi<DocumentVersionPart[]>(
      `customers/${reference}/documents/${document}/versions/${version}/parts`,
    );
  }

  async createDocumentVersionPart(
    reference: string,
    document: KycDocument,
    version: string,
    part: string,
    fileName: string,
    contentType: KycContentType | string,
  ): Promise<boolean> {
    const data = {
      name: part,
      label: part,
      fileName: fileName,
      contentType: contentType,
    };
    const result = await this.callApi<string>(
      `customers/${reference}/documents/${document}/versions/${version}/parts/${part}/metadata`,
      'PUT',
      data,
    );
    return result === 'done';
  }

  async uploadDocument(
    reference: string,
    document: KycDocument,
    version: string,
    part: string,
    contentType: KycContentType | string,
    data: any,
  ): Promise<boolean> {
    const result = await this.callApi<string>(
      `customers/${reference}/documents/${document}/versions/${version}/parts/${part}`,
      'PUT',
      data,
      contentType,
    );

    return result === 'done';
  }

  getDocumentUrl(customerId: number, document: KycDocument, version: string, part: string): string {
    return `https://kyc.eurospider.com/toolbox/rest/customer-resource/customer/${customerId}/doctype/${document}/version/${version}/part/${part}`;
  }

  // --- IDENTIFICATION --- //
  async initiateIdentification(
    reference: string,
    sendMail: boolean,
    identType: KycDocument,
  ): Promise<InitiateResponse> {
    const data = {
      references: [reference],
      sendInvitation: sendMail,
    };

    return this.callApi<InitiateResponse[]>(`customers/initiate-${identType}-sessions`, 'POST', data).then(
      (r: InitiateResponse[]) => r[0],
    );
  }

  // --- HELPER METHODS --- //

  private async callApi<T>(
    url: string,
    method: Method = 'GET',
    data?: any,
    contentType?: string,
    responseType?: ResponseType,
  ): Promise<T | undefined> {
    return this.request<T>(url, method, data, contentType, responseType).catch((e: HttpError) => {
      if (e.response?.status === 404) {
        return undefined;
      }

      throw new ServiceUnavailableException(e.response);
    });
  }

  private async request<T>(
    url: string,
    method: Method,
    data?: any,
    contentType?: string,
    responseType?: ResponseType,
    nthTry = 3,
    getNewKey = false,
  ): Promise<T> {
    try {
      if (getNewKey) this.sessionKey = await this.getNewSessionKey();
      const version = url.includes('initiate') || url.includes('rename') ? '3.0.0' : this.baseVersion;
      return await this.http.request<T>({
        url: `${this.baseUrl}/${version}/${url}`,
        method: method,
        data: data,
        responseType,
        headers: {
          'Content-Type': contentType ?? 'application/json',
          'Session-Key': this.sessionKey,
        },
      });
    } catch (e) {
      if (nthTry > 1 && [403, 500].includes(e.response?.status)) {
        return this.request(url, method, data, contentType, responseType, nthTry - 1, e.response?.status === 403);
      }
      throw new Error(e);
    }
  }

  private async getNewSessionKey(): Promise<string> {
    // get the challenge
    const { key, challenge } = await this.http.get<Challenge>(`${this.baseUrl}/${this.baseVersion}/challenge`);

    // determine response
    const response = key + this.config.mandator + this.config.user + this.config.password + challenge;
    const hash = createHash('sha1');
    hash.update(response);

    const data = {
      key: key,
      mandator: this.config.mandator,
      user: this.config.user,
      response: hash.digest('hex'),
    };

    // enable the session key
    await this.http.post(`${this.baseUrl}/${this.baseVersion}/authenticate`, data);

    return key;
  }
}
