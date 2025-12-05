import { useQuery } from "@tanstack/react-query"
import { formatEther, formatTimeAgo } from "@/lib/utils"
import { alchemyProxy } from "@/lib/alchemy-proxy"
import { Connection, PublicKey } from "@solana/web3.js"

interface WalletAnalysisProps {
  address: string
  chain: "ethereum" | "solana"
}

const solanaConnection = new Connection(
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com"
)

interface TransferTransaction {
  value?: string | number;
  asset?: string;
  blockTime?: Date | string | number;
  metadata?: {
    blockTimestamp?: string | number | Date;
  };
  timestamp?: Date | string | number;
  amount?: string | number;
}

export function WalletAnalysis({ address, chain }: WalletAnalysisProps) {

  const { data: walletData, isLoading: isLoadingWallet } = useQuery({
    queryKey: ["wallet", address, chain],
    queryFn: async () => {
      if (chain === "ethereum") {
        const balance = await alchemyProxy.getBalance(address)
        const tokenBalances = await alchemyProxy.getTokenBalances(address)
        const transfers = await alchemyProxy.getAssetTransfers({
          fromBlock: "0x0",
          fromAddress: address,
          category: ["external", "internal", "erc20", "erc721", "erc1155"],
        })

        return {
          balance,
          tokenBalances,
          transfers: transfers.transfers,
        }
      } else {
        const pubkey = new PublicKey(address)
        const balance = await solanaConnection.getBalance(pubkey)
        const tokens = await solanaConnection.getParsedTokenAccountsByOwner(pubkey, {
          programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
        })
        const signatures = await solanaConnection.getSignaturesForAddress(pubkey)
        const transfers = await Promise.all(
          signatures.slice(0, 10).map(sig => 
            solanaConnection.getParsedTransaction(sig.signature)
          )
        )

        return {
          balance: balance.toString(),
          tokenBalances: {
            tokenBalances: tokens.value.map(t => ({
              contractAddress: t.pubkey.toString(),
              tokenBalance: t.account.data.parsed.info.tokenAmount.amount,
            }))
          },
          transfers: transfers.filter(Boolean).map(tx => ({
            hash: tx?.transaction.signatures[0],
            blockTime: tx?.blockTime ? new Date(tx.blockTime * 1000) : new Date(),
            from: tx?.transaction.message.accountKeys[0].pubkey.toString(),
            to: tx?.transaction.message.accountKeys[1].pubkey.toString(),
            amount: (tx?.meta?.postBalances?.[0] ?? 0) - (tx?.meta?.preBalances?.[0] ?? 0),
          })),
        }
      }
    },
  })

  if (isLoadingWallet) {
    return <div className="p-4">Loading wallet data...</div>
  }

  if (!walletData) {
    return <div className="p-4">No wallet data available</div>
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Wallet Overview</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-gray-500">Balance</span>
            <p className="text-lg font-medium">
              {formatEther(walletData.balance.toString())} {chain === "ethereum" ? "ETH" : "SOL"}
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Token Count</span>
            <p className="text-lg font-medium">{walletData.tokenBalances.tokenBalances.length}</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xl font-semibold">Recent Transfers</h3>
        <div className="space-y-2">
          {walletData.transfers.slice(0, 5).map((transfer: TransferTransaction, index: number) => (
            <div key={index} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
              <div>
                <span className="text-sm font-medium">
                  {transfer.asset || (chain === "ethereum" ? "ETH" : "SOL")}
                </span>
                <span className="text-xs text-gray-500 ml-2">
                  {formatTimeAgo(transfer.blockTime || transfer.metadata?.blockTimestamp || transfer.timestamp)}
                </span>
              </div>
              <span className="font-medium">
                {transfer.value || transfer.amount} {transfer.asset || (chain === "ethereum" ? "ETH" : "SOL")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 