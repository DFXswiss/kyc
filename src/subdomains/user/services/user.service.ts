import { Injectable } from '@nestjs/common';
import { User } from '../entities/user.entity';
import { UserRepository } from '../repositories/user.repository';

@Injectable()
export class UserService {
  constructor(private readonly repo: UserRepository) {}

  async get(mandator: string, reference: string): Promise<User | undefined> {
    return this.repo.findOneBy({ mandator: { reference: mandator }, reference });
  }
}
