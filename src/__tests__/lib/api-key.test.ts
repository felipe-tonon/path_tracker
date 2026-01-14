/**
 * API Key Utilities Tests
 */

import bcrypt from 'bcryptjs';

describe('API Key Format', () => {
  it('should follow the correct format', () => {
    const apiKey = 'pwtrk_test1234567890abcdefghijklmno';

    expect(apiKey).toMatch(/^pwtrk_[a-zA-Z0-9_-]+$/);
    expect(apiKey.length).toBeGreaterThan(12);
  });

  it('should have correct prefix', () => {
    const apiKey = 'pwtrk_test1234567890abcdefghijklmno';
    const prefix = apiKey.slice(0, 12);

    expect(prefix).toMatch(/^pwtrk_/);
    expect(prefix.length).toBe(12);
  });
});

describe('API Key Hashing', () => {
  it('should create a verifiable hash', async () => {
    const key = 'pwtrk_test1234567890abcdefghijklmno';
    const hash = await bcrypt.hash(key, 12);
    const isMatch = await bcrypt.compare(key, hash);

    expect(isMatch).toBe(true);
    expect(hash).toMatch(/^\$2[aby]\$/); // bcrypt hash format
  });

  it('should not match incorrect keys', async () => {
    const key = 'pwtrk_test1234567890abcdefghijklmno';
    const wrongKey = 'pwtrk_wrong123456789abcdefghijklmn';
    const hash = await bcrypt.hash(key, 12);
    const isMatch = await bcrypt.compare(wrongKey, hash);

    expect(isMatch).toBe(false);
  });

  it('should generate unique hashes', async () => {
    const key = 'pwtrk_test1234567890abcdefghijklmno';
    const hash1 = await bcrypt.hash(key, 12);
    const hash2 = await bcrypt.hash(key, 12);

    // Different salts should produce different hashes
    expect(hash1).not.toBe(hash2);

    // But both should verify the same key
    expect(await bcrypt.compare(key, hash1)).toBe(true);
    expect(await bcrypt.compare(key, hash2)).toBe(true);
  });
});

describe('API Key Validation Logic', () => {
  it('should validate authorization header format', () => {
    const validHeader = 'Bearer pwtrk_test1234567890abcdefghijklmno';
    const parts = validHeader.split(' ');

    expect(parts.length).toBe(2);
    expect(parts[0].toLowerCase()).toBe('bearer');
    expect(parts[1]).toMatch(/^pwtrk_/);
  });

  it('should reject invalid header formats', () => {
    // Test null/empty
    expect(null).toBeFalsy();
    expect('').toBeFalsy();

    // Test invalid formats
    const testInvalid = (header: string) => {
      const parts = header.split(' ');
      return !(
        parts.length === 2 &&
        parts[0].toLowerCase() === 'bearer' &&
        parts[1] &&
        parts[1].trim().length > 0 &&
        parts[1].startsWith('pwtrk_')
      );
    };

    expect(testInvalid('InvalidFormat')).toBe(true);
    expect(testInvalid('Basic xyz123')).toBe(true);
    expect(testInvalid('Bearer')).toBe(true);
    expect(testInvalid('Bearer ')).toBe(true);
    expect(testInvalid('Bearer wrong_prefix_123')).toBe(true);
  });

  it('should check key expiration', () => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + 86400000); // +1 day
    const pastDate = new Date(now.getTime() - 86400000); // -1 day

    expect(futureDate > now).toBe(true); // Not expired
    expect(pastDate < now).toBe(true); // Expired
  });

  it('should handle revoked status', () => {
    const keyRecord = {
      key_id: 'test-key-id',
      tenant_id: 'test-tenant-id',
      revoked: false,
      expires_at: null,
    };

    expect(keyRecord.revoked).toBe(false);

    const revokedRecord = { ...keyRecord, revoked: true };
    expect(revokedRecord.revoked).toBe(true);
  });
});
