process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-32chars!';
process.env.JWT_EXPIRES_IN = '1h';
process.env.FRONTEND_URL = 'http://localhost:4200';
process.env.N8N_WEBHOOK_URL = '';
process.env.N8N_WEBHOOK_SECRET = 'test-webhook-secret';

jest.mock('../../config/database', () => {
  const sequelize = {
    authenticate: jest.fn().mockResolvedValue(undefined),
    transaction: jest.fn(async (callback: (transaction: unknown) => Promise<unknown>) => callback({})),
    define: jest.fn()
  };

  return {
    __esModule: true,
    default: sequelize
  };
});

jest.mock('../../shared/services/WebhookService', () => ({
  __esModule: true,
  default: {
    dispatch: jest.fn()
  }
}));

jest.mock('../../shared/providers/MailProvider/ResendMailProvider', () => ({
  ResendMailProvider: jest.fn().mockImplementation(() => ({
    sendMail: jest.fn().mockResolvedValue(undefined)
  }))
}));
