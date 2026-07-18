const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const authService = require('../services/auth.service');

// Never leak internal fields (googleId, etc.) back to the client.
const sanitizeUser = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  avatarUrl: user.avatarUrl,
  role: user.role,
  isActive: user.isActive,
  createdAt: user.createdAt,
});

// POST /api/v1/auth/google
const googleLogin = asyncHandler(async (req, res) => {
  const { idToken } = req.body;
  const { user, tokens } = await authService.loginWithGoogle(idToken);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        user: sanitizeUser(user),
        ...tokens,
      },
      'Logged in successfully'
    )
  );
});

// POST /api/v1/auth/refresh
const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const { user, tokens } = await authService.refreshAccessToken(refreshToken);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        user: sanitizeUser(user),
        ...tokens,
      },
      'Token refreshed successfully'
    )
  );
});

// POST /api/v1/auth/logout
const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  await authService.logout(refreshToken);

  res.status(200).json(new ApiResponse(200, null, 'Logged out successfully'));
});

// GET /api/v1/auth/me
const me = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, { user: sanitizeUser(req.user) }, 'Current user'));
});

module.exports = { googleLogin, refresh, logout, me };
