/**
 * Authentication utilities for STRATO REST API
 */

const { oauthUtil } = require("blockapps-rest");
const fs = require('fs');
const yaml = require('js-yaml');

// Load credentials from YAML file
const credentials = yaml.load(fs.readFileSync('./credentials.yaml', 'utf8'));
const { 
  clientId, 
  clientSecret 
} = credentials;

// OAuth configuration
const oauthInit = {
  appTokenCookieName: "asset_framework_session",
  appTokenCookieMaxAge: 7776000000,
  openIdDiscoveryUrl: "https://keycloak.blockapps.net/auth/realms/mercata/.well-known/openid-configuration",
  clientId,
  clientSecret,
  scope: "email openid",
  tokenField: "access_token",
  redirectUri: "http://localhost/api/v1/authentication/callback",
  logoutRedirectUri: "http://localhost"
};

const CACHED_DATA = {};

const TOKEN_LIFETIME_RESERVE_SECONDS = 120; // Reserve 2 minutes for token expiration check

/**
 * Retrieves the user token, either from cache or by requesting a new one.
 * @returns {Promise<string>} - The OAuth token
 * @throws Will throw an error if the token retrieval process fails.
 */
const getUserToken = async () => {
  const cacheKey = clientId;
  const userTokenData = CACHED_DATA[cacheKey];
  const currentTime = Math.floor(Date.now() / 1000);

  // Check if a valid cached token exists
  if (
    userTokenData &&
    userTokenData.token &&
    userTokenData.expiresAt > currentTime + TOKEN_LIFETIME_RESERVE_SECONDS
  ) {
    console.log("Returning cached token");
    return userTokenData.token;
  }

  try {
    // Initialize OAuth only if no valid cached token is available
    const oauth = await oauthUtil.init(oauthInit);

    // Fetch a new token using Client ID and secret
    const tokenObj = await oauth.getAccessTokenByClientSecret(
      clientId,
      clientSecret
    );

    const token = tokenObj.token[oauthInit.tokenField];
    const expiresAt = Math.floor(tokenObj.token.expires_at / 1000);
    console.log("New OAuth token expires at:", new Date(expiresAt * 1000));
    // Cache the new token
    CACHED_DATA[cacheKey] = { token, expiresAt };

    console.log("Returning new OAuth token");
    return token;
  } catch (error) {
    console.error("Error fetching user OAuth token:", error);
    throw new Error("Failed to fetch user OAuth token");
  }
};

module.exports = {
  getUserToken
};
