import { useEffect, useState, useRef } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { formatEther, formatTimeAgo, shortenAddress, getTransactionLabel } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { alchemyProxy } from "@/lib/alchemy-proxy"
import { Alchemy, Network, WebsocketProvider } from "alchemy-sdk"
import { Play, Pause } from "lucide-react"

interface Transaction {
  id: string
  hash: string
  from: string
  to: string
  value: string
  valueUSD: number | null
  gasFee: string
  timestamp: Date
  tokenAddress: string | null
  tokenSymbol: string | null
  methodName: string | null
  slippage: number | null
  priceImpact: number | null
  label: string | null
}

const ethConfig = {
  apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
  network: process.env.NEXT_PUBLIC_ALCHEMY_NETWORK as Network,
}

const ethAlchemy = new Alchemy(ethConfig)

const TRANSACTIONS_PER_PAGE = 100
const MAX_CONCURRENT_PROCESSING = 5 // Process 5 transactions at a time for smooth updates

export function TransactionFeed() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selectedTx, setSelectedTx] = useState<string | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [pausedTransactions, setPausedTransactions] = useState<Transaction[]>([])
  const parentRef = useRef<HTMLDivElement>(null)
  const processingTxs = useRef<Set<string>>(new Set())

  const virtualizer = useVirtualizer({
    count: transactions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 10,
  })

  const processTransaction = async (txHash: string) => {
    if (processingTxs.current.has(txHash)) return
    processingTxs.current.add(txHash)

    try {
      const [tx, receipt] = await Promise.all([
        alchemyProxy.getTransaction(txHash),
        alchemyProxy.getTransactionReceipt(txHash)
      ])

      if (!tx || !receipt || receipt.status !== 1) return

      const methodName = tx.data && tx.data !== "0x" ? tx.data.slice(0, 10) : null
      const slippage = receipt.effectiveGasPrice && tx.gasPrice ?
        (Number(receipt.effectiveGasPrice) - Number(tx.gasPrice)) / Number(tx.gasPrice) * 100 : null
      const priceImpact = receipt.gasUsed && tx.value ?
        (Number(receipt.gasUsed) * Number(receipt.effectiveGasPrice)) / Number(tx.value) * 100 : null

      const newTx: Transaction = {
        id: txHash,
        hash: txHash,
        from: tx.from,
        to: tx.to || "",
        value: tx.value.toString(),
        valueUSD: null,
        gasFee: receipt.effectiveGasPrice.toString(),
        timestamp: new Date(),
        tokenAddress: null,
        tokenSymbol: null,
        methodName,
        slippage,
        priceImpact,
        label: getTransactionLabel(tx.value.toString(), methodName, slippage, priceImpact)
      }

      setTransactions(prev => {
        const filtered = prev.filter(t => t.hash !== newTx.hash)
        return [newTx, ...filtered].slice(0, TRANSACTIONS_PER_PAGE)
      })
    } catch (error) {
      console.error("Error processing transaction:", error)
    } finally {
      processingTxs.current.delete(txHash)
    }
  }

  useEffect(() => {
    const ws = ethAlchemy.ws as WebsocketProvider
    let isSubscribed = true

    ws.on("block", async (blockNumber) => {
      if (!isSubscribed || isPaused) return

      try {
        const block = await alchemyProxy.getBlock(blockNumber, false)
        if (!block || !block.transactions) return

        // Process transactions in small batches for smooth updates
        const txBatches = []
        for (let i = 0; i < block.transactions.length; i += MAX_CONCURRENT_PROCESSING) {
          txBatches.push(block.transactions.slice(i, i + MAX_CONCURRENT_PROCESSING))
        }

        for (const batch of txBatches) {
          await Promise.all(batch.map(txHash => processTransaction(txHash)))
          // Small delay between batches for smooth UI updates
          if (isSubscribed && !isPaused) await new Promise(resolve => setTimeout(resolve, 100))
        }
      } catch (error) {
        console.error("Error processing block:", error)
      }
    })

    return () => {
      isSubscribed = false
      ws.removeAllListeners()
    }
  }, [isPaused])

  const handlePauseToggle = () => {
    if (isPaused) {
      // When unpausing, update to latest transactions
      setTransactions(prevTransactions => {
        // Merge paused transactions with any new ones that came in
        const allTransactions = [...pausedTransactions, ...prevTransactions]
        // Remove duplicates and sort by timestamp
        const uniqueTransactions = Array.from(
          new Map(allTransactions.map(tx => [tx.hash, tx])).values()
        ).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        return uniqueTransactions.slice(0, TRANSACTIONS_PER_PAGE)
      })
    } else {
      // When pausing, store current transactions
      setPausedTransactions(transactions)
    }
    setIsPaused(!isPaused)
  }

  return (
    <div className="flex h-screen gap-4">
      {/* Control Bar */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          onClick={handlePauseToggle}
          variant={isPaused ? "destructive" : "default"}
          className="flex items-center gap-2"
        >
          {isPaused ? (
            <>
              <Play className="h-4 w-4" />
              Resume Feed
            </>
          ) : (
            <>
              <Pause className="h-4 w-4" />
              Pause Feed
            </>
          )}
        </Button>
      </div>

      {/* Transaction List */}
      <div ref={parentRef} className="flex-1 overflow-y-auto p-4">
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const tx = transactions[virtualRow.index]
            return (
              <div
                key={tx.hash}
                className={`absolute top-0 left-0 w-full ${
                  selectedTx === tx.hash ? "border-2 border-blue-500" : ""
                }`}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div 
                  className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 cursor-pointer transition-colors m-2"
                  onClick={() => setSelectedTx(tx.hash)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">{tx.label}</span>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {shortenAddress(tx.from)} → {shortenAddress(tx.to)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTimeAgo(tx.timestamp)}
                        </span>
                      </div>
                    </div>
                    <span className="font-medium">
                      {formatEther(tx.value)} ETH
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Transaction Details Panel */}
      <div className="w-96 p-4 bg-white dark:bg-gray-800 rounded-lg shadow overflow-y-auto">
        {selectedTx ? (
          transactions.find(tx => tx.hash === selectedTx) ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Transaction Details</h3>
              
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-500">Hash</span>
                  <p className="font-mono text-sm break-all">{selectedTx}</p>
                </div>
                
                <div>
                  <span className="text-sm text-gray-500">From</span>
                  <p className="font-mono text-sm break-all">
                    {transactions.find(tx => tx.hash === selectedTx)?.from}
                  </p>
                </div>
                
                <div>
                  <span className="text-sm text-gray-500">To</span>
                  <p className="font-mono text-sm break-all">
                    {transactions.find(tx => tx.hash === selectedTx)?.to}
                  </p>
                </div>
                
                <div>
                  <span className="text-sm text-gray-500">Value</span>
                  <p className="font-medium">
                    {formatEther(transactions.find(tx => tx.hash === selectedTx)?.value || "0")} ETH
                  </p>
                </div>

                <div>
                  <span className="text-sm text-gray-500">Method</span>
                  <p className="font-mono text-sm">
                    {transactions.find(tx => tx.hash === selectedTx)?.methodName || "Transfer"}
                  </p>
                </div>

                <div>
                  <span className="text-sm text-gray-500">Gas Used</span>
                  <p className="font-mono text-sm">
                    {transactions.find(tx => tx.hash === selectedTx)?.gasFee || "0"} Wei
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`https://etherscan.io/tx/${selectedTx}`, "_blank")}
                >
                  View on Etherscan
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const tx = transactions.find(tx => tx.hash === selectedTx)
                    if (tx) {
                      window.open(`https://etherscan.io/address/${tx.from}`, "_blank")
                    }
                  }}
                >
                  View Wallet
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">Transaction not found</div>
          )
        ) : (
          <div className="text-center py-4 text-gray-500">
            Select a transaction to view details
          </div>
        )}
      </div>
    </div>
  )
} 