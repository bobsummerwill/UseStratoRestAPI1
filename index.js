/**
 * Simplified application for accessing assets owned by the user specified in credentials.yaml
 * using automated OAuth login
 */

// Import required packages
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const yaml = require('js-yaml');
const axios = require("axios");
const { oauthUtil } = require("blockapps-rest");

// Load credentials from YAML file
const credentials = yaml.load(fs.readFileSync('./credentials.yaml', 'utf8'));
const { 
  clientUrl, 
  userCommonName,
  clientId, 
  clientSecret 
} = credentials;

// ==========================================
// Authentication utilities
// ==========================================

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

// ==========================================
// API client creation utilities
// ==========================================

/**
 * Function to create an Axios API client
 * @param {string} baseURL - The base URL for the API
 * @returns {AxiosInstance} Configured Axios client
 */
const createAxiosApiClient = (baseURL) => {
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

// ==========================================
// Asset retrieval utilities
// ==========================================

/**
 * Fetches asset data for a given owner common name user
 * @param {AxiosInstance} apiClient - The API client to use for the request
 * @param {string} ownerCommonName - The owner common name to search for
 * @returns {Promise<{result: Object|null, data: Array}>} - The API result and asset data
 */
const getAssetsForCommonNameUser = async (apiClient, ownerCommonName) => {
    let result = null;
    let data = [];
    
    try {
        const params = { ownerCommonName };
        result = await apiClient.get(
            `/BlockApps-Mercata-Asset`,
            { params }
        );
        
        if (result && result.data) {
            data = result.data;
        }
    } catch (error) {
        console.error('API Error:', error.message);
    }
    
    return { result, data };
};

/**
 * Fetches oracle values from the Oracle Service and returns the latest price for each unique asset
 * @param {AxiosInstance} apiClient - The API client to use for the request
 * @returns {Promise<{result: Object|null, data: Array, latestPrices: Object}>} - The API result, raw oracle data, and processed latest prices
 */
const getOracleValues = async (apiClient) => {
    let result = null;
    let data = [];
    let latestPrices = {};
    
    try {
        result = await apiClient.get(
            `/BlockApps-Mercata-OracleService`
        );
        
        if (result && result.data) {
            data = result.data;
            
            // Process data to keep only the latest price for each unique asset name
            data.forEach(oracle => {
                if (oracle.name && oracle.consensusPrice) {
                    // Later entries will overwrite earlier ones
                    latestPrices[oracle.name] = oracle.consensusPrice;
                }
            });
            
            // Store reference to certain prices for mapping
            const ethPrice = latestPrices['ETH'] || null;
            const btcPrice = latestPrices['BTC'] || null;
            const goldPrice = latestPrices['Gold'] || null;
            const silverPrice = latestPrices['Silver'] || null;
            
            // Apply hard-coded price mappings
            if (ethPrice) latestPrices['ETHST'] = ethPrice;
            if (goldPrice) latestPrices['PAXGST'] = goldPrice;
            if (silverPrice) latestPrices['Silver - Fractional 100 oz Bars'] = silverPrice;
            latestPrices['STRAT'] = '1';
            latestPrices['USDCST'] = '1';
            latestPrices['USDST'] = '1';
            latestPrices['USDTST'] = '1';
            if (btcPrice) latestPrices['WBTCST'] = btcPrice;
        }
    } catch (error) {
        console.error('API Error:', error.message);
    }
    
    return { result, data, latestPrices };
};

// ==========================================
// Main application
// ==========================================

// Initialize API client
const dbApiClient = createAxiosApiClient(`https://${clientUrl}/cirrus/search`);

const app = express();
const port = 3000;

// Configure middleware
app.use(bodyParser.urlencoded({ extended: true }));

// Helper function to get the correct decimals value for an asset
const getDecimalsForAsset = (assetName, originalDecimals) => {
    // Hardcoded assumptions for specific asset types
    const knownDecimals = {
        'CATA': 18,
        'ETHST': 18,
        'STRAT': 4
    };
    
    // If we have a hardcoded value for this asset, use it
    if (assetName in knownDecimals) {
        return knownDecimals[assetName];
    }
    
    // Otherwise return the original value
    return originalDecimals;
};

// Helper function to calculate actual value with proper decimal handling
const calculateActualValue = (quantity, decimals) => {
    // For large decimal values (like 18), we need to handle the calculation carefully
    if (decimals > 15) {
        // Convert to string and manipulate
        const quantityStr = quantity.toString();
        
        if (quantityStr.length <= decimals) {
            // Need to add leading zeros
            const missingZeros = decimals - quantityStr.length;
            const result = '0.' + '0'.repeat(missingZeros) + quantityStr;
            // Parse back to float and format
            return parseFloat(result).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
        } else {
            // Insert decimal point at the right position from the end
            const insertPosition = quantityStr.length - decimals;
            const result = quantityStr.substring(0, insertPosition) + '.' + quantityStr.substring(insertPosition);
            // Parse back to float and format
            return parseFloat(result).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
        }
    } else {
        // For smaller decimal values, direct division works fine
        return (quantity / Math.pow(10, decimals)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
    }
};

// Helper function to safely format JSON for display
const safelyFormatJSON = (obj) => {
    try {
        // Stringify the object with standard formatting
        const jsonString = JSON.stringify(obj, null, 2);
        
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
        
        // API calls: Get the asset data and oracle values from the database
        const { result: assetResult, data: assetData } = await getAssetsForCommonNameUser(dbApiClient, ownerCommonName);
        const { result: oracleResult, data: oracleData, latestPrices } = await getOracleValues(dbApiClient);
        
        // Process asset data: group by name, sum quantities, and sort alphabetically
        const assetGroups = {};
        
        // Group assets by name and sum quantities
        assetData.forEach(asset => {
            const name = asset.name || asset.id || 'Unnamed Asset';
            const quantity = parseInt(asset.quantity) || 0;
            
            if (!assetGroups[name]) {
                // Get the correct decimals value (using hardcoded values for certain assets)
                const decimals = getDecimalsForAsset(name, asset.decimals);
                
                assetGroups[name] = { 
                    name, 
                    totalQuantity: 0,
                    tokenCount: 0,
                    decimals: decimals, // Use the corrected decimals value
                    tokens: [] // Array to store individual token details
                };
            }
            
            assetGroups[name].totalQuantity += quantity;
            assetGroups[name].tokenCount += 1;
            // Store the individual token details
            assetGroups[name].tokens.push(asset);
        });
        
        // Convert to array and sort alphabetically by name
        const sortedAssets = Object.values(assetGroups).sort((a, b) => 
            a.name.localeCompare(b.name)
        );
        
        // Render the page with results
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>STRATO REST API Sample</title>
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
                    .asset-value {
                        background: #f0f8ff;
                        padding: 10px;
                        border-radius: 4px;
                        margin-top: 5px;
                    }
                    .asset-value p {
                        margin: 5px 0;
                    }
                    .asset-value p:last-child {
                        font-weight: bold;
                        color: #2980b9;
                    }
                    .oracle-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 10px;
                    }
                    .oracle-table th, .oracle-table td {
                        padding: 10px;
                        text-align: left;
                        border-bottom: 1px solid #e0e0e0;
                    }
                    .oracle-table th {
                        background-color: #f5f5f5;
                        font-weight: bold;
                        color: #2c3e50;
                    }
                    .oracle-table tr:hover {
                        background-color: #f0f8ff;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>User Assets</h1>
                    
                    <div class="card">
                        <h2>Total Value</h2>
                        <table class="oracle-table">
                            <tbody>
                                ${(() => {
                                    // Calculate total values
                                    let fungibleTokensCount = 0;
                                    let fungibleTokensValue = 0;
                                    let nonFungibleTokensCount = 0;
                                    let cataTokensCount = 0;
                                    
                                    // Process each asset
                                    sortedAssets.forEach(asset => {
                                        const price = latestPrices[asset.name];
                                        
                                        if (asset.name === 'CATA') {
                                            // Count CATA tokens separately
                                            cataTokensCount += asset.tokenCount;
                                            
                                            // Calculate total CATA tokens (quantity)
                                            try {
                                                // Calculate actual quantity as a number with full precision
                                                if (asset.decimals !== undefined && asset.decimals !== null) {
                                                    // Use string operations for high precision
                                                    const quantityStr = asset.totalQuantity.toString();
                                                    const decimals = parseInt(asset.decimals);
                                                    
                                                    if (quantityStr.length <= decimals) {
                                                        // Need to add leading zeros
                                                        const missingZeros = decimals - quantityStr.length;
                                                        asset.calculatedQuantity = parseFloat('0.' + '0'.repeat(missingZeros) + quantityStr);
                                                    } else {
                                                        // Insert decimal point at the right position from the end
                                                        const insertPosition = quantityStr.length - decimals;
                                                        asset.calculatedQuantity = parseFloat(quantityStr.substring(0, insertPosition) + '.' + quantityStr.substring(insertPosition));
                                                    }
                                                } else {
                                                    asset.calculatedQuantity = asset.totalQuantity;
                                                }
                                            } catch (error) {
                                                console.error('Error calculating CATA quantity:', error);
                                                asset.calculatedQuantity = 0;
                                            }
                                        } else if (price) {
                                            // This is a fungible token with a price oracle
                                            fungibleTokensCount += asset.tokenCount;
                                            
                                            // Calculate value
                                            try {
                                                // Calculate actual quantity as a number with full precision
                                                let actualQuantity;
                                                if (asset.decimals !== undefined && asset.decimals !== null) {
                                                    // Use string operations for high precision
                                                    const quantityStr = asset.totalQuantity.toString();
                                                    const decimals = parseInt(asset.decimals);
                                                    
                                                    if (quantityStr.length <= decimals) {
                                                        // Need to add leading zeros
                                                        const missingZeros = decimals - quantityStr.length;
                                                        actualQuantity = parseFloat('0.' + '0'.repeat(missingZeros) + quantityStr);
                                                    } else {
                                                        // Insert decimal point at the right position from the end
                                                        const insertPosition = quantityStr.length - decimals;
                                                        actualQuantity = parseFloat(quantityStr.substring(0, insertPosition) + '.' + quantityStr.substring(insertPosition));
                                                    }
                                                } else {
                                                    actualQuantity = asset.totalQuantity;
                                                }
                                                
                                                // Parse price with full precision
                                                const priceValue = parseFloat(price);
                                                
                                                // Calculate total value with maximum available precision
                                                let totalValue = actualQuantity * priceValue;
                                                
                                                // Add to the running total
                                                fungibleTokensValue += totalValue;
                                            } catch (error) {
                                                console.error('Error calculating total value:', error);
                                            }
                                        } else {
                                            // This is a non-fungible token without a price oracle
                                            nonFungibleTokensCount += asset.tokenCount;
                                        }
                                    });
                                    
                                    // Format the fungible tokens value
                                    const formattedValue = fungibleTokensValue.toLocaleString(undefined, { 
                                        minimumFractionDigits: 2, 
                                        maximumFractionDigits: 2 
                                    });
                                    
                                    return `
                                        <tr>
                                            <td>${fungibleTokensCount} Fungible tokens</td>
                                            <td>worth $${formattedValue}</td>
                                        </tr>
                                        <tr>
                                            <td>${nonFungibleTokensCount} non-fungible tokens</td>
                                            <td>(unknown value)</td>
                                        </tr>
                                        <tr>
                                            <td>${cataTokensCount} CATA tokens</td>
                                            <td>${(() => {
                                                // Calculate total CATA tokens value
                                                let totalCataTokens = 0;
                                                sortedAssets.forEach(asset => {
                                                    if (asset.name === 'CATA' && asset.calculatedQuantity) {
                                                        totalCataTokens += asset.calculatedQuantity;
                                                    }
                                                });
                                                
                                                // Format the total CATA tokens
                                                return totalCataTokens.toLocaleString(undefined, { 
                                                    minimumFractionDigits: 2, 
                                                    maximumFractionDigits: 6 
                                                });
                                            })()} CATA</td>
                                        </tr>
                                    `;
                                })()}
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="card">
                        <h2>Asset Breakdown</h2>
                        ${assetData.length > 0 ? `
                            <p>Found ${sortedAssets.length} unique asset classes (across ${assetData.length} tokens) for owner: ${ownerCommonName.replace('eq.', '')}</p>
                            ${sortedAssets.map((asset, index) => `
                                <div class="asset-card">
                                    <div class="asset-header">
                                        <span>${(() => {
                                            // Format the basic asset information
                                            const quantityDisplay = asset.decimals !== undefined && asset.decimals !== null ? 
                                                calculateActualValue(asset.totalQuantity, asset.decimals) : 
                                                asset.totalQuantity;
                                            
                                            let result = `${asset.name}: ${quantityDisplay} (across ${asset.tokenCount} token${asset.tokenCount !== 1 ? 's' : ''})`;
                                            
                                            // Add total value if oracle price exists
                                            const price = latestPrices[asset.name];
                                            if (price) {
                                                // For very small values, we need to be careful with precision
                                                try {
                                                    // Calculate actual quantity as a number with full precision
                                                    let actualQuantity;
                                                    if (asset.decimals !== undefined && asset.decimals !== null) {
                                                        // Use string operations for high precision
                                                        const quantityStr = asset.totalQuantity.toString();
                                                        const decimals = parseInt(asset.decimals);
                                                        
                                                        if (quantityStr.length <= decimals) {
                                                            // Need to add leading zeros
                                                            const missingZeros = decimals - quantityStr.length;
                                                            actualQuantity = parseFloat('0.' + '0'.repeat(missingZeros) + quantityStr);
                                                        } else {
                                                            // Insert decimal point at the right position from the end
                                                            const insertPosition = quantityStr.length - decimals;
                                                            actualQuantity = parseFloat(quantityStr.substring(0, insertPosition) + '.' + quantityStr.substring(insertPosition));
                                                        }
                                                    } else {
                                                        actualQuantity = asset.totalQuantity;
                                                    }
                                                    
                                                    // Parse price with full precision
                                                    const priceValue = parseFloat(price);
                                                    
                                                    // Calculate total value with maximum available precision
                                                    let totalValue = actualQuantity * priceValue;
                                                    
                                                    // Special handling for very small values to avoid showing $0.00
                                                    if (totalValue > 0 && totalValue < 0.01) {
                                                        // For very small values, show at least $0.01
                                                        result += `, worth $0.01`;
                                                    } else {
                                                        // Round to the nearest cent as requested
                                                        const roundedValue = Math.round(totalValue * 100) / 100;
                                                        result += `, worth $${roundedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                                    }
                                                } catch (error) {
                                                    // If any calculation errors occur, show a default value
                                                    result += `, worth $0.01`;
                                                    console.error('Error calculating worth:', error);
                                                }
                                            }
                                            
                                            return result;
                                        })()}</span>
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
