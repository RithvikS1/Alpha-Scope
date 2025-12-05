/**
 * Helper function to call Alchemy API through the serverless proxy
 */
async function callAlchemy(method: string, params: any[] = []) {
  const response = await fetch('/api/alchemy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ method, params }),
  });

  if (!response.ok) {
    throw new Error(`Alchemy API error: ${response.statusText}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message || 'Alchemy API error');
  }
  return data.result;
}

/**
 * Alchemy proxy methods that mirror the Alchemy SDK API
 */
export const alchemyProxy = {
  async getBalance(address: string) {
    return callAlchemy('eth_getBalance', [address, 'latest']);
  },

  async getTokenBalances(address: string) {
    return callAlchemy('alchemy_getTokenBalances', [address]);
  },

  async getAssetTransfers(options: {
    fromBlock?: string;
    toBlock?: string;
    fromAddress?: string;
    toAddress?: string;
    category?: string[];
  }) {
    const params: any = {};
    if (options.fromBlock) params.fromBlock = options.fromBlock;
    if (options.toBlock) params.toBlock = options.toBlock;
    if (options.fromAddress) params.fromAddress = options.fromAddress;
    if (options.toAddress) params.toAddress = options.toAddress;
    if (options.category) params.category = options.category;
    
    return callAlchemy('alchemy_getAssetTransfers', [params]);
  },

  async getTransaction(txHash: string) {
    return callAlchemy('eth_getTransactionByHash', [txHash]);
  },

  async getTransactionReceipt(txHash: string) {
    return callAlchemy('eth_getTransactionReceipt', [txHash]);
  },

  async getBlock(blockNumber: string | number, fullTransactions: boolean = false) {
    const blockParam = typeof blockNumber === 'number' 
      ? `0x${blockNumber.toString(16)}` 
      : blockNumber;
    return callAlchemy('eth_getBlockByNumber', [blockParam, fullTransactions]);
  },
};

