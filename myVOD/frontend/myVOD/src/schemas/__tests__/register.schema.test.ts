import { registerSchema, checkPasswordRules } from '../register.schema';

describe('registerSchema', () => {
  describe('valid data', () => {
    it('should pass validation for valid data', () => {
      // Given: valid registration data
      const validData = {
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      };

      // When: validate data
      const result = registerSchema.safeParse(validData);

      // Then: should pass validation
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should pass with complex valid password', () => {
      // Given: complex password meeting all requirements
      const validData = {
        email: 'user@domain.com',
        password: 'MySecureP@ssw0rd123!',
        confirmPassword: 'MySecureP@ssw0rd123!',
      };

      // When: validate data
      const result = registerSchema.safeParse(validData);

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
        confirmPassword: 'password123',
      };

      // When: validate data
      const result = registerSchema.safeParse(data);

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
        email: 'invalid-email',
        password: 'password123',
        confirmPassword: 'password123',
      };

      // When: validate data
      const result = registerSchema.safeParse(data);

      // Then: should fail with correct error
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]).toMatchObject({
        path: ['email'],
        message: 'Podaj poprawny adres email',
      });
    });
  });

  describe('password validation', () => {
    it('should fail when password is empty', () => {
      // Given: empty password
      const data = {
        email: 'test@example.com',
        password: '',
        confirmPassword: '',
      };

      // When: validate data
      const result = registerSchema.safeParse(data);

      // Then: should fail with multiple errors
      expect(result.success).toBe(false);
      const passwordErrors = result.error?.issues.filter(issue => issue.path.includes('password'));
      expect(passwordErrors?.length).toBeGreaterThan(0);
    });

    it('should fail when password is too short (< 8 chars)', () => {
      // Given: password too short
      const data = {
        email: 'test@example.com',
        password: 'pass1',
        confirmPassword: 'pass1',
      };

      // When: validate data
      const result = registerSchema.safeParse(data);

      // Then: should fail with min length error
      expect(result.success).toBe(false);
      expect(result.error?.issues.find(issue => issue.message.includes('8 znaków'))).toBeDefined();
    });

    it('should fail when password has no letter', () => {
      // Given: password with only numbers
      const data = {
        email: 'test@example.com',
        password: '12345678',
        confirmPassword: '12345678',
      };

      // When: validate data
      const result = registerSchema.safeParse(data);

      // Then: should fail with letter requirement error
      expect(result.success).toBe(false);
      expect(result.error?.issues.find(issue => issue.message.includes('zawierać literę'))).toBeDefined();
    });

    it('should fail when password has no number', () => {
      // Given: password with only letters
      const data = {
        email: 'test@example.com',
        password: 'password',
        confirmPassword: 'password',
      };

      // When: validate data
      const result = registerSchema.safeParse(data);

      // Then: should fail with number requirement error
      expect(result.success).toBe(false);
      expect(result.error?.issues.find(issue => issue.message.includes('zawierać cyfrę'))).toBeDefined();
    });
  });

  describe('confirmPassword validation', () => {
    it('should fail when confirmPassword is empty', () => {
      // Given: empty confirmPassword
      const data = {
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: '',
      };

      // When: validate data
      const result = registerSchema.safeParse(data);

      // Then: should fail with empty confirmPassword error
      expect(result.success).toBe(false);
      expect(result.error?.issues.find(issue => issue.message.includes('wymagane'))).toBeDefined();
    });

    it('should fail when passwords do not match', () => {
      // Given: passwords don't match
      const data = {
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'different123',
      };

      // When: validate data
      const result = registerSchema.safeParse(data);

      // Then: should fail with password match error
      expect(result.success).toBe(false);
      expect(result.error?.issues.find(issue => issue.message.includes('identyczne'))).toBeDefined();
      expect(result.error?.issues.find(issue => issue.path.includes('confirmPassword'))).toBeDefined();
    });
  });
});

describe('checkPasswordRules', () => {
  it('should return all false for empty password', () => {
    // Given: empty password
    const password = '';

    // When: check rules
    const result = checkPasswordRules(password);

    // Then: all rules should be false
    expect(result).toEqual({
      hasMinLength: false,
      hasLetter: false,
      hasNumber: false,
    });
  });

  it('should return hasMinLength=true for 8+ chars', () => {
    // Given: 8 character password
    const password = '12345678';

    // When: check rules
    const result = checkPasswordRules(password);

    // Then: min length should be true, others false
    expect(result.hasMinLength).toBe(true);
    expect(result.hasLetter).toBe(false);
    expect(result.hasNumber).toBe(true);
  });

  it('should return hasLetter=true when contains letter', () => {
    // Given: password with letter
    const password = 'a1234567';

    // When: check rules
    const result = checkPasswordRules(password);

    // Then: letter rule should be true
    expect(result.hasLetter).toBe(true);
    expect(result.hasMinLength).toBe(true);
    expect(result.hasNumber).toBe(true);
  });

  it('should return hasNumber=true when contains number', () => {
    // Given: password with number
    const password = 'password1';

    // When: check rules
    const result = checkPasswordRules(password);

    // Then: number rule should be true
    expect(result.hasNumber).toBe(true);
    expect(result.hasMinLength).toBe(true);
    expect(result.hasLetter).toBe(true);
  });

  it('should return all true for valid password', () => {
    // Given: valid password meeting all requirements
    const password = 'password123';

    // When: check rules
    const result = checkPasswordRules(password);

    // Then: all rules should be true
    expect(result).toEqual({
      hasMinLength: true,
      hasLetter: true,
      hasNumber: true,
    });
  });

  it('should handle special characters', () => {
    // Given: password with special characters
    const password = 'P@ssw0rd!';

    // When: check rules
    const result = checkPasswordRules(password);

    // Then: should correctly identify rules
    expect(result.hasMinLength).toBe(true);
    expect(result.hasLetter).toBe(true);
    expect(result.hasNumber).toBe(true);
  });
});
