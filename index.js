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
