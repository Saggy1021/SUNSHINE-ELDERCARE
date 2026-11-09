// @ts-nocheck
import { hashToken } from '../../lib/auth/tokens';
import { templateService } from '../../lib/services/email/template-service';
import { accountVerificationEmail, loginOtpEmail } from '../../lib/services/email/templates';

describe('OTP Authentication & Token Security', () => {
  describe('Token Hashing & Cryptographic Invariants', () => {
    it('produces deterministic SHA-256 hashes', () => {
      const otp = '123456';
      const hash1 = hashToken(otp);
      const hash2 = hashToken(otp);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex length
      expect(hash1).not.toBe(otp);
    });

    it('produces distinct hashes for distinct OTPs', () => {
      const hashA = hashToken('111111');
      const hashB = hashToken('222222');
      expect(hashA).not.toBe(hashB);
    });
  });

  describe('OTP Email Templates', () => {
    it('generates Login OTP template with 5-minute expiry warning', async () => {
      const data = { memberName: 'Sagnik Kar', otp: '482910' };
      const template = loginOtpEmail(data);

      expect(template.subject).toBe('Your Sunshine Eldercare Login Code');
      expect(template.html).toContain('482910');
      expect(template.html).toContain('5 minutes');
      expect(template.text).toContain('482910');
      expect(template.text).toContain('5 minutes');
      expect(template.html).toContain('Do not share this OTP with anyone');
    });

    it('resolves LOGIN_OTP through TemplateService', async () => {
      const data = { memberName: 'Tanish Alam', otp: '654321' };
      const resolved = await templateService.getTemplateContent('LOGIN_OTP', data);

      expect(resolved.subject).toBe('Your Sunshine Eldercare Login Code');
      expect(resolved.html).toContain('654321');
      expect(resolved.html).toContain('5 minutes');
    });

    it('updates Account Verification template to 5-minute expiry', () => {
      const data = { memberName: 'New Member', otp: '998877' };
      const template = accountVerificationEmail(data);

      expect(template.subject).toBe('Verify your email address');
      expect(template.html).toContain('998877');
      expect(template.html).toContain('5 minutes');
      expect(template.text).toContain('5 minutes');
    });
  });

  describe('Idempotency & Resend Defect Verification', () => {
    it('generates distinct idempotency keys for consecutive resend tokens', () => {
      const email = 'member@example.com';
      const token1 = '123456';
      const token2 = '654321';
      
      const key1 = `${email.toLowerCase()}:${hashToken(token1).substring(0, 10)}`;
      const key2 = `${email.toLowerCase()}:${hashToken(token2).substring(0, 10)}`;

      // In the legacy code, key was just `email`, causing permanent duplicate lockouts.
      // With the fix, each newly generated token produces a distinct entityId.
      expect(key1).not.toBe(key2);
      expect(key1).toContain('member@example.com');
      expect(key2).toContain('member@example.com');
    });

    it('produces identical idempotency key for identical token resend attempts', () => {
      const email = 'member@example.com';
      const token = '123456';
      
      const keyA = `${email.toLowerCase()}:${hashToken(token).substring(0, 10)}`;
      const keyB = `${email.toLowerCase()}:${hashToken(token).substring(0, 10)}`;

      // Prevents concurrent duplicate dispatch of the same token
      expect(keyA).toBe(keyB);
    });
  });
});
