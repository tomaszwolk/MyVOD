import { loginSchema } from '../login.schema';

describe('loginSchema', () => {
  describe('valid data', () => {
    it('should pass validation for valid data', () => {
      // Given: valid login data
      const validData = {
        email: 'test@example.com',
        password: 'anypassword',
      };

      // When: validate data
      const result = loginSchema.safeParse(validData);

      // Then: should pass validation
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should pass with any password length', () => {
      // Given: login data with short password (login doesn't validate strength)
      const validData = {
        email: 'user@domain.com',
        password: '1', // Very short password
      };

      // When: validate data
      const result = loginSchema.safeParse(validData);

      // Then: should pass validation (unlike register, login allows any password)
      expect(result.success).toBe(true);
    });

    it('should pass with complex password', () => {
      // Given: login data with complex password
      const validData = {
        email: 'admin@test.com',
        password: 'MyC0mpl3x!P@ssw0rd123',
      };

      // When: validate data
      const result = loginSchema.safeParse(validData);

      // Then: should pass validation
      expect(result.success).toBe(true);
    });
  });

  describe('email validation', () => {
    it('should fail when email is empty', () => {
      // Given: empty email
      const data = {
        email: '',
        password: 'password123',
      };

      // When: validate data
      const result = loginSchema.safeParse(data);

      // Then: should fail with correct error
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]).toMatchObject({
        path: ['email'],
        message: 'Email jest wymagany',
      });
    });

    it('should fail when email format is invalid', () => {
      // Given: invalid email format
      const data = {
        email: 'invalid-email-format',
        password: 'password123',
      };

      // When: validate data
      const result = loginSchema.safeParse(data);

      // Then: should fail with correct error
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]).toMatchObject({
        path: ['email'],
        message: 'Proszę podać poprawny adres email',
      });
    });

    it('should fail with various invalid email formats', () => {
      // Given: various invalid email formats
      const invalidEmails = [
        'missing-at-sign',
        '@missing-local-part.com',
        'missing-domain@',
        'spaces not@allowed.com',
        'double@@at.com',
      ];

      invalidEmails.forEach(email => {
        const data = {
          email,
          password: 'password123',
        };

        // When: validate data
        const result = loginSchema.safeParse(data);

        // Then: should fail
        expect(result.success).toBe(false);
      });
    });
  });

  describe('password validation', () => {
    it('should fail when password is empty', () => {
      // Given: empty password
      const data = {
        email: 'test@example.com',
        password: '',
      };

      // When: validate data
      const result = loginSchema.safeParse(data);

      // Then: should fail with correct error
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]).toMatchObject({
        path: ['password'],
        message: 'Hasło jest wymagane',
      });
    });

    it('should pass with single character password', () => {
      // Given: single character password
      const data = {
        email: 'test@example.com',
        password: 'x',
      };

      // When: validate data
      const result = loginSchema.safeParse(data);

      // Then: should pass (login doesn't validate password strength)
      expect(result.success).toBe(true);
    });

    it('should pass with password containing only special characters', () => {
      // Given: password with only special characters
      const data = {
        email: 'test@example.com',
        password: '!@#$%^&*()',
      };

      // When: validate data
      const result = loginSchema.safeParse(data);

      // Then: should pass (login doesn't validate password strength)
      expect(result.success).toBe(true);
    });
  });

  describe('both fields validation', () => {
    it('should fail when both email and password are empty', () => {
      // Given: both fields empty
      const data = {
        email: '',
        password: '',
      };

      // When: validate data
      const result = loginSchema.safeParse(data);

      // Then: should fail with errors for both fields
      expect(result.success).toBe(false);

      const emailErrors = result.error?.issues.filter(issue => issue.path.includes('email'));
      const passwordErrors = result.error?.issues.filter(issue => issue.path.includes('password'));

      // Email has 2 errors: too_small and invalid_format
      expect(emailErrors?.length).toBe(2);
      expect(passwordErrors?.length).toBe(1);

      // Check that we have the expected error messages
      const errorMessages = result.error?.issues.map(issue => issue.message);
      expect(errorMessages).toContain('Email jest wymagany');
      expect(errorMessages).toContain('Proszę podać poprawny adres email');
      expect(errorMessages).toContain('Hasło jest wymagane');
    });

    it('should fail when email is invalid and password is empty', () => {
      // Given: invalid email and empty password
      const data = {
        email: 'invalid-email',
        password: '',
      };

      // When: validate data
      const result = loginSchema.safeParse(data);

      // Then: should fail with errors for both fields
      expect(result.success).toBe(false);
      expect(result.error?.issues).toHaveLength(2);
    });
  });
});
