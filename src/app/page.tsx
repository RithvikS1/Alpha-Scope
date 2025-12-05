'use client'

import { TransactionFeed } from "@/components/TransactionFeed"
import { WalletAnalysis } from "@/components/WalletAnalysis"
import { ChainSelector } from "@/components/ChainSelector"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import { type ChainType } from "@/config/chains"

const queryClient = new QueryClient()

export default function Home() {
  const [selectedChain, setSelectedChain] = useState<ChainType>("ethereum")

  return (
    <QueryClientProvider client={queryClient}>
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Alpha Scope
            </h1>
            <ChainSelector onChainSelect={() => {}} />
          </div>
          <TransactionFeed />
        </div>
      </main>
    </QueryClientProvider>
  )
}
