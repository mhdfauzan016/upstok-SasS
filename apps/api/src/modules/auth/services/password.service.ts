import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

/** Password hashing/verification (argon2id). Centralized so policy lives in one place. */
@Injectable()
export class PasswordService {
  hash(plain: string): Promise<string> {
    return argon2.hash(plain, { type: argon2.argon2id });
  }

  async verify(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }
}
