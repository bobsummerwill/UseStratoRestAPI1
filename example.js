/**
 * Standalone example demonstrating the core functionality of blockapps-rest
 * 
 * NOTE: This is a demonstration script. To run it successfully, you would need:
 * 1. A running STRATO node
 * 2. A configured OAuth server
 * 3. Valid OAuth credentials in config.yaml
 * 4. A valid OAuth token (typically obtained through an OAuth flow)
 * 
 * Usage: 
 * - Set the OAUTH_TOKEN environment variable with a valid token
 * - Run: node example.js
 */

// Import the blockapps-rest package
const { rest, fsUtil, util } = require('blockapps-rest');

// Read configuration
const config = fsUtil.getYaml('config.yaml');

// Create options object
const options = { config, logger: console };

// Simple smart contract for demonstration
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

// Main function to demonstrate blockapps-rest functionality
async function main() {
    try {
        console.log('BlockApps REST Example Script');
        console.log('-----------------------------');
        
        // Get OAuth token from environment variable
        const token = process.env.OAUTH_TOKEN || 'mock-oauth-token';
        console.log(`Using token: ${token.substring(0, 5)}...`);
        
        // Step 1: Create a user
        console.log('\n1. Creating user...');
        console.log('In a real environment with proper OAuth setup, this would create a blockchain user:');
        console.log(`await rest.createUser({token: '${token.substring(0, 5)}...'}, options);`);
        
        // Mock user for demonstration
        const mockUser = {
            address: '0x1234567890abcdef1234567890abcdef12345678',
            name: 'Example User'
        };
        console.log('User created:', mockUser);
        
        // Step 2: Deploy a contract
        console.log('\n2. Deploying contract...');
        console.log('In a real environment with a STRATO node, this would deploy the contract:');
        
        const contractArgs = {
            name: 'SimpleStorage',
            source: CONTRACT_SOURCE,
            args: { initialValue: 42 }
        };
        
        console.log(`await rest.createContract(user, ${JSON.stringify(contractArgs, null, 2)}, options);`);
        
        // Mock contract for demonstration
        const mockContract = {
            name: 'SimpleStorage',
            address: '0xabcdef1234567890abcdef1234567890abcdef12',
            source: CONTRACT_SOURCE,
            binary: '0x...' // Binary representation would be here
        };
        console.log('Contract deployed:', mockContract.name, 'at address', mockContract.address);
        
        // Step 3: Interact with the contract
        console.log('\n3. Interacting with contract...');
        console.log('In a real environment, this would get the current state:');
        console.log(`await rest.getState(user, contract, options);`);
        
        // Mock state for demonstration
        const mockState = { storedData: 42 };
        console.log('Current state:', mockState);
        
        // Call contract method
        console.log('\nCalling contract method "set"...');
        const callArgs = {
            contract: mockContract,
            method: 'set',
            args: { x: 100 }
        };
        console.log(`await rest.call(user, ${JSON.stringify(callArgs, null, 2)}, options);`);
        
        // Mock updated state
        const mockUpdatedState = { storedData: 100 };
        console.log('Updated state:', mockUpdatedState);
        
        console.log('\nExample completed successfully!');
        console.log('Note: This is a demonstration script. In a real environment, you would need a proper STRATO node and OAuth setup.');
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Run the main function
main();
