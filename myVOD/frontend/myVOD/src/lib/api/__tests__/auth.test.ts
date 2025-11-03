import { describe, it, expect, beforeEach, vi } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { http } from '@/lib/http';
import {
  registerUser,
  loginUser,
  refreshAccessToken,
  getUserProfile,
  deleteAccount,
  changePassword
} from '../auth';
import type {
  RegisterUserCommand,
  RegisteredUserDto,
  LoginUserCommand,
  AuthTokensDto,
  UserProfileDto,
  ChangePasswordCommand,
  ChangePasswordResponse
} from '@/types/api.types';

// Mock data
const mockRegisteredUserDto: RegisteredUserDto = {
  email: 'test@example.com'
};

const mockAuthTokensDto: AuthTokensDto = {
  access: 'access-token-123',
  refresh: 'refresh-token-456'
};

const mockUserProfileDto: UserProfileDto = {
  id: 1,
  email: 'test@example.com',
  is_staff: false,
  selected_platforms: ['netflix', 'hbo']
};

const mockChangePasswordResponse: ChangePasswordResponse = {
  message: 'Password changed successfully'
};

describe('registerUser', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(http);
  });

  afterEach(() => {
    mock.restore();
  });

  it('should call POST /register/ with RegisterUserCommand', async () => {
    const command: RegisterUserCommand = {
      email: 'test@example.com',
      password: 'testpass123'
    };
    mock.onPost('/register/').reply(201, mockRegisteredUserDto);

    await registerUser(command);

    expect(mock.history.post).toHaveLength(1);
    expect(mock.history.post[0].url).toBe('/register/');
  });

  it('should send RegisterUserCommand in body', async () => {
    const command: RegisterUserCommand = {
      email: 'test@example.com',
      password: 'testpass123'
    };
    mock.onPost('/register/').reply(201, mockRegisteredUserDto);

    await registerUser(command);

    const requestData = JSON.parse(mock.history.post[0].data);
    expect(requestData).toEqual(command);
    expect(requestData.email).toBe('test@example.com');
    expect(requestData.password).toBe('testpass123');
  });

  it('should return RegisteredUserDto on success (201)', async () => {
    const command: RegisterUserCommand = {
      email: 'test@example.com',
      password: 'testpass123'
    };
    mock.onPost('/register/').reply(201, mockRegisteredUserDto);

    const result = await registerUser(command);

    expect(result).toEqual(mockRegisteredUserDto);
    expect(result.email).toBe('test@example.com');
  });

  it('should handle validation errors (400)', async () => {
    const command: RegisterUserCommand = {
      email: 'invalid-email',
      password: 'weak'
    };
    mock.onPost('/register/').reply(400, {
      email: ['Enter a valid email address.'],
      password: ['This password is too weak.']
    });

    await expect(registerUser(command)).rejects.toThrow();
  });
});

describe('loginUser', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(http);
  });

  afterEach(() => {
    mock.restore();
  });

  it('should call POST /token/ with LoginUserCommand', async () => {
    const command: LoginUserCommand = {
      email: 'test@example.com',
      password: 'testpass123'
    };
    mock.onPost('/token/').reply(200, mockAuthTokensDto);

    await loginUser(command);

    expect(mock.history.post).toHaveLength(1);
    expect(mock.history.post[0].url).toBe('/token/');
  });

  it('should send LoginUserCommand in body', async () => {
    const command: LoginUserCommand = {
      email: 'test@example.com',
      password: 'testpass123'
    };
    mock.onPost('/token/').reply(200, mockAuthTokensDto);

    await loginUser(command);

    const requestData = JSON.parse(mock.history.post[0].data);
    expect(requestData).toEqual(command);
    expect(requestData.email).toBe('test@example.com');
    expect(requestData.password).toBe('testpass123');
  });

  it('should return AuthTokensDto on success (200)', async () => {
    const command: LoginUserCommand = {
      email: 'test@example.com',
      password: 'testpass123'
    };
    mock.onPost('/token/').reply(200, mockAuthTokensDto);

    const result = await loginUser(command);

    expect(result).toEqual(mockAuthTokensDto);
    expect(result.access).toBe('access-token-123');
    expect(result.refresh).toBe('refresh-token-456');
  });

  it('should handle invalid credentials (401)', async () => {
    const command: LoginUserCommand = {
      email: 'test@example.com',
      password: 'wrongpassword'
    };
    mock.onPost('/token/').reply(401, {
      detail: 'No active account found with the given credentials'
    });

    await expect(loginUser(command)).rejects.toThrow();
  });
});

describe('refreshAccessToken', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(http);
  });

  afterEach(() => {
    mock.restore();
  });

  it('should call POST /token/refresh/ with refresh token', async () => {
    const refreshToken = 'refresh-token-123';
    mock.onPost('/token/refresh/').reply(200, { access: 'new-access-token' });

    await refreshAccessToken(refreshToken);

    expect(mock.history.post).toHaveLength(1);
    expect(mock.history.post[0].url).toBe('/token/refresh/');
  });

  it('should send refresh token in body', async () => {
    const refreshToken = 'refresh-token-123';
    mock.onPost('/token/refresh/').reply(200, { access: 'new-access-token' });

    await refreshAccessToken(refreshToken);

    const requestData = JSON.parse(mock.history.post[0].data);
    expect(requestData).toEqual({ refresh: refreshToken });
    expect(requestData.refresh).toBe('refresh-token-123');
  });

  it('should return new access token on success (200)', async () => {
    const refreshToken = 'refresh-token-123';
    const response = { access: 'new-access-token-456' };
    mock.onPost('/token/refresh/').reply(200, response);

    const result = await refreshAccessToken(refreshToken);

    expect(result).toEqual(response);
    expect(result.access).toBe('new-access-token-456');
  });

  it('should handle invalid refresh token (401)', async () => {
    const invalidRefreshToken = 'invalid-refresh-token';
    mock.onPost('/token/refresh/').reply(401, {
      detail: 'Token is invalid or expired'
    });

    await expect(refreshAccessToken(invalidRefreshToken)).rejects.toThrow();
  });
});

describe('getUserProfile', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(http);
  });

  afterEach(() => {
    mock.restore();
  });

  it('should call GET /me/', async () => {
    mock.onGet('/me/').reply(200, mockUserProfileDto);

    await getUserProfile();

    expect(mock.history.get).toHaveLength(1);
    expect(mock.history.get[0].url).toBe('/me/');
  });

  it('should return UserProfileDto on success (200)', async () => {
    mock.onGet('/me/').reply(200, mockUserProfileDto);

    const result = await getUserProfile();

    expect(result).toEqual(mockUserProfileDto);
    expect(result.id).toBe(1);
    expect(result.email).toBe('test@example.com');
    expect(result.is_staff).toBe(false);
    expect(result.selected_platforms).toEqual(['netflix', 'hbo']);
  });

  it('should handle 401 Unauthorized', async () => {
    mock.onGet('/me/').reply(401, {
      detail: 'Authentication credentials were not provided.'
    });

    await expect(getUserProfile()).rejects.toThrow();
  });

  it('should handle server errors (500)', async () => {
    mock.onGet('/me/').reply(500, {
      detail: 'Internal server error'
    });

    await expect(getUserProfile()).rejects.toThrow();
  });
});

describe('getUserProfile - Comprehensive Error Handling', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(http);
  });

  afterEach(() => {
    mock.restore();
  });

  it('should handle network connection refused (ECONNREFUSED)', async () => {
    mock.onGet('/me/').networkError();

    await expect(getUserProfile()).rejects.toThrow();
  });

  it('should handle network timeout (408)', async () => {
    mock.onGet('/me/').reply(408, {
      detail: 'Request timeout'
    });

    await expect(getUserProfile()).rejects.toThrow();
  });

  it('should handle server unavailable (503)', async () => {
    mock.onGet('/me/').reply(503, {
      detail: 'Service temporarily unavailable'
    });

    await expect(getUserProfile()).rejects.toThrow();
  });

  it('should handle gateway timeout (504)', async () => {
    mock.onGet('/me/').reply(504, {
      detail: 'Gateway timeout'
    });

    await expect(getUserProfile()).rejects.toThrow();
  });

  it('should handle malformed JSON response (500)', async () => {
    mock.onGet('/me/').reply(500, 'Internal server error - not JSON');

    await expect(getUserProfile()).rejects.toThrow();
  });

  it('should handle HTML error response instead of JSON (500)', async () => {
    mock.onGet('/me/').reply(500, '<html><body>Server Error</body></html>', {
      'content-type': 'text/html'
    });

    await expect(getUserProfile()).rejects.toThrow();
  });

  it('should handle forbidden access (403)', async () => {
    mock.onGet('/me/').reply(403, {
      detail: 'Access forbidden'
    });

    await expect(getUserProfile()).rejects.toThrow();
  });

  it('should handle too many requests (429)', async () => {
    mock.onGet('/me/').reply(429, {
      detail: 'Too many requests. Try again later.'
    });

    await expect(getUserProfile()).rejects.toThrow();
  });

  it('should handle conflict state (409)', async () => {
    mock.onGet('/me/').reply(409, {
      detail: 'Profile access conflict'
    });

    await expect(getUserProfile()).rejects.toThrow();
  });

  it('should handle unprocessable entity (422)', async () => {
    mock.onGet('/me/').reply(422, {
      detail: 'Invalid profile request'
    });

    await expect(getUserProfile()).rejects.toThrow();
  });

  it('should handle bad gateway (502)', async () => {
    mock.onGet('/me/').reply(502, {
      detail: 'Bad gateway'
    });

    await expect(getUserProfile()).rejects.toThrow();
  });
});

describe('deleteAccount', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(http);
  });

  afterEach(() => {
    mock.restore();
  });

  it('should call DELETE /me/', async () => {
    mock.onDelete('/me/').reply(204);

    await deleteAccount();

    expect(mock.history.delete).toHaveLength(1);
    expect(mock.history.delete[0].url).toBe('/me/');
  });

  it('should return void on success (204)', async () => {
    mock.onDelete('/me/').reply(204);

    const result = await deleteAccount();

    expect(result).toBeUndefined();
  });

  it('should handle 401 Unauthorized', async () => {
    mock.onDelete('/me/').reply(401, {
      detail: 'Authentication credentials were not provided.'
    });

    await expect(deleteAccount()).rejects.toThrow();
  });
});

describe('deleteAccount - Comprehensive Error Handling', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(http);
  });

  afterEach(() => {
    mock.restore();
  });

  it('should handle network connection refused (ECONNREFUSED)', async () => {
    mock.onDelete('/me/').networkError();

    await expect(deleteAccount()).rejects.toThrow();
  });

  it('should handle network timeout (408)', async () => {
    mock.onDelete('/me/').reply(408, {
      detail: 'Request timeout'
    });

    await expect(deleteAccount()).rejects.toThrow();
  });

  it('should handle server unavailable (503)', async () => {
    mock.onDelete('/me/').reply(503, {
      detail: 'Service temporarily unavailable'
    });

    await expect(deleteAccount()).rejects.toThrow();
  });

  it('should handle gateway timeout (504)', async () => {
    mock.onDelete('/me/').reply(504, {
      detail: 'Gateway timeout'
    });

    await expect(deleteAccount()).rejects.toThrow();
  });

  it('should handle malformed JSON response (500)', async () => {
    mock.onDelete('/me/').reply(500, 'Internal server error - not JSON');

    await expect(deleteAccount()).rejects.toThrow();
  });

  it('should handle HTML error response instead of JSON (500)', async () => {
    mock.onDelete('/me/').reply(500, '<html><body>Server Error</body></html>', {
      'content-type': 'text/html'
    });

    await expect(deleteAccount()).rejects.toThrow();
  });

  it('should handle forbidden access (403)', async () => {
    mock.onDelete('/me/').reply(403, {
      detail: 'Account deletion forbidden'
    });

    await expect(deleteAccount()).rejects.toThrow();
  });

  it('should handle too many requests (429)', async () => {
    mock.onDelete('/me/').reply(429, {
      detail: 'Too many deletion attempts. Try again later.'
    });

    await expect(deleteAccount()).rejects.toThrow();
  });

  it('should handle conflict state (409)', async () => {
    mock.onDelete('/me/').reply(409, {
      detail: 'Account deletion conflict'
    });

    await expect(deleteAccount()).rejects.toThrow();
  });

  it('should handle unprocessable entity (422)', async () => {
    mock.onDelete('/me/').reply(422, {
      detail: 'Invalid account deletion request'
    });

    await expect(deleteAccount()).rejects.toThrow();
  });

  it('should handle bad gateway (502)', async () => {
    mock.onDelete('/me/').reply(502, {
      detail: 'Bad gateway'
    });

    await expect(deleteAccount()).rejects.toThrow();
  });
});

describe('changePassword', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(http);
  });

  afterEach(() => {
    mock.restore();
  });

  it('should call POST /me/change-password/ with ChangePasswordCommand', async () => {
    const command: ChangePasswordCommand = {
      current_password: 'oldpass123',
      new_password: 'newpass456'
    };
    mock.onPost('/me/change-password/').reply(200, mockChangePasswordResponse);

    await changePassword(command);

    expect(mock.history.post).toHaveLength(1);
    expect(mock.history.post[0].url).toBe('/me/change-password/');
  });

  it('should send ChangePasswordCommand in body', async () => {
    const command: ChangePasswordCommand = {
      current_password: 'oldpass123',
      new_password: 'newpass456'
    };
    mock.onPost('/me/change-password/').reply(200, mockChangePasswordResponse);

    await changePassword(command);

    const requestData = JSON.parse(mock.history.post[0].data);
    expect(requestData).toEqual(command);
    expect(requestData.current_password).toBe('oldpass123');
    expect(requestData.new_password).toBe('newpass456');
  });

  it('should return ChangePasswordResponse on success (200)', async () => {
    const command: ChangePasswordCommand = {
      current_password: 'oldpass123',
      new_password: 'newpass456'
    };
    mock.onPost('/me/change-password/').reply(200, mockChangePasswordResponse);

    const result = await changePassword(command);

    expect(result).toEqual(mockChangePasswordResponse);
    expect(result.message).toBe('Password changed successfully');
  });

  it('should handle 400 bad request (wrong current password)', async () => {
    const command: ChangePasswordCommand = {
      current_password: 'wrongpass',
      new_password: 'newpass456'
    };
    mock.onPost('/me/change-password/').reply(400, {
      current_password: ['Current password is incorrect.']
    });

    await expect(changePassword(command)).rejects.toThrow();
  });
});

// ========================================
// EDGE CASES & VALIDATION TESTS (Batch 4)
// ========================================

describe('registerUser - Edge Cases', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(http);
  });

  afterEach(() => {
    mock.restore();
  });

  it('should handle empty email', async () => {
    const command: RegisterUserCommand = {
      email: '',
      password: 'testpass123'
    };
    mock.onPost('/register/').reply(400, {
      email: ['This field may not be blank.']
    });

    await expect(registerUser(command)).rejects.toThrow();
  });

  it('should handle null email', async () => {
    const command = {
      email: null as any,
      password: 'testpass123'
    };
    mock.onPost('/register/').reply(400, {
      email: ['This field may not be null.']
    });

    await expect(registerUser(command)).rejects.toThrow();
  });

  it('should handle empty password', async () => {
    const command: RegisterUserCommand = {
      email: 'test@example.com',
      password: ''
    };
    mock.onPost('/register/').reply(400, {
      password: ['This field may not be blank.']
    });

    await expect(registerUser(command)).rejects.toThrow();
  });

  it('should handle very long email', async () => {
    const longEmail = 'a'.repeat(200) + '@example.com';
    const command: RegisterUserCommand = {
      email: longEmail,
      password: 'testpass123'
    };
    mock.onPost('/register/').reply(400, {
      email: ['Email is too long.']
    });

    await expect(registerUser(command)).rejects.toThrow();
  });

  it('should handle email with unicode characters', async () => {
    const command: RegisterUserCommand = {
      email: 'tëst.ünicöde@exämple.cöm',
      password: 'testpass123'
    };
    mock.onPost('/register/').reply(201, mockRegisteredUserDto);

    const result = await registerUser(command);
    expect(result).toEqual(mockRegisteredUserDto);
  });

  it('should handle email already exists (409)', async () => {
    const command: RegisterUserCommand = {
      email: 'existing@example.com',
      password: 'testpass123'
    };
    mock.onPost('/register/').reply(409, {
      email: ['User with this email already exists.']
    });

    await expect(registerUser(command)).rejects.toThrow();
  });

  it('should handle weak password', async () => {
    const command: RegisterUserCommand = {
      email: 'test@example.com',
      password: '123'
    };
    mock.onPost('/register/').reply(400, {
      password: ['This password is too weak.']
    });

    await expect(registerUser(command)).rejects.toThrow();
  });
});

describe('loginUser - Edge Cases', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(http);
  });

  afterEach(() => {
    mock.restore();
  });

  it('should handle empty email', async () => {
    const command: LoginUserCommand = {
      email: '',
      password: 'testpass123'
    };
    mock.onPost('/token/').reply(400, {
      email: ['This field may not be blank.']
    });

    await expect(loginUser(command)).rejects.toThrow();
  });

  it('should handle null email', async () => {
    const command = {
      email: null as any,
      password: 'testpass123'
    };
    mock.onPost('/token/').reply(400, {
      email: ['This field may not be null.']
    });

    await expect(loginUser(command)).rejects.toThrow();
  });

  it('should handle empty password', async () => {
    const command: LoginUserCommand = {
      email: 'test@example.com',
      password: ''
    };
    mock.onPost('/token/').reply(400, {
      password: ['This field may not be blank.']
    });

    await expect(loginUser(command)).rejects.toThrow();
  });

  it('should handle very long email', async () => {
    const longEmail = 'a'.repeat(200) + '@example.com';
    const command: LoginUserCommand = {
      email: longEmail,
      password: 'testpass123'
    };
    mock.onPost('/token/').reply(400, {
      email: ['Email is too long.']
    });

    await expect(loginUser(command)).rejects.toThrow();
  });

  it('should handle email with unicode characters', async () => {
    const command: LoginUserCommand = {
      email: 'tëst.ünicöde@exämple.cöm',
      password: 'testpass123'
    };
    mock.onPost('/token/').reply(200, mockAuthTokensDto);

    const result = await loginUser(command);
    expect(result).toEqual(mockAuthTokensDto);
  });

  it('should handle non-existent user (404)', async () => {
    const command: LoginUserCommand = {
      email: 'nonexistent@example.com',
      password: 'testpass123'
    };
    mock.onPost('/token/').reply(401, {
      detail: 'No active account found with the given credentials'
    });

    await expect(loginUser(command)).rejects.toThrow();
  });

  it('should handle account disabled (401)', async () => {
    const command: LoginUserCommand = {
      email: 'disabled@example.com',
      password: 'testpass123'
    };
    mock.onPost('/token/').reply(401, {
      detail: 'User account is disabled.'
    });

    await expect(loginUser(command)).rejects.toThrow();
  });

  it('should handle too many login attempts (429)', async () => {
    const command: LoginUserCommand = {
      email: 'test@example.com',
      password: 'wrongpass'
    };
    mock.onPost('/token/').reply(429, {
      detail: 'Too many login attempts. Try again later.'
    });

    await expect(loginUser(command)).rejects.toThrow();
  });
});

describe('changePassword - Edge Cases', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(http);
  });

  afterEach(() => {
    mock.restore();
  });

  it('should handle empty current password', async () => {
    const command: ChangePasswordCommand = {
      current_password: '',
      new_password: 'newpass456'
    };
    mock.onPost('/me/change-password/').reply(400, {
      current_password: ['This field may not be blank.']
    });

    await expect(changePassword(command)).rejects.toThrow();
  });

  it('should handle empty new password', async () => {
    const command: ChangePasswordCommand = {
      current_password: 'oldpass123',
      new_password: ''
    };
    mock.onPost('/me/change-password/').reply(400, {
      new_password: ['This field may not be blank.']
    });

    await expect(changePassword(command)).rejects.toThrow();
  });

  it('should handle null values', async () => {
    const command = {
      current_password: null as any,
      new_password: null as any
    };
    mock.onPost('/me/change-password/').reply(400, {
      current_password: ['This field may not be null.'],
      new_password: ['This field may not be null.']
    });

    await expect(changePassword(command)).rejects.toThrow();
  });

  it('should handle new password same as current', async () => {
    const command: ChangePasswordCommand = {
      current_password: 'samepass123',
      new_password: 'samepass123'
    };
    mock.onPost('/me/change-password/').reply(400, {
      new_password: ['New password must be different from current password.']
    });

    await expect(changePassword(command)).rejects.toThrow();
  });

  it('should handle weak new password', async () => {
    const command: ChangePasswordCommand = {
      current_password: 'oldpass123',
      new_password: '123'
    };
    mock.onPost('/me/change-password/').reply(400, {
      new_password: ['This password is too weak.']
    });

    await expect(changePassword(command)).rejects.toThrow();
  });

  it('should handle very long passwords', async () => {
    const longPassword = 'a'.repeat(300);
    const command: ChangePasswordCommand = {
      current_password: 'oldpass123',
      new_password: longPassword
    };
    mock.onPost('/me/change-password/').reply(400, {
      new_password: ['Password is too long.']
    });

    await expect(changePassword(command)).rejects.toThrow();
  });

  it('should handle password change during rate limit (429)', async () => {
    const command: ChangePasswordCommand = {
      current_password: 'oldpass123',
      new_password: 'newpass456'
    };
    mock.onPost('/me/change-password/').reply(429, {
      detail: 'Too many password change attempts. Try again later.'
    });

    await expect(changePassword(command)).rejects.toThrow();
  });

  it('should handle password change with unicode characters', async () => {
    const command: ChangePasswordCommand = {
      current_password: 'oldpass123',
      new_password: 'nëw.pässwörd.123'
    };
    mock.onPost('/me/change-password/').reply(200, mockChangePasswordResponse);

    const result = await changePassword(command);
    expect(result).toEqual(mockChangePasswordResponse);
  });
});

describe('changePassword - Comprehensive Error Handling', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(http);
  });

  afterEach(() => {
    mock.restore();
  });

  it('should handle network connection refused (ECONNREFUSED)', async () => {
    const command: ChangePasswordCommand = {
      current_password: 'oldpass123',
      new_password: 'newpass456'
    };
    mock.onPost('/me/change-password/').networkError();

    await expect(changePassword(command)).rejects.toThrow();
  });

  it('should handle network timeout (408)', async () => {
    const command: ChangePasswordCommand = {
      current_password: 'oldpass123',
      new_password: 'newpass456'
    };
    mock.onPost('/me/change-password/').reply(408, {
      detail: 'Request timeout'
    });

    await expect(changePassword(command)).rejects.toThrow();
  });

  it('should handle server unavailable (503)', async () => {
    const command: ChangePasswordCommand = {
      current_password: 'oldpass123',
      new_password: 'newpass456'
    };
    mock.onPost('/me/change-password/').reply(503, {
      detail: 'Service temporarily unavailable'
    });

    await expect(changePassword(command)).rejects.toThrow();
  });

  it('should handle gateway timeout (504)', async () => {
    const command: ChangePasswordCommand = {
      current_password: 'oldpass123',
      new_password: 'newpass456'
    };
    mock.onPost('/me/change-password/').reply(504, {
      detail: 'Gateway timeout'
    });

    await expect(changePassword(command)).rejects.toThrow();
  });

  it('should handle malformed JSON response (500)', async () => {
    const command: ChangePasswordCommand = {
      current_password: 'oldpass123',
      new_password: 'newpass456'
    };
    mock.onPost('/me/change-password/').reply(500, 'Internal server error - not JSON');

    await expect(changePassword(command)).rejects.toThrow();
  });

  it('should handle HTML error response instead of JSON (500)', async () => {
    const command: ChangePasswordCommand = {
      current_password: 'oldpass123',
      new_password: 'newpass456'
    };
    mock.onPost('/me/change-password/').reply(500, '<html><body>Server Error</body></html>', {
      'content-type': 'text/html'
    });

    await expect(changePassword(command)).rejects.toThrow();
  });

  it('should handle forbidden access (403)', async () => {
    const command: ChangePasswordCommand = {
      current_password: 'oldpass123',
      new_password: 'newpass456'
    };
    mock.onPost('/me/change-password/').reply(403, {
      detail: 'Password change forbidden'
    });

    await expect(changePassword(command)).rejects.toThrow();
  });

  it('should handle conflict state (409)', async () => {
    const command: ChangePasswordCommand = {
      current_password: 'oldpass123',
      new_password: 'newpass456'
    };
    mock.onPost('/me/change-password/').reply(409, {
      detail: 'Password change conflict'
    });

    await expect(changePassword(command)).rejects.toThrow();
  });

  it('should handle unprocessable entity (422)', async () => {
    const command: ChangePasswordCommand = {
      current_password: 'oldpass123',
      new_password: 'newpass456'
    };
    mock.onPost('/me/change-password/').reply(422, {
      detail: 'Invalid password change request'
    });

    await expect(changePassword(command)).rejects.toThrow();
  });

  it('should handle bad gateway (502)', async () => {
    const command: ChangePasswordCommand = {
      current_password: 'oldpass123',
      new_password: 'newpass456'
    };
    mock.onPost('/me/change-password/').reply(502, {
      detail: 'Bad gateway'
    });

    await expect(changePassword(command)).rejects.toThrow();
  });
});

describe('Network & Server Error Edge Cases', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(http);
  });

  afterEach(() => {
    mock.restore();
  });

  it('should handle network timeout (408)', async () => {
    const command: RegisterUserCommand = {
      email: 'test@example.com',
      password: 'testpass123'
    };
    mock.onPost('/register/').reply(408, {
      detail: 'Request timeout'
    });

    await expect(registerUser(command)).rejects.toThrow();
  });

  it('should handle server maintenance (503)', async () => {
    const command: LoginUserCommand = {
      email: 'test@example.com',
      password: 'testpass123'
    };
    mock.onPost('/token/').reply(503, {
      detail: 'Service temporarily unavailable'
    });

    await expect(loginUser(command)).rejects.toThrow();
  });

  it('should handle malformed JSON response (500)', async () => {
    mock.onPost('/register/').reply(500, 'Internal server error - not JSON');

    const command: RegisterUserCommand = {
      email: 'test@example.com',
      password: 'testpass123'
    };

    await expect(registerUser(command)).rejects.toThrow();
  });

  it('should handle empty response body (204)', async () => {
    mock.onPost('/register/').reply(204);

    const command: RegisterUserCommand = {
      email: 'test@example.com',
      password: 'testpass123'
    };

    const result = await registerUser(command);
    expect(result).toBeUndefined();
  });
});

// ========================================
// BATCH 5: KOMPLEKSOWE TESTY BŁĘDÓW API
// ========================================

describe('loginUser - Comprehensive Error Handling', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(http);
  });

  afterEach(() => {
    mock.restore();
  });

  it('should handle network connection refused (ECONNREFUSED)', async () => {
    mock.onPost('/token/').networkError();

    const command: LoginUserCommand = {
      email: 'test@example.com',
      password: 'testpass123'
    };

    await expect(loginUser(command)).rejects.toThrow();
  });

  it('should handle network timeout (408)', async () => {
    mock.onPost('/token/').reply(408, {
      detail: 'Request timeout'
    });

    const command: LoginUserCommand = {
      email: 'test@example.com',
      password: 'testpass123'
    };

    await expect(loginUser(command)).rejects.toThrow();
  });

  it('should handle server unavailable (503)', async () => {
    mock.onPost('/token/').reply(503, {
      detail: 'Service temporarily unavailable'
    });

    const command: LoginUserCommand = {
      email: 'test@example.com',
      password: 'testpass123'
    };

    await expect(loginUser(command)).rejects.toThrow();
  });

  it('should handle gateway timeout (504)', async () => {
    mock.onPost('/token/').reply(504, {
      detail: 'Gateway timeout'
    });

    const command: LoginUserCommand = {
      email: 'test@example.com',
      password: 'testpass123'
    };

    await expect(loginUser(command)).rejects.toThrow();
  });

  it('should handle malformed JSON response (500)', async () => {
    mock.onPost('/token/').reply(500, 'Internal server error - not JSON');

    const command: LoginUserCommand = {
      email: 'test@example.com',
      password: 'testpass123'
    };

    await expect(loginUser(command)).rejects.toThrow();
  });

  it('should handle HTML error response instead of JSON (500)', async () => {
    mock.onPost('/token/').reply(500, '<html><body>Server Error</body></html>', {
      'content-type': 'text/html'
    });

    const command: LoginUserCommand = {
      email: 'test@example.com',
      password: 'testpass123'
    };

    await expect(loginUser(command)).rejects.toThrow();
  });

  it('should handle forbidden access (403)', async () => {
    mock.onPost('/token/').reply(403, {
      detail: 'Access forbidden'
    });

    const command: LoginUserCommand = {
      email: 'test@example.com',
      password: 'testpass123'
    };

    await expect(loginUser(command)).rejects.toThrow();
  });

  it('should handle conflict state (409)', async () => {
    mock.onPost('/token/').reply(409, {
      detail: 'Account state conflict'
    });

    const command: LoginUserCommand = {
      email: 'test@example.com',
      password: 'testpass123'
    };

    await expect(loginUser(command)).rejects.toThrow();
  });
});

describe('registerUser - Comprehensive Error Handling', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(http);
  });

  afterEach(() => {
    mock.restore();
  });

  it('should handle network connection refused (ECONNREFUSED)', async () => {
    mock.onPost('/register/').networkError();

    const command: RegisterUserCommand = {
      email: 'test@example.com',
      password: 'testpass123'
    };

    await expect(registerUser(command)).rejects.toThrow();
  });

  it('should handle network timeout (408)', async () => {
    mock.onPost('/register/').reply(408, {
      detail: 'Request timeout'
    });

    const command: RegisterUserCommand = {
      email: 'test@example.com',
      password: 'testpass123'
    };

    await expect(registerUser(command)).rejects.toThrow();
  });

  it('should handle server unavailable (503)', async () => {
    mock.onPost('/register/').reply(503, {
      detail: 'Service temporarily unavailable'
    });

    const command: RegisterUserCommand = {
      email: 'test@example.com',
      password: 'testpass123'
    };

    await expect(registerUser(command)).rejects.toThrow();
  });

  it('should handle gateway timeout (504)', async () => {
    mock.onPost('/register/').reply(504, {
      detail: 'Gateway timeout'
    });

    const command: RegisterUserCommand = {
      email: 'test@example.com',
      password: 'testpass123'
    };

    await expect(registerUser(command)).rejects.toThrow();
  });

  it('should handle malformed JSON response (500)', async () => {
    mock.onPost('/register/').reply(500, 'Internal server error - not JSON');

    const command: RegisterUserCommand = {
      email: 'test@example.com',
      password: 'testpass123'
    };

    await expect(registerUser(command)).rejects.toThrow();
  });

  it('should handle HTML error response instead of JSON (500)', async () => {
    mock.onPost('/register/').reply(500, '<html><body>Server Error</body></html>', {
      'content-type': 'text/html'
    });

    const command: RegisterUserCommand = {
      email: 'test@example.com',
      password: 'testpass123'
    };

    await expect(registerUser(command)).rejects.toThrow();
  });

  it('should handle forbidden access (403)', async () => {
    mock.onPost('/register/').reply(403, {
      detail: 'Registration not allowed'
    });

    const command: RegisterUserCommand = {
      email: 'test@example.com',
      password: 'testpass123'
    };

    await expect(registerUser(command)).rejects.toThrow();
  });

  it('should handle too many requests (429)', async () => {
    mock.onPost('/register/').reply(429, {
      detail: 'Too many registration attempts. Try again later.'
    });

    const command: RegisterUserCommand = {
      email: 'test@example.com',
      password: 'testpass123'
    };

    await expect(registerUser(command)).rejects.toThrow();
  });

  it('should handle unprocessable entity (422)', async () => {
    mock.onPost('/register/').reply(422, {
      detail: 'Invalid registration data'
    });

    const command: RegisterUserCommand = {
      email: 'test@example.com',
      password: 'testpass123'
    };

    await expect(registerUser(command)).rejects.toThrow();
  });
});

describe('refreshAccessToken - Comprehensive Error Handling', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(http);
  });

  afterEach(() => {
    mock.restore();
  });

  it('should handle network connection refused (ECONNREFUSED)', async () => {
    mock.onPost('/token/refresh/').networkError();

    await expect(refreshAccessToken('refresh-token-123')).rejects.toThrow();
  });

  it('should handle network timeout (408)', async () => {
    mock.onPost('/token/refresh/').reply(408, {
      detail: 'Request timeout'
    });

    await expect(refreshAccessToken('refresh-token-123')).rejects.toThrow();
  });

  it('should handle server unavailable (503)', async () => {
    mock.onPost('/token/refresh/').reply(503, {
      detail: 'Service temporarily unavailable'
    });

    await expect(refreshAccessToken('refresh-token-123')).rejects.toThrow();
  });

  it('should handle gateway timeout (504)', async () => {
    mock.onPost('/token/refresh/').reply(504, {
      detail: 'Gateway timeout'
    });

    await expect(refreshAccessToken('refresh-token-123')).rejects.toThrow();
  });

  it('should handle malformed JSON response (500)', async () => {
    mock.onPost('/token/refresh/').reply(500, 'Internal server error - not JSON');

    await expect(refreshAccessToken('refresh-token-123')).rejects.toThrow();
  });

  it('should handle HTML error response instead of JSON (500)', async () => {
    mock.onPost('/token/refresh/').reply(500, '<html><body>Server Error</body></html>', {
      'content-type': 'text/html'
    });

    await expect(refreshAccessToken('refresh-token-123')).rejects.toThrow();
  });

  it('should handle forbidden access (403)', async () => {
    mock.onPost('/token/refresh/').reply(403, {
      detail: 'Refresh token forbidden'
    });

    await expect(refreshAccessToken('refresh-token-123')).rejects.toThrow();
  });

  it('should handle too many requests (429)', async () => {
    mock.onPost('/token/refresh/').reply(429, {
      detail: 'Too many refresh attempts. Try again later.'
    });

    await expect(refreshAccessToken('refresh-token-123')).rejects.toThrow();
  });

  it('should handle conflict state (409)', async () => {
    mock.onPost('/token/refresh/').reply(409, {
      detail: 'Token refresh conflict'
    });

    await expect(refreshAccessToken('refresh-token-123')).rejects.toThrow();
  });

  it('should handle unprocessable entity (422)', async () => {
    mock.onPost('/token/refresh/').reply(422, {
      detail: 'Invalid refresh token format'
    });

    await expect(refreshAccessToken('refresh-token-123')).rejects.toThrow();
  });

  it('should handle bad gateway (502)', async () => {
    mock.onPost('/token/refresh/').reply(502, {
      detail: 'Bad gateway'
    });

    await expect(refreshAccessToken('refresh-token-123')).rejects.toThrow();
  });
});
