import { validationSchema } from './validation.schema';

describe('validation.schema', () => {
  it('requires LLM_API_KEY when AI_TOOLS_ENABLED is true', () => {
    const { error } = validationSchema.validate({
      JWT_SECRET: 'a',
      JWT_REFRESH_SECRET: 'b',
      DATABASE_URL: 'postgres://x',
      PROJECT_NAME: 'p',
      FRONTEND_URL: 'http://localhost:3000',
      SMTP_HOST: 'h',
      SMTP_PORT: 25,
      SMTP_USER: 'u',
      SMTP_PASS: 'p',
      SMTP_FROM_EMAIL: 'a@b.com',
      CLOUDINARY_CLOUD_NAME: 'c',
      CLOUDINARY_API_KEY: 'k',
      CLOUDINARY_API_SECRET: 's',
      GOOGLE_CLIENT_ID: 'g',
      GOOGLE_CLIENT_SECRET: 'g',
      GOOGLE_CALLBACK_URL: 'http://cb',
      AI_TOOLS_ENABLED: 'true',
      LLM_PROVIDER: 'mistral',
    });
    expect(error).toBeTruthy();
  });

  it('allows empty LLM_API_KEY when AI_TOOLS_ENABLED is false', () => {
    const { error } = validationSchema.validate({
      JWT_SECRET: 'a',
      JWT_REFRESH_SECRET: 'b',
      DATABASE_URL: 'postgres://x',
      PROJECT_NAME: 'p',
      FRONTEND_URL: 'http://localhost:3000',
      SMTP_HOST: 'h',
      SMTP_PORT: 25,
      SMTP_USER: 'u',
      SMTP_PASS: 'p',
      SMTP_FROM_EMAIL: 'a@b.com',
      CLOUDINARY_CLOUD_NAME: 'c',
      CLOUDINARY_API_KEY: 'k',
      CLOUDINARY_API_SECRET: 's',
      GOOGLE_CLIENT_ID: 'g',
      GOOGLE_CLIENT_SECRET: 'g',
      GOOGLE_CALLBACK_URL: 'http://cb',
      AI_TOOLS_ENABLED: 'false',
      LLM_PROVIDER: 'mistral',
      LLM_API_KEY: '',
    });
    expect(error).toBeFalsy();
  });
});
