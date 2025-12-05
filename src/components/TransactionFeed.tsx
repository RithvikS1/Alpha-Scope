import { useEffect, useState, useRef } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { formatEther, formatTimeAgo, shortenAddress, getTransactionLabel } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { alchemyProxy } from "@/lib/alchemy-proxy"
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

const TRANSACTIONS_PER_PAGE = 100
const MAX_CONCURRENT_PROCESSING = 5 // Process 5 transactions at a time for smooth updates

export function TransactionFeed() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selectedTx, setSelectedTx] = useState<string | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [pausedTransactions, setPausedTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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

      // Only require transaction and receipt - show all transactions including failed ones
      if (!tx || !receipt) return

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
    if (isPaused) return

    let isSubscribed = true
    let lastBlockNumber: number | null = null
    let pollInterval: NodeJS.Timeout | null = null
    let isPageVisible = true

    // Stop polling when page is hidden (tab switched, minimized, etc.)
    const handleVisibilityChange = () => {
      isPageVisible = !document.hidden
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    const pollForNewBlocks = async () => {
      // Stop polling if page is not visible or component is unmounted/paused
      if (!isSubscribed || isPaused || !isPageVisible) return

      try {
        setError(null)
        // Get the latest block number
        const latestBlock = await alchemyProxy.getBlock("latest", false)
        if (!latestBlock || !latestBlock.number) {
          if (isLoading) setIsLoading(false)
          return
        }

        const currentBlockNumber = typeof latestBlock.number === 'string' 
          ? parseInt(latestBlock.number, 16) 
          : Number(latestBlock.number)

        // On first poll, process the current block and a few recent blocks to populate feed
        if (lastBlockNumber === null) {
          // Process current block and last 2 blocks to populate feed initially
          const blocksToProcess = [currentBlockNumber, currentBlockNumber - 1, currentBlockNumber - 2]
          
          for (const blockNum of blocksToProcess) {
            if (blockNum < 0) continue
            if (!isSubscribed || isPaused || !isPageVisible) break

            try {
              const block = await alchemyProxy.getBlock(blockNum, false)
              if (!block || !block.transactions || block.transactions.length === 0) continue

              // Process transactions in small batches for smooth updates
              const txBatches: string[][] = []
              for (let i = 0; i < block.transactions.length; i += MAX_CONCURRENT_PROCESSING) {
                txBatches.push(block.transactions.slice(i, i + MAX_CONCURRENT_PROCESSING))
              }

              for (const batch of txBatches) {
                if (!isSubscribed || isPaused || !isPageVisible) break
                await Promise.all(batch.map((txHash: string) => processTransaction(txHash)))
                // Small delay between batches for smooth UI updates
                if (isSubscribed && !isPaused && isPageVisible) {
                  await new Promise(resolve => setTimeout(resolve, 100))
                }
              }
            } catch (error) {
              console.error(`Error processing block ${blockNum}:`, error)
            }
          }
          
          lastBlockNumber = currentBlockNumber
          if (isLoading) setIsLoading(false)
          return
        }

        // If we have a last block number, process all blocks since then
        if (lastBlockNumber !== null && currentBlockNumber > lastBlockNumber) {
          for (let blockNum = lastBlockNumber + 1; blockNum <= currentBlockNumber; blockNum++) {
            if (!isSubscribed || isPaused || !isPageVisible) break

            try {
              const block = await alchemyProxy.getBlock(blockNum, false)
              if (!block || !block.transactions) continue

              // Process transactions in small batches for smooth updates
              const txBatches: string[][] = []
              for (let i = 0; i < block.transactions.length; i += MAX_CONCURRENT_PROCESSING) {
                txBatches.push(block.transactions.slice(i, i + MAX_CONCURRENT_PROCESSING))
              }

              for (const batch of txBatches) {
                if (!isSubscribed || isPaused || !isPageVisible) break
                await Promise.all(batch.map((txHash: string) => processTransaction(txHash)))
                // Small delay between batches for smooth UI updates
                if (isSubscribed && !isPaused && isPageVisible) {
                  await new Promise(resolve => setTimeout(resolve, 100))
                }
              }
            } catch (error) {
              console.error(`Error processing block ${blockNum}:`, error)
            }
          }
        }

        lastBlockNumber = currentBlockNumber
        if (isLoading) setIsLoading(false)
      } catch (error) {
        console.error("Error polling for blocks:", error)
        setError(error instanceof Error ? error.message : "Failed to fetch blocks")
        if (isLoading) setIsLoading(false)
      }
    }

    // Initial poll to get current block
    pollForNewBlocks()

    // Poll every 2 seconds for new blocks (only when page is visible)
    pollInterval = setInterval(() => {
      if (isPageVisible && !isPaused) {
        pollForNewBlocks()
      }
    }, 2000)

    return () => {
      isSubscribed = false
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (pollInterval) {
        clearInterval(pollInterval)
      }
    }
  }, [isPaused, isLoading])

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
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
            <p className="text-red-800 dark:text-red-200 text-sm">
              Error: {error}
            </p>
          </div>
        )}
        {isLoading && transactions.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading transaction feed...</p>
            </div>
          </div>
        )}
        {!isLoading && transactions.length === 0 && !error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">No transactions yet</p>
              <p className="text-gray-500 dark:text-gray-500 text-sm">
                Waiting for new blocks... The feed will update automatically.
              </p>
            </div>
          </div>
        )}
        {transactions.length > 0 && (
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
        )}
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