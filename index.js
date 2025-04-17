/**
 * Simplified application for accessing assets owned by the user specified in credentials.yaml
 * using automated OAuth login
 */

// Import required packages
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const yaml = require('js-yaml');
const { createAxiosApiClient } = require('./createAxiosApiClient');
const { getAssetsForCommonNameUser } = require('./getassets');

// Load credentials from YAML file
const credentials = yaml.load(fs.readFileSync('./credentials.yaml', 'utf8'));
const { 
  clientUrl, 
  userCommonName 
} = credentials;

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
        
        // API call: Get the asset data from the database
        const { result: assetResult, data: assetData } = await getAssetsForCommonNameUser(dbApiClient, ownerCommonName);
        
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
                </style>
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
                            <p>Found ${sortedAssets.length} unique asset types (from ${assetData.length} total assets) for owner: ${ownerCommonName.replace('eq.', '')}</p>
                            ${sortedAssets.map((asset, index) => `
                                <div class="asset-card">
                                    <div class="asset-header">
                                        <span>${asset.name}: ${asset.decimals !== undefined && asset.decimals !== null ? 
                                            calculateActualValue(asset.totalQuantity, asset.decimals) : 
                                            asset.totalQuantity} (across ${asset.tokenCount} token${asset.tokenCount !== 1 ? 's' : ''})</span>
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
