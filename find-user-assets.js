/**
 * Script to find a user account and enumerate all assets owned by that account
 * using the blockapps-rest package
 * 
 * NOTE: This is a demonstration script. To run it successfully, you would need:
 * 1. A running STRATO node
 * 2. A configured OAuth server
 * 3. Valid OAuth credentials in config.yaml
 * 
 * Usage: 
 * - Set the USER_ADDRESS environment variable with the address to search for (optional)
 * - Run: node find-user-assets.js
 */

// Import the blockapps-rest package
const { rest, fsUtil, util } = require('blockapps-rest');

// Read configuration
const config = fsUtil.getYaml('config.yaml');

// Create options object
const options = { config, logger: console };

// Main function to find a user and their assets
async function main() {
    try {
        console.log('Find User and Enumerate Assets');
        console.log('------------------------------');
        
        // Get OAuth token (in a real application, this would be obtained through OAuth flow)
        const token = process.env.OAUTH_TOKEN || 'mock-oauth-token';
        console.log(`Using token: ${token.substring(0, 5)}...`);
        
        // Step 1: Find a user account
        console.log('\n1. Finding user account...');
        
        // Get user address from environment variable or use a default for demonstration
        const userAddress = process.env.USER_ADDRESS || '0x1234567890abcdef1234567890abcdef12345678';
        console.log(`Searching for user with address: ${userAddress}`);
        
        // In a real application with a STRATO node, you would use the API to find the user
        console.log('In a real environment, you would use:');
        console.log(`await rest.getUser(userAddress, options);`);
        
        // For demonstration, we'll create a mock user
        const mockUser = {
            address: userAddress,
            name: 'Example User',
            balance: '1000000000000000000' // 1 ETH in wei
        };
        
        console.log('User found:', mockUser);
        
        // Step 2: Enumerate all assets owned by the user
        console.log('\n2. Enumerating assets owned by the user...');
        console.log('In a real environment, you would query the blockchain for assets:');
        
        // In a real application, you would query the blockchain for assets owned by this address
        // This could involve:
        // 1. Querying ERC20 token balances
        // 2. Querying ERC721 (NFT) ownership
        // 3. Querying custom asset contracts
        
        console.log(`// Query for ERC20 token balances`);
        console.log(`const tokenContracts = await rest.getTokenContracts(options);`);
        console.log(`const tokenBalances = await Promise.all(tokenContracts.map(async (contract) => {`);
        console.log(`  const balance = await rest.call({`);
        console.log(`    contract,`);
        console.log(`    method: 'balanceOf',`);
        console.log(`    args: { account: '${userAddress}' }`);
        console.log(`  }, options);`);
        console.log(`  return { token: contract.name, balance };`);
        console.log(`}));`);
        
        console.log(`\n// Query for ERC721 (NFT) ownership`);
        console.log(`const nftContracts = await rest.getNFTContracts(options);`);
        console.log(`const nftBalances = await Promise.all(nftContracts.map(async (contract) => {`);
        console.log(`  const balance = await rest.call({`);
        console.log(`    contract,`);
        console.log(`    method: 'balanceOf',`);
        console.log(`    args: { owner: '${userAddress}' }`);
        console.log(`  }, options);`);
        console.log(`  return { nft: contract.name, balance };`);
        console.log(`}));`);
        
        // For demonstration, we'll create mock asset data
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
        
        // Display the mock assets
        console.log('\nMock Assets Found:');
        
        console.log('\nERC20 Token Balances:');
        mockAssets.erc20Tokens.forEach(token => {
            // Convert from wei to token units (assuming 18 decimals)
            const readableBalance = parseInt(token.balance) / 1e18;
            console.log(`- ${token.token} (${token.symbol}): ${readableBalance} tokens`);
        });
        
        console.log('\nNFT Collections:');
        mockAssets.nfts.forEach(collection => {
            console.log(`- ${collection.collection}: ${collection.tokenIds.length} tokens`);
            collection.tokens.forEach(token => {
                console.log(`  - Token #${token.id}: ${token.name}`);
                console.log(`    Metadata: ${JSON.stringify(token.metadata)}`);
            });
        });
        
        console.log('\nCustom Assets:');
        mockAssets.customAssets.forEach(asset => {
            console.log(`- ${asset.name} (${asset.type}, ID: ${asset.id})`);
            console.log(`  Properties: ${JSON.stringify(asset.properties)}`);
        });
        
        console.log('\nScript completed successfully!');
        console.log('Note: This is a demonstration script with mock data. In a real environment with a STRATO node,');
        console.log('you would query the actual blockchain for the user\'s assets.');
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Run the main function
main();
