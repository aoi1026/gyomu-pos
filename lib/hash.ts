import crypto from 'crypto';

/**
 * MD5ハッシュ化関数
 * @param text ハッシュ化するテキスト
 * @returns MD5ハッシュ値
 */
export function md5Hash(text: string): string {
  return crypto.createHash('md5').update(text).digest('hex');
}

/**
 * パスワードの検証
 * @param password 入力されたパスワード
 * @param hashedPassword データベースに保存されているハッシュ化されたパスワード
 * @returns パスワードが一致するかどうか
 */
export function verifyPassword(password: string, hashedPassword: string): boolean {
  return md5Hash(password) === hashedPassword;
}

/**
 * パスワードのハッシュ化
 * @param password ハッシュ化するパスワード
 * @returns ハッシュ化されたパスワード
 */
export function hashPassword(password: string): string {
  return md5Hash(password);
}
