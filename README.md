# STRATO REST API Sample Application

This application demonstrates how to use the [blockapps-rest](https://www.npmjs.com/package/blockapps-rest) npm package to interact with a STRATO blockchain, specifically to view assets owned by the user specified in the credentials file.

## Overview

The application provides a single key functionality:

1. **Asset Enumeration** - List all assets owned by the user configured in credentials.yaml

## Prerequisites

To run this application, you need:

1. A running STRATO node
2. Valid credentials in credentials.yaml
3. Node.js and npm installed

## Project Structure

- `index.js` - Main application file containing all functionality:
  - OAuth authentication with the STRATO node
  - API client setup for interacting with the STRATO node
  - Express server and asset display functionality
- `credentials.yaml` - Contains the credentials for authentication and user common name
- `credentials.template.yaml` - Template file with placeholders for setting up credentials
- `package.json` - Project dependencies and scripts

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd <repository-directory>

# Install dependencies
npm install

# Set up credentials
cp credentials.template.yaml credentials.yaml
# Edit credentials.yaml with your own values
```

## Running the Application

To start the web application:

```bash
npm start
```

This will start an Express server at http://localhost:3000 where you can view the assets owned by the user configured in credentials.yaml.

## Security Considerations

- The application uses OAuth for authentication
- Sensitive credentials are stored in credentials.yaml
- In a production environment, you would implement additional security measures:
  - Use HTTPS
  - Implement CSRF protection
  - Add rate limiting
  - Enhance error handling
