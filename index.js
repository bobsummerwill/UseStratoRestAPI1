/**
 * Sample application demonstrating the use of blockapps-rest
 * 
 * NOTE: This is a demonstration application. To run it successfully, you would need:
 * 1. A running STRATO node
 * 2. A configured OAuth server
 * 3. Valid OAuth credentials in config.yaml
 */

// Import the blockapps-rest package
const { rest, fsUtil, util, assert } = require('blockapps-rest');
const { dbApiClient } = require("./test.js")

// Import other required packages
const express = require('express');
const session = require('express-session');
const axios = require('axios');
const querystring = require('querystring');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;

// Read configuration
const config = fsUtil.getYaml('config.yaml');

// Create options object
const options = { config, logger: console };

// Configure middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'blockapps-rest-sample-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: false, // Set to true if using HTTPS
    maxAge: config.nodes[0].oauth.appTokenCookieMaxAge 
  }
}));

// OAuth configuration
const oauthConfig = config.nodes[0].oauth;

/**
 * Simple smart contract for demonstration
 * This contract stores a value and provides methods to get and set it
 */
const CONTRACT_SOURCE = `
contract SimpleStorage {
    uint private storedData;
    
    constructor(uint initialValue) {
        storedData = initialValue;
    }
    
    function set(uint x) public {
        storedData = x;
    }
    
    function get() public view returns (uint) {
        return storedData;
    }
}
`;

// Helper function to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  res.redirect('/login');
};

// Setup Express routes
app.get('/', (req, res) => {
    res.send(`
        <h1>BlockApps REST Sample Application</h1>
        <p>This is a sample application demonstrating the use of blockapps-rest package.</p>
        <p>Available endpoints:</p>
        <ul>
            <li><a href="/login">Login</a> (authenticate with OAuth)</li>
            <li><a href="/find-user">Find User</a> (requires authentication)</li>
        </ul>
        ${req.session.user ? 
          `<p><strong>Logged in as:</strong> ${req.session.user.address}</p>
           <p><a href="/logout">Logout</a></p>` : 
          `<p><a href="/login">Login</a> to access all features</p>`}
    `);
});

// Login page
app.get('/login', (req, res) => {
    res.send(`
        <h1>Login</h1>
        <p>Click the button below to authenticate with OAuth:</p>
        <form action="/auth" method="get">
            <button type="submit">Login with OAuth</button>
        </form>
    `);
});

// Initiate OAuth flow
app.get('/auth', (req, res) => {
    // Get the OpenID configuration
    axios.get(oauthConfig.openIdDiscoveryUrl)
        .then(response => {
            const authEndpoint = response.data.authorization_endpoint;
            
            // Build the authorization URL
            const authUrl = `${authEndpoint}?${querystring.stringify({
                client_id: oauthConfig.clientId,
                redirect_uri: oauthConfig.redirectUri,
                response_type: 'code',
                scope: oauthConfig.scope
            })}`;
            
            // Redirect the user to the authorization URL
            res.redirect(authUrl);
        })
        .catch(error => {
            console.error('Error initiating OAuth flow:', error);
            res.status(500).send('Error initiating OAuth flow');
        });
});

// OAuth callback
app.get('/callback', async (req, res) => {
    try {
        const code = req.query.code;
        
        if (!code) {
            return res.status(400).send('Authorization code not provided');
        }
        
        // Get the OpenID configuration
        const openIdConfig = await axios.get(oauthConfig.openIdDiscoveryUrl);
        const tokenEndpoint = openIdConfig.data.token_endpoint;
        
        // Exchange the authorization code for tokens
        const tokenResponse = await axios.post(tokenEndpoint, 
            querystring.stringify({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: oauthConfig.redirectUri,
                client_id: oauthConfig.clientId,
                client_secret: oauthConfig.clientSecret
            }), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
        
        const accessToken = tokenResponse.data.access_token;
        
        // Create a blockchain user with the token
        const user = await rest.createUser({token: accessToken}, options);
        
        // Store the user in the session
        req.session.user = user;
        req.session.token = accessToken;
        
        // Set the token cookie
        res.cookie(oauthConfig.appTokenCookieName, accessToken, {
            maxAge: oauthConfig.appTokenCookieMaxAge,
            httpOnly: true
        });
        
        // Redirect to the home page
        res.redirect('/');
    } catch (error) {
        console.error('Error in OAuth callback:', error);
        res.status(500).send(`Error in OAuth callback: ${error.message}`);
    }
});

// Logout route
app.get('/logout', (req, res) => {
    // Clear the session
    req.session.destroy();
    
    // Clear the token cookie
    res.clearCookie(oauthConfig.appTokenCookieName);
    
    // Redirect to the home page
    res.redirect('/');
});

// Route to find a user and their assets
app.get('/find-user', async (req, res) => {
    try {
        const user = "123" //req.session.user;
        
        // Get user address from query parameter or use the authenticated user's address
        const userAddress = "123" //req.query.address || user.address;
        
        // Get owner common name from query parameter or use default
        const ownerCommonName = req.query.ownerCommonName || "eq.bobsummerwill";
        
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
        
        // For demonstration, we'll create mock asset data as fallback
        const mockAssets = {
            erc20Tokens: [
                { token: 'Sample Token', symbol: 'STKN', balance: '1000000000000000000000' }, // 1000 STKN
                { token: 'Another Token', symbol: 'ATKN', balance: '500000000000000000000' }  // 500 ATKN
            ],
            nfts: [
                { 
                    collection: 'CryptoArt',
                    tokenIds: [42, 107, 253],
                    tokens: [
                        { id: 42, name: 'Artwork #42', metadata: { artist: 'Artist A', created: '2023-01-15' } },
                        { id: 107, name: 'Artwork #107', metadata: { artist: 'Artist B', created: '2023-03-22' } },
                        { id: 253, name: 'Artwork #253', metadata: { artist: 'Artist C', created: '2023-06-10' } }
                    ]
                },
                {
                    collection: 'VirtualLand',
                    tokenIds: [18],
                    tokens: [
                        { id: 18, name: 'Land Parcel #18', metadata: { location: 'Zone 3', size: '10x10' } }
                    ]
                }
            ],
            customAssets: [
                { type: 'VirtualItem', id: 'sword-123', name: 'Excalibur', properties: { damage: 100, durability: 1000 } },
                { type: 'VirtualItem', id: 'shield-456', name: 'Dragon Shield', properties: { defense: 80, durability: 1500 } }
            ]
        };
        
        // Helper function to format JSON for display
        const formatJSON = (obj) => {
            return JSON.stringify(obj, null, 2)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;')
                .replace(/\n/g, '<br>')
                .replace(/\s{2}/g, '&nbsp;&nbsp;');
        };
        
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
                .token-balance {
                    color: #27ae60;
                    font-weight: bold;
                }
                .form-group {
                    margin-bottom: 15px;
                }
                .form-group label {
                    display: block;
                    margin-bottom: 5px;
                    font-weight: bold;
                }
                .form-group input {
                    width: 100%;
                    padding: 8px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    box-sizing: border-box;
                }
                button {
                    background: #3498db;
                    color: white;
                    border: none;
                    padding: 10px 15px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                }
                button:hover {
                    background: #2980b9;
                }
                .tab {
                    overflow: hidden;
                    border: 1px solid #ccc;
                    background-color: #f1f1f1;
                    border-radius: 4px 4px 0 0;
                }
                .tab button {
                    background-color: inherit;
                    float: left;
                    border: none;
                    outline: none;
                    cursor: pointer;
                    padding: 14px 16px;
                    transition: 0.3s;
                    color: #333;
                }
                .tab button:hover {
                    background-color: #ddd;
                }
                .tab button.active {
                    background-color: #3498db;
                    color: white;
                }
                .tabcontent {
                    display: none;
                    padding: 20px;
                    border: 1px solid #ccc;
                    border-top: none;
                    border-radius: 0 0 4px 4px;
                    animation: fadeEffect 1s;
                }
                @keyframes fadeEffect {
                    from {opacity: 0;}
                    to {opacity: 1;}
                }
            </style>
        `;
        
        // JavaScript for tab functionality
        const tabScript = `
            <script>
                function openTab(evt, tabName) {
                    var i, tabcontent, tablinks;
                    tabcontent = document.getElementsByClassName("tabcontent");
                    for (i = 0; i < tabcontent.length; i++) {
                        tabcontent[i].style.display = "none";
                    }
                    tablinks = document.getElementsByClassName("tablinks");
                    for (i = 0; i < tablinks.length; i++) {
                        tablinks[i].className = tablinks[i].className.replace(" active", "");
                    }
                    document.getElementById(tabName).style.display = "block";
                    evt.currentTarget.className += " active";
                }
                
                // Open the first tab by default
                document.addEventListener('DOMContentLoaded', function() {
                    document.getElementsByClassName('tablinks')[0].click();
                });
            </script>
        `;
        
        // Render the find user page with form and results
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Find User - BlockApps REST Sample</title>
                ${styles}
            </head>
            <body>
                <div class="container">
                    <h1>Find User</h1>
                    <p>You are authenticated as: ${user.address}</p>
                    
                    <div class="card">
                        <form action="/find-user" method="get">
                            <div class="form-group">
                                <label for="address">User Address:</label>
                                <input type="text" id="address" name="address" value="${userAddress}" placeholder="0x...">
                            </div>
                            <div class="form-group">
                                <label for="ownerCommonName">Owner Common Name:</label>
                                <input type="text" id="ownerCommonName" name="ownerCommonName" value="${ownerCommonName}" placeholder="Enter owner name">
                            </div>
                            <button type="submit">Find User</button>
                        </form>
                    </div>
                    
                    <div class="card">
                        <h2>User Information</h2>
                        <p><strong>Address:</strong> ${userAddress}</p>
                        <p><strong>Owner Common Name:</strong> ${ownerCommonName}</p>
                    </div>
                    
                    <div class="tab">
                        <button class="tablinks" onclick="openTab(event, 'APIAssets')">API Assets</button>
                        <button class="tablinks" onclick="openTab(event, 'MockAssets')">Mock Assets</button>
                    </div>
                    
                    <div id="APIAssets" class="tabcontent">
                        <h2>API Asset Results</h2>
                        ${assetData.length > 0 ? `
                            <p>Found ${assetData.length} assets for owner: ${ownerCommonName}</p>
                            ${assetData.map((asset, index) => `
                                <div class="asset-card">
                                    <div class="asset-header">
                                        <span>Asset #${index + 1}: ${asset.name || asset.id || 'Unnamed Asset'}</span>
                                        ${asset.type ? `<span>Type: ${asset.type}</span>` : ''}
                                    </div>
                                    <div class="asset-details">
                                        ${formatJSON(asset)}
                                    </div>
                                </div>
                            `).join('')}
                        ` : `
                            <p>No assets found from API for owner: ${ownerCommonName}</p>
                            <p>API Response: ${assetResult ? formatJSON(assetResult) : 'No response'}</p>
                        `}
                    </div>
                    
                    <div id="MockAssets" class="tabcontent">
                        <h2>Mock Assets</h2>
                        
                        <h3>ERC20 Token Balances:</h3>
                        <div class="asset-card">
                            <ul>
                                ${mockAssets.erc20Tokens.map(token => {
                                    const readableBalance = parseInt(token.balance) / 1e18;
                                    return `<li>${token.token} (${token.symbol}): <span class="token-balance">${readableBalance}</span> tokens</li>`;
                                }).join('')}
                            </ul>
                        </div>
                        
                        <h3>NFT Collections:</h3>
                        ${mockAssets.nfts.map(collection => {
                            return `
                                <div class="asset-card">
                                    <div class="asset-header">
                                        <span>${collection.collection}: ${collection.tokenIds.length} tokens</span>
                                    </div>
                                    <ul>
                                        ${collection.tokens.map(token => {
                                            return `
                                                <li>
                                                    <strong>Token #${token.id}:</strong> ${token.name}
                                                    <br>
                                                    <div class="asset-details">
                                                        Metadata: ${formatJSON(token.metadata)}
                                                    </div>
                                                </li>
                                            `;
                                        }).join('')}
                                    </ul>
                                </div>
                            `;
                        }).join('')}
                        
                        <h3>Custom Assets:</h3>
                        ${mockAssets.customAssets.map(asset => {
                            return `
                                <div class="asset-card">
                                    <div class="asset-header">
                                        <span>${asset.name} (${asset.type}, ID: ${asset.id})</span>
                                    </div>
                                    <div class="asset-details">
                                        Properties: ${formatJSON(asset.properties)}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    
                    <p><a href="/">Back to home</a></p>
                </div>
                ${tabScript}
            </body>
            </html>
        `);
    } catch (error) {
        res.status(500).send(`Error: ${error.message}`);
    }
});

// Start the server
app.listen(port, () => {
    console.log(`BlockApps REST sample application listening at http://localhost:${port}`);
    console.log('Note: This is a demonstration application and requires a proper STRATO node and OAuth setup to function.');
});
