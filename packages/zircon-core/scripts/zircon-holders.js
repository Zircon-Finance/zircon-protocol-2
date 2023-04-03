const { ethers } = require('ethers');
const fs = require('fs');
const csvParser = require('csv-parser');
const AWS = require('aws-sdk');

const providerUrl = 'YOUR_PROVIDER_URL'; // Replace with your QuickNode or Infura URL
const tokenContractAddress = 'TOKEN_CONTRACT_ADDRESS'; // Replace with the ERC20 token contract address
const abi = [
    // ERC20 ABI (simplified)
    'function balanceOf(address owner) view returns (uint256)',
];

const holdersCsvPath = './json/holders.csv'; // Replace with the path to your CSV file containing the token holders' addresses

// Configure AWS SDK and DynamoDB
// AWS.config.update({
//     region: 'YOUR_AWS_REGION', // Replace with your AWS region
//     accessKeyId: 'YOUR_AWS_ACCESS_KEY_ID', // Replace with your AWS access key ID
//     secretAccessKey: 'YOUR_AWS_SECRET_ACCESS_KEY', // Replace with your AWS secret access key
// });

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const tableName = 'TokenBalances'; // Replace with your DynamoDB table name

async function getBalances() {
    const provider = new ethers.providers.JsonRpcProvider(providerUrl);
    const tokenContract = new ethers.Contract(tokenContractAddress, abi, provider);

    const addresses = [];

    // Read the addresses from the CSV file
    fs.createReadStream(holdersCsvPath)
        .pipe(csvParser())
        .on('data', (row) => {
            addresses.push(row.address); // Assuming the CSV has a column named 'address'
        })
        .on('end', async () => {
            console.log('Finished reading CSV file.');

            const balances = [];

            for (const address of addresses) {
                const balance = await tokenContract.balanceOf(address);
                balances.push({ address, balance: ethers.utils.formatEther(balance) });

                // Save the balance to DynamoDB
                await saveBalanceToDynamoDB(address, ethers.utils.formatEther(balance));
            }

            console.log('Balances:', balances);
        });
}

async function saveBalanceToDynamoDB(address, balance) {
    const params = {
        TableName: tableName,
        Item: {
            address,
            balance,
        },
    };

    try {
        await dynamoDb.put(params).promise();
        console.log(`Saved balance for address ${address} to DynamoDB.`);
    } catch (error) {
        console.error(`Failed to save balance for address ${address}:`, error);
    }
}

getBalances().catch((error) => console.error(error));
