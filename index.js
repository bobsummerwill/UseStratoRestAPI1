/**
 * Simplified application for accessing assets owned by the user specified in credentials.yaml
 * using automated OAuth login
 */

// Import required packages
const express = require('express');
const bodyParser = require('body-parser');
const axios = require("axios");
const { oauthUtil } = require("blockapps-rest");
const fs = require('fs');
const yaml = require('js-yaml');

// Load credentials from YAML file
const credentials = yaml.load(fs.readFileSync('./credentials.yaml', 'utf8'));
const { 
  marketplaceUrl, 
  userCommonName, 
  baUsername, 
  baPassword, 
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
  const cacheKey = baUsername;
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

    // Fetch a new token using Resource Owner Password Credentials
    const tokenObj = await oauth.getAccessTokenByResourceOwnerCredential(
      baUsername,
      baPassword
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

/**
 * Function to create an Axios API client
 * @param {string} baseURL - The base URL for the API
 * @returns {AxiosInstance} Configured Axios client
 */
const createApiClient = (baseURL) => {
  const client = axios.create({
    baseURL,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    timeout: 60000, // Timeout set to 60 seconds
  });

  // Request interceptor to attach Authorization token
  client.interceptors.request.use(
    async (config) => {
      try {
        const token = await getUserToken();
        config.headers.Authorization = `Bearer ${token}`;
        return config;
      } catch (error) {
        return Promise.reject(error);
      }
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor to handle errors
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      return Promise.reject(error);
    }
  );

  return client;
};

// Initialize API client
const dbApiClient = createApiClient(`https://${marketplaceUrl}/cirrus/search`);

const app = express();
const port = 3000;

// Configure middleware
app.use(bodyParser.urlencoded({ extended: true }));

// Helper function to safely format JSON for display
const safelyFormatJSON = (obj) => {
    try {
        // Create a safe copy of the object without circular references
        const getCircularReplacer = () => {
            const seen = new WeakSet();
            return (key, value) => {
                if (typeof value === 'object' && value !== null) {
                    if (seen.has(value)) {
                        return '[Circular Reference]';
                    }
                    seen.add(value);
                }
                return value;
            };
        };
        
        // Stringify with circular reference handler
        const jsonString = JSON.stringify(obj, getCircularReplacer(), 2);
        
        // Escape HTML characters
        return jsonString
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
            .replace(/\n/g, '<br>')
            .replace(/\s{2}/g, '&nbsp;&nbsp;');
    } catch (error) {
        return `[Error formatting JSON: ${error.message}]`;
    }
};

// Setup Express route for the root page
app.get('/', async (req, res) => {
    try {
        // Get owner common name from credentials
        const ownerCommonName = `eq.${userCommonName}`;
        
        // API call: Get the asset data from the database
        let assetResult = null;
        let assetData = [];
        
        try {
            const params = { ownerCommonName };
            assetResult = await dbApiClient.get(
                `/BlockApps-Mercata-Asset`,
                { params }
            );
            
            if (assetResult && assetResult.data) {
                assetData = assetResult.data;
            }
        } catch (apiError) {
            console.error('API Error:', apiError.message);
        }
        
        // CSS styles for the page
        const styles = `
            <style>
                body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    margin: 0;
                    padding: 20px;
                    color: #333;
                }
                h1, h2, h3 {
                    color: #2c3e50;
                }
                .container {
                    max-width: 1200px;
                    margin: 0 auto;
                }
                .card {
                    background: #fff;
                    border-radius: 5px;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                    padding: 20px;
                    margin-bottom: 20px;
                }
                .asset-card {
                    background: #f9f9f9;
                    border-left: 4px solid #3498db;
                    padding: 15px;
                    margin-bottom: 10px;
                    border-radius: 4px;
                }
                .asset-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 10px;
                    font-weight: bold;
                }
                .asset-details {
                    background: #fff;
                    padding: 10px;
                    border-radius: 4px;
                    font-family: monospace;
                    font-size: 14px;
                }
            </style>
        `;
        
        // Render the page with results
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>STRATO REST API Sample</title>
                ${styles}
            </head>
            <body>
                <div class="container">
                    <h1>User Assets</h1>
                    
                    <div class="card">
                        <h2>User Information</h2>
                        <p><strong>Owner Common Name:</strong> ${ownerCommonName.replace('eq.', '')}</p>
                    </div>
                    
                    <div class="card">
                        <h2>Asset Results</h2>
                        ${assetData.length > 0 ? `
                            <p>Found ${assetData.length} assets for owner: ${ownerCommonName.replace('eq.', '')}</p>
                            ${assetData.map((asset, index) => `
                                <div class="asset-card">
                                    <div class="asset-header">
                                        <span>Asset #${index + 1}: ${asset.name || asset.id || 'Unnamed Asset'}</span>
                                        ${asset.type ? `<span>Type: ${asset.type}</span>` : ''}
                                    </div>
                                    <div class="asset-details">
                                        ${safelyFormatJSON(asset)}
                                    </div>
                                </div>
                            `).join('')}
                        ` : `
                            <p>No assets found from API for owner: ${ownerCommonName.replace('eq.', '')}</p>
                            <p>API Response Status: ${assetResult ? assetResult.status : 'No response'}</p>
                        `}
                    </div>
                </div>
            </body>
            </html>
        `);
    } catch (error) {
        res.status(500).send(`Error: ${error.message}`);
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Application listening at http://localhost:${port}`);
    console.log(`Visit http://localhost:${port} to view user assets`);
});
