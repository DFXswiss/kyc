import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { HttpService } from './shared/services/http.service';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: HttpService, useValue: {} }],
    }).compile();

    controller = app.get<AppController>(AppController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
