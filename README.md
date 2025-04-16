# STRATO REST API Sample Application

This application demonstrates how to use the [blockapps-rest](https://www.npmjs.com/package/blockapps-rest) npm package to interact with a STRATO blockchain, specifically to view assets owned by the user specified in the credentials file.

## Overview

The application provides a single key functionality:

1. **Asset Enumeration** - List all assets owned by the user configured in credentials.js using the `/find-user` endpoint

## Prerequisites

To run this application, you need:

1. A running STRATO node
2. Valid credentials in credentials.js
3. Node.js and npm installed

## Project Structure

- `oauth.js` - Handles OAuth authentication with the STRATO node
- `test.js` - Sets up the API clients for interacting with the STRATO node
- `credentials.js` - Contains the credentials for authentication
- `config.yaml` - Configuration file for connecting to STRATO nodes and OAuth settings
- `index.js` - Main application with Express server and the /find-user endpoint
- `package.json` - Project dependencies and scripts

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd <repository-directory>

# Install dependencies
npm install
```

## Running the Application

To start the web application:

```bash
npm start
```

This will start an Express server at http://localhost:3000 where you can:
- View the home page
- Access the `/find-user` endpoint to view assets owned by the configured user

## Security Considerations

- The application uses OAuth for authentication
- Sensitive credentials are stored in credentials.js
- In a production environment, you would implement additional security measures:
  - Use HTTPS
  - Implement CSRF protection
  - Add rate limiting
  - Enhance error handling
