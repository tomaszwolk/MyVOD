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
