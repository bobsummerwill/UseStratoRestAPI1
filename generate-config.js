/**
 * Script to generate config.yaml from credentials.js
 * 
 * This script reads the credentials from credentials.js and generates
 * a config.yaml file with those credentials inserted in the right places.
 * 
 * Usage:
 * 1. Copy credentials.template.js to credentials.js
 * 2. Fill in your actual credentials in credentials.js
 * 3. Run: node generate-config.js
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Import credentials
const credentials = require('./credentials');

// Define the config structure
const config = {
  apiDebug: true,
  timeout: 600000,
  nodes: [
    {
      id: 0,
      url: credentials.nodeUrl,
      publicKey: credentials.nodePublicKey,
      port: 30303,
      oauth: {
        appTokenCookieName: "blockapps_sample_session",
        scope: "email openid",
        appTokenCookieMaxAge: 7776000000, // 90 days: 90 * 24 * 60 * 60 * 1000
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        openIdDiscoveryUrl: "https://keycloak.blockapps.net/auth/realms/mercata/.well-known/openid-configuration",
        redirectUri: 'http://localhost:3000/api/v1/authentication/callback',
        logoutRedirectUri: "https://localhost:3000"
      }
    }
  ]
};

// Convert to YAML
const yamlStr = yaml.dump(config);

// Add a warning comment at the top
const yamlWithComment = 
`# WARNING - This file was generated from credentials.js
# DO NOT commit this file to version control
# If you need to update credentials, modify credentials.js and run generate-config.js

${yamlStr}`;

// Write to config.yaml
fs.writeFileSync(path.join(__dirname, 'config.yaml'), yamlWithComment);

console.log('config.yaml has been generated successfully from credentials.js');
