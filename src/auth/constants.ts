export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export const REFRESH_TOKEN_EXPIRATION_TIME = 7 * 24 * 60 * 60; // 7 days in seconds
