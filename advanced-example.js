/**
 * Advanced example demonstrating blockapps-rest with a more complex smart contract
 * 
 * NOTE: This is a demonstration script. To run it successfully, you would need:
 * 1. A running STRATO node
 * 2. A configured OAuth server
 * 3. Valid OAuth credentials in config.yaml
 * 4. A valid OAuth token (typically obtained through an OAuth flow)
 * 
 * Usage: 
 * - Set the OAUTH_TOKEN environment variable with a valid token
 * - Run: node advanced-example.js
 */

// Import the blockapps-rest package
const { rest, fsUtil, util } = require('blockapps-rest');

// Read configuration
const config = fsUtil.getYaml('config.yaml');

// Create options object
const options = { config, logger: console };

// Advanced smart contract for demonstration - a simple token contract
const TOKEN_CONTRACT_SOURCE = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title SimpleToken
 * @dev A simple ERC20-like token implementation
 */
contract SimpleToken {
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;
    
    mapping(address => uint256) private balances;
    mapping(address => mapping(address => uint256)) private allowances;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    /**
     * @dev Constructor that initializes the token with name, symbol, decimals and initial supply
     */
    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint256 _initialSupply,
        address _initialHolder
    ) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        totalSupply = _initialSupply * (10 ** uint256(_decimals));
        balances[_initialHolder] = totalSupply;
        
        emit Transfer(address(0), _initialHolder, totalSupply);
    }
    
    /**
     * @dev Returns the balance of the specified address
     */
    function balanceOf(address account) public view returns (uint256) {
        return balances[account];
    }
    
    /**
     * @dev Transfers tokens to the specified address
     */
    function transfer(address to, uint256 amount) public returns (bool) {
        require(to != address(0), "Transfer to zero address");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        balances[msg.sender] -= amount;
        balances[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    /**
     * @dev Returns the allowance that the owner has given to the spender
     */
    function allowance(address owner, address spender) public view returns (uint256) {
        return allowances[owner][spender];
    }
    
    /**
     * @dev Approves the spender to spend the specified amount of tokens
     */
    function approve(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Approve to zero address");
        
        allowances[msg.sender][spender] = amount;
        
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    /**
     * @dev Transfers tokens from one address to another using allowance
     */
    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        require(from != address(0), "Transfer from zero address");
        require(to != address(0), "Transfer to zero address");
        require(balances[from] >= amount, "Insufficient balance");
        require(allowances[from][msg.sender] >= amount, "Insufficient allowance");
        
        balances[from] -= amount;
        balances[to] += amount;
        allowances[from][msg.sender] -= amount;
        
        emit Transfer(from, to, amount);
        return true;
    }
}
`;

// Main function to demonstrate advanced blockapps-rest functionality
async function main() {
    try {
        console.log('BlockApps REST Advanced Example Script');
        console.log('-------------------------------------');
        
        // Get OAuth token from environment variable
        const token = process.env.OAUTH_TOKEN || 'mock-oauth-token';
        console.log(`Using token: ${token.substring(0, 5)}...`);
        
        // Step 1: Create users
        console.log('\n1. Creating users...');
        console.log('In a real environment with proper OAuth setup, this would create blockchain users:');
        
        // Mock users for demonstration
        const mockOwner = {
            address: '0x1234567890abcdef1234567890abcdef12345678',
            name: 'Token Owner'
        };
        
        const mockUser1 = {
            address: '0x2345678901abcdef2345678901abcdef23456789',
            name: 'User 1'
        };
        
        const mockUser2 = {
            address: '0x3456789012abcdef3456789012abcdef34567890',
            name: 'User 2'
        };
        
        console.log('Users created:', [mockOwner.name, mockUser1.name, mockUser2.name]);
        
        // Step 2: Deploy the token contract
        console.log('\n2. Deploying token contract...');
        console.log('In a real environment with a STRATO node, this would deploy the contract:');
        
        const contractArgs = {
            name: 'SimpleToken',
            source: TOKEN_CONTRACT_SOURCE,
            args: {
                _name: 'Sample Token',
                _symbol: 'STKN',
                _decimals: 18,
                _initialSupply: 1000000,
                _initialHolder: mockOwner.address
            }
        };
        
        console.log(`await rest.createContract(owner, ${JSON.stringify({
            name: contractArgs.name,
            args: contractArgs.args
        }, null, 2)}, options);`);
        
        // Mock contract for demonstration
        const mockContract = {
            name: 'SimpleToken',
            address: '0xabcdef1234567890abcdef1234567890abcdef12',
            source: TOKEN_CONTRACT_SOURCE,
            binary: '0x...' // Binary representation would be here
        };
        console.log('Contract deployed:', mockContract.name, 'at address', mockContract.address);
        
        // Step 3: Check token details and initial balance
        console.log('\n3. Checking token details and initial balance...');
        
        // Mock token details
        const mockTokenDetails = {
            name: 'Sample Token',
            symbol: 'STKN',
            decimals: 18,
            totalSupply: '1000000000000000000000000' // 1,000,000 tokens with 18 decimals
        };
        
        console.log('Token details:', mockTokenDetails);
        
        // Check owner balance
        console.log('\nChecking owner balance:');
        console.log(`await rest.call(owner, {
  contract: contract,
  method: 'balanceOf',
  args: { account: '${mockOwner.address}' }
}, options);`);
        
        // Mock balance result
        console.log('Owner balance:', mockTokenDetails.totalSupply);
        
        // Step 4: Transfer tokens from owner to User 1
        console.log('\n4. Transferring tokens from owner to User 1...');
        const transferAmount = '100000000000000000000'; // 100 tokens with 18 decimals
        
        console.log(`await rest.call(owner, {
  contract: contract,
  method: 'transfer',
  args: { 
    to: '${mockUser1.address}',
    amount: '${transferAmount}'
  }
}, options);`);
        
        // Mock updated balances after transfer
        const ownerBalanceAfterTransfer = '999900000000000000000000'; // 999,900 tokens
        const user1BalanceAfterTransfer = transferAmount; // 100 tokens
        
        console.log('Transfer successful');
        console.log('Owner new balance:', ownerBalanceAfterTransfer);
        console.log('User 1 balance:', user1BalanceAfterTransfer);
        
        // Step 5: Approve User 2 to spend tokens on behalf of User 1
        console.log('\n5. User 1 approving User 2 to spend tokens...');
        const approvalAmount = '50000000000000000000'; // 50 tokens with 18 decimals
        
        console.log(`await rest.call(user1, {
  contract: contract,
  method: 'approve',
  args: { 
    spender: '${mockUser2.address}',
    amount: '${approvalAmount}'
  }
}, options);`);
        
        console.log('Approval successful');
        
        // Check allowance
        console.log('\nChecking allowance:');
        console.log(`await rest.call(user1, {
  contract: contract,
  method: 'allowance',
  args: { 
    owner: '${mockUser1.address}',
    spender: '${mockUser2.address}'
  }
}, options);`);
        
        console.log('Allowance:', approvalAmount);
        
        // Step 6: User 2 transfers tokens from User 1 to themselves using allowance
        console.log('\n6. User 2 transferring tokens from User 1 using allowance...');
        const transferFromAmount = '30000000000000000000'; // 30 tokens with 18 decimals
        
        console.log(`await rest.call(user2, {
  contract: contract,
  method: 'transferFrom',
  args: { 
    from: '${mockUser1.address}',
    to: '${mockUser2.address}',
    amount: '${transferFromAmount}'
  }
}, options);`);
        
        // Mock updated balances and allowance after transferFrom
        const user1BalanceAfterTransferFrom = '70000000000000000000'; // 70 tokens
        const user2BalanceAfterTransferFrom = transferFromAmount; // 30 tokens
        const remainingAllowance = '20000000000000000000'; // 20 tokens
        
        console.log('Transfer from successful');
        console.log('User 1 new balance:', user1BalanceAfterTransferFrom);
        console.log('User 2 balance:', user2BalanceAfterTransferFrom);
        console.log('Remaining allowance:', remainingAllowance);
        
        console.log('\nAdvanced example completed successfully!');
        console.log('Note: This is a demonstration script. In a real environment, you would need a proper STRATO node and OAuth setup.');
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Run the main function
main();
