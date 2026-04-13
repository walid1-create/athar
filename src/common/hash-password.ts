import * as bcrypt from 'bcrypt';

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}
