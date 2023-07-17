const { MigrationInterface, QueryRunner } = require('typeorm');

module.exports = class Initial1689609881846 {
  name = 'Initial1689609881846';

  async up(queryRunner) {
    await queryRunner.query(
      `CREATE TABLE "country" ("id" int NOT NULL IDENTITY(1,1), "created" datetime2 NOT NULL CONSTRAINT "DF_0f2b6cb5923823466039624b8dc" DEFAULT getdate(), "updated" datetime2 NOT NULL CONSTRAINT "DF_77d13ee65ce17510d8a0eb04361" DEFAULT getdate(), "symbol" nvarchar(10) NOT NULL, "name" nvarchar(255) NOT NULL, CONSTRAINT "UQ_a311ea2c04056cbfb4de490d827" UNIQUE ("symbol"), CONSTRAINT "PK_bf6e37c231c4f4ea56dcd887269" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "language" ("id" int NOT NULL IDENTITY(1,1), "created" datetime2 NOT NULL CONSTRAINT "DF_9922112bb5895a747be790577aa" DEFAULT getdate(), "updated" datetime2 NOT NULL CONSTRAINT "DF_0d91272b3978057c88b996005e3" DEFAULT getdate(), "symbol" nvarchar(10) NOT NULL, "name" nvarchar(255) NOT NULL, "foreignName" nvarchar(255) NOT NULL, CONSTRAINT "UQ_61337a8ce78f5a5d8550dbd3d58" UNIQUE ("symbol"), CONSTRAINT "PK_cc0a99e710eb3733f6fb42b1d4c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "setting" ("key" nvarchar(255) NOT NULL, "value" nvarchar(MAX) NOT NULL, CONSTRAINT "PK_1c4c95d773004250c157a744d6e" PRIMARY KEY ("key"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "mandator" ("id" int NOT NULL IDENTITY(1,1), "created" datetime2 NOT NULL CONSTRAINT "DF_72c18a2faa03dfaba08e56a1998" DEFAULT getdate(), "updated" datetime2 NOT NULL CONSTRAINT "DF_b806307036a15a2613c2ef5f1fa" DEFAULT getdate(), "reference" uniqueidentifier NOT NULL CONSTRAINT "DF_6a130b96aa22605f8ca88bf2a0d" DEFAULT NEWSEQUENTIALID(), "name" nvarchar(255) NOT NULL, "mandator" nvarchar(255) NOT NULL, "user" nvarchar(255) NOT NULL, "password" nvarchar(255) NOT NULL, "identUrl" nvarchar(255), "allowedCountries" nvarchar(MAX), CONSTRAINT "UQ_6a130b96aa22605f8ca88bf2a0d" UNIQUE ("reference"), CONSTRAINT "PK_4cd13d6e68d0d5b96e12ee1a09f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "user" ("id" int NOT NULL IDENTITY(1,1), "created" datetime2 NOT NULL CONSTRAINT "DF_8ce4c93ba419b56bd82e533724d" DEFAULT getdate(), "updated" datetime2 NOT NULL CONSTRAINT "DF_5904a9d40152f354e4c7b0202fb" DEFAULT getdate(), "reference" nvarchar(255) NOT NULL, "spiderReference" int, "accountType" nvarchar(255), "kycStatus" nvarchar(255) NOT NULL CONSTRAINT "DF_fd8b11316c584a7f4b9c7a0af9f" DEFAULT 'NotStarted', "mandatorId" int NOT NULL, "languageId" int NOT NULL, CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_79bf06d31afefc853cbc545490" ON "user" ("mandatorId", "reference") `,
    );
    await queryRunner.query(
      `CREATE TABLE "kyc_step" ("id" int NOT NULL IDENTITY(1,1), "created" datetime2 NOT NULL CONSTRAINT "DF_b69ad6cda60bffe5421182267eb" DEFAULT getdate(), "updated" datetime2 NOT NULL CONSTRAINT "DF_8c9edf8d24eeee815ead6e9de30" DEFAULT getdate(), "name" nvarchar(255) NOT NULL, "status" nvarchar(255) NOT NULL, "documentVersion" nvarchar(255), "sessionId" nvarchar(255), "sessionUrl" nvarchar(255), "setupUrl" nvarchar(255), "userId" int NOT NULL, CONSTRAINT "PK_fcd6a4863a74f43a3cad2ce5b92" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_bc3482882dab0448560ed7995e" ON "kyc_step" ("userId", "name") WHERE status = 'InProgress'`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_169eac91c7450b0738c16f025c7" FOREIGN KEY ("mandatorId") REFERENCES "mandator"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_0b294695467ceecc030f95461c1" FOREIGN KEY ("languageId") REFERENCES "language"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "kyc_step" ADD CONSTRAINT "FK_d32f92592c5f3fd3d7ade9f1bc9" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  async down(queryRunner) {
    await queryRunner.query(`ALTER TABLE "kyc_step" DROP CONSTRAINT "FK_d32f92592c5f3fd3d7ade9f1bc9"`);
    await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "FK_0b294695467ceecc030f95461c1"`);
    await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "FK_169eac91c7450b0738c16f025c7"`);
    await queryRunner.query(`DROP INDEX "IDX_bc3482882dab0448560ed7995e" ON "kyc_step"`);
    await queryRunner.query(`DROP TABLE "kyc_step"`);
    await queryRunner.query(`DROP INDEX "IDX_79bf06d31afefc853cbc545490" ON "user"`);
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(`DROP TABLE "mandator"`);
    await queryRunner.query(`DROP TABLE "setting"`);
    await queryRunner.query(`DROP TABLE "language"`);
    await queryRunner.query(`DROP TABLE "country"`);
  }
};
