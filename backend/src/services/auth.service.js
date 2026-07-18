const { OAuth2Client } = require('google-auth-library');
const prisma = require('../prisma/client');
const ApiError = require('../utils/ApiError');
const config = require('../config/env');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');

const googleClient = new OAuth2Client(config.google.clientId);

/**
 * Verifies a Google ID token (issued to the frontend by Google Sign-In)
 * and returns its decoded payload.
 */
const verifyGoogleToken = async (idToken) => {
  let ticket;
  try {
    ticket = await googleClient.verifyIdToken({
      idToken,
      audience: config.google.clientId,
    });
  } catch (err) {
    throw ApiError.unauthorized('Invalid Google ID token');
  }

  const payload = ticket.getPayload();

  if (!payload || !payload.email) {
    throw ApiError.unauthorized('Google account did not return an email address');
  }

  if (!payload.email_verified) {
    throw ApiError.unauthorized('Google email address is not verified');
  }

  return payload;
};

/** Restricts login to the configured college domain (e.g. @ceconline.edu). */
const assertAllowedDomain = (email) => {
  const domain = email.split('@')[1]?.toLowerCase();
  if (domain !== config.allowedEmailDomain.toLowerCase()) {
    throw ApiError.forbidden(
      `Only @${config.allowedEmailDomain} email addresses are allowed to sign in`
    );
  }
};

/** Signs a new access/refresh token pair and persists the refresh token. */
const issueTokenPair = async (user) => {
  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const refreshToken = signRefreshToken({ sub: user.id });

  const decoded = verifyRefreshToken(refreshToken);
  const expiresAt = new Date(decoded.exp * 1000);

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt,
    },
  });

  return { accessToken, refreshToken };
};

/**
 * Logs a student in with a Google ID token:
 * 1. Verifies the token with Google.
 * 2. Restricts sign-in to the college email domain.
 * 3. Creates the user on first login, or updates their profile on return visits.
 * 4. Issues a fresh access/refresh token pair.
 */
const loginWithGoogle = async (idToken) => {
  const payload = await verifyGoogleToken(idToken);
  assertAllowedDomain(payload.email);

  const user = await prisma.user.upsert({
    where: { googleId: payload.sub },
    update: {
      name: payload.name || undefined,
      avatarUrl: payload.picture || undefined,
    },
    create: {
      email: payload.email.toLowerCase(),
      name: payload.name || payload.email.split('@')[0],
      googleId: payload.sub,
      avatarUrl: payload.picture || null,
    },
  });

  if (!user.isActive) {
    throw ApiError.forbidden('This account has been deactivated. Contact an administrator.');
  }

  const tokens = await issueTokenPair(user);

  return { user, tokens };
};

/**
 * Exchanges a valid, non-revoked refresh token for a new token pair.
 * The old refresh token is revoked (rotation) so it cannot be reused.
 */
const refreshAccessToken = async (refreshToken) => {
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (err) {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });

  if (!stored || stored.revoked || stored.expiresAt < new Date()) {
    throw ApiError.unauthorized('Refresh token is no longer valid');
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.sub } });

  if (!user || !user.isActive) {
    throw ApiError.unauthorized('User no longer exists or is inactive');
  }

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revoked: true },
  });

  const tokens = await issueTokenPair(user);

  return { user, tokens };
};

/** Revokes a refresh token so it can no longer be used (logout). */
const logout = async (refreshToken) => {
  if (!refreshToken) return;

  await prisma.refreshToken.updateMany({
    where: { token: refreshToken, revoked: false },
    data: { revoked: true },
  });
};

const getProfile = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  return user;
};

module.exports = {
  loginWithGoogle,
  refreshAccessToken,
  logout,
  getProfile,
};
