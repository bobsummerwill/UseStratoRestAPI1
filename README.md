# BlockApps REST Sample Application

This application demonstrates how to use the [blockapps-rest](https://www.npmjs.com/package/blockapps-rest) npm package to interact with a STRATO blockchain, including user authentication, contract deployment, and asset management.

## Overview

The application provides several key functionalities:

1. **OAuth Authentication** - Real user authentication using OAuth flow
2. **User Management** - Create and manage blockchain user accounts
3. **Smart Contract Deployment** - Deploy smart contracts to the blockchain
4. **Contract Interaction** - Interact with deployed smart contracts
5. **Asset Enumeration** - List all assets owned by a user, including:
   - ERC20 token balances
   - NFT (ERC721) ownership
   - Custom assets

## Prerequisites

To run this application in a production environment, you would need:

1. A running STRATO node
2. A configured OAuth server
3. Valid OAuth credentials in config.yaml
4. Node.js and npm installed

## Project Structure

- `config.yaml` - Configuration file for connecting to STRATO nodes and OAuth settings
- `index.js` - Main application with Express server and OAuth implementation
- `example.js` - Simple example script demonstrating core functionality
- `advanced-example.js` - Advanced example with a more complex smart contract
- `find-user-assets.js` - Script for finding users and their assets
- `package.json` - Project dependencies and scripts

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd <repository-directory>

# Install dependencies
npm install

# Set up credentials
cp credentials.template.js credentials.js
# Edit credentials.js with your actual credentials

# Generate config.yaml from credentials
npm run generate-config
```

## Credentials Management

This project uses a secure approach to manage sensitive credentials:

1. All sensitive information is stored in `credentials.js` which is excluded from version control
2. A template file `credentials.template.js` is provided with placeholder values
3. The `config.yaml` file is generated from `credentials.js` using the `generate-config.js` script
4. Both `credentials.js` and `config.yaml` are listed in `.gitignore` to prevent accidental commits

To set up your credentials:

1. Copy `credentials.template.js` to `credentials.js`
2. Edit `credentials.js` with your actual credentials
3. Run `npm run generate-config` to generate `config.yaml`

## Running the Application

To start the main web application with OAuth authentication:

```bash
# Make sure you've set up credentials and generated config.yaml first
npm start
```

This will start an Express server at http://localhost:3000 where you can:
- Log in using OAuth
- Create a blockchain user
- Deploy and interact with smart contracts

To run the example scripts:

```bash
# Run the simple example
npm run example

# Run the advanced example
npm run advanced-example

# Find a user and enumerate their assets
npm run find-user-assets
```

You can also specify a user address when finding assets:

```bash
USER_ADDRESS=0xYourAddressHere npm run find-user-assets
```

## Authentication Flow

The application implements a complete OAuth 2.0 authentication flow:

1. User clicks the "Login" button
2. User is redirected to the OAuth provider's login page
3. After successful authentication, the OAuth provider redirects back to the application with an authorization code
4. The application exchanges the authorization code for an access token
5. The access token is used to create a blockchain user
6. The user is stored in the session and can now interact with the blockchain

## Example Output

When running the find-user-assets script, the application will output information about the user and their assets:

```
ERC20 Token Balances:
- Sample Token (STKN): 1000 tokens
- Another Token (ATKN): 500 tokens

NFT Collections:
- CryptoArt: 3 tokens
  - Token #42: Artwork #42
    Metadata: {"artist":"Artist A","created":"2023-01-15"}
  - Token #107: Artwork #107
    Metadata: {"artist":"Artist B","created":"2023-03-22"}
  - Token #253: Artwork #253
    Metadata: {"artist":"Artist C","created":"2023-06-10"}
- VirtualLand: 1 tokens
  - Token #18: Land Parcel #18
    Metadata: {"location":"Zone 3","size":"10x10"}

Custom Assets:
- Excalibur (VirtualItem, ID: sword-123)
  Properties: {"damage":100,"durability":1000}
- Dragon Shield (VirtualItem, ID: shield-456)
  Properties: {"defense":80,"durability":1500}
```

## Security Considerations

- The application uses express-session for session management
- OAuth tokens are stored in HTTP-only cookies for security
- Authentication is required for all blockchain operations
- The OAuth credentials in config.yaml are placeholders and need to be replaced with valid credentials
- In a production environment, you would implement additional security measures:
  - Use HTTPS (set cookie.secure to true)
  - Implement CSRF protection
  - Add rate limiting
  - Enhance error handling

## Additional Resources

- [BlockApps Developer Documentation](https://docs.blockapps.net/ba-rest/)
- [STRATO Documentation](https://docs.blockapps.net/)
