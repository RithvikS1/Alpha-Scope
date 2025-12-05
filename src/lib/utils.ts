import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNow } from "date-fns"
import { ethers } from "ethers"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTimeAgo(date: Date | number | string | undefined) {
  if (!date) return "Unknown time"
  try {
    const dateObj = date instanceof Date ? date : new Date(date)
    if (isNaN(dateObj.getTime())) return "Invalid date"
    return formatDistanceToNow(dateObj, { addSuffix: true })
  } catch {
    return "Invalid date"
  }
}

export function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function formatEther(wei: string | ethers.BigNumber) {
  try {
    const weiString = typeof wei === 'string' ? wei : wei.toString()
    return parseFloat(ethers.formatEther(weiString)).toFixed(4)
  } catch (error) {
    console.error('Error formatting ether value:', error)
    return '0.0000'
  }
}

export function formatUSD(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

export function getTransactionLabel(
  value: string,
  methodName: string | null,
  slippage: number | null,
  priceImpact: number | null
): string {
  const valueInEth = parseFloat(ethers.formatEther(value))
  
  // Whale Activity Detection (Large Transactions)
  if (valueInEth > 100) {
    if (priceImpact && priceImpact > 5) return "🐋💥 Whale Liquidation"
    if (priceImpact && priceImpact > 2) return "🐋📉 Whale Distribution"
    if (priceImpact && priceImpact < 0.5 && valueInEth > 500) return "🐋📈 Whale Accumulation"
    if (slippage && slippage > 3) return "🐋💨 Whale Market Dump"
    if (slippage && slippage < 0.1 && valueInEth > 1000) return "🐋🎯 Strategic Whale"
    return "🐋 Whale Movement"
  }

  // Smart Contract Interactions
  if (methodName) {
    const method = methodName.toLowerCase()
    
    // DEX and Trading Activity
    if (method.includes("swap")) {
      if (slippage && slippage > 3) return "📉💨 Panic Sell"
      if (priceImpact && priceImpact < 0.1) return "🤖⚡ MEV Sandwich"
      if (valueInEth > 50) return "🔄💰 Large Position Swap"
      if (slippage && slippage < 0.1) return "🎯 Limit Swap"
      return "💱 DEX Trade"
    }

    // Lending and Borrowing
    if (method.includes("borrow")) {
      if (valueInEth > 100) return "🏦💰 Large Loan"
      if (slippage && slippage > 1) return "⚡💸 Flash Loan"
      return "💰 DeFi Borrow"
    }

    if (method.includes("repay")) {
      if (valueInEth > 100) return "🏦✅ Large Repayment"
      if (priceImpact && priceImpact > 2) return "🏦⚠️ Forced Repayment"
      return "💰 DeFi Repay"
    }

    // Staking and Yield
    if (method.includes("stake")) {
      if (valueInEth >= 32) return "🎯🔒 ETH2 Validator"
      if (valueInEth > 10) return "🌾💰 Large Stake"
      return "🌾 Yield Stake"
    }

    if (method.includes("deposit")) {
      if (valueInEth > 50) return "💎🔒 Large Lock"
      if (slippage && slippage < 0.1) return "🎯 Strategic Deposit"
      return "📥 Deposit"
    }

    if (method.includes("withdraw")) {
      if (valueInEth > 50) return "💎🔓 Large Unlock"
      if (priceImpact && priceImpact > 2) return "🚨 Forced Withdrawal"
      return "📤 Withdrawal"
    }

    // NFT Related
    if (method.includes("mint")) {
      if (valueInEth > 1) return "🎨💰 High-Value Mint"
      return "🎨 NFT Mint"
    }

    if (method.includes("transfer") && method.includes("721")) {
      if (valueInEth > 1) return "🎭💰 High-Value NFT"
      return "🎭 NFT Transfer"
    }

    // Governance
    if (method.includes("vote") || method.includes("propose")) {
      return "🏛️ Governance"
    }

    // Bridge Transactions
    if (method.includes("bridge") || method.includes("portal")) {
      if (valueInEth > 10) return "🌉💰 Large Bridge"
      return "🌉 Bridge Transfer"
    }
  }

  // Market Behavior Analysis
  if (slippage && priceImpact) {
    // High-Impact Trades
    if (slippage > 5 && priceImpact > 3) {
      if (valueInEth > 50) return "💣💥 Major Market Move"
      return "📊⚠️ High Market Impact"
    }

    // Arbitrage Detection
    if (slippage < 0.1 && priceImpact < 0.1) {
      if (valueInEth > 10) return "⚡💰 Large Arbitrage"
      if (valueInEth > 1) return "⚡ Fast Arbitrage"
      return "🤖 Bot Trade"
    }

    // Market Making
    if (slippage < 0.5) {
      if (valueInEth > 10) return "💧💰 Large LP Add"
      if (valueInEth > 1) return "💧 Liquidity Add"
      return "💧 Small LP"
    }
  }

  // Time-Sensitive Trades
  if (priceImpact) {
    if (priceImpact > 5) return "🚨💥 Emergency Exit"
    if (priceImpact > 3) return "🔥 Urgent Exit"
    if (priceImpact > 1 && valueInEth > 5) return "⏰💨 Time-Sensitive"
    if (priceImpact < 0.05 && valueInEth > 1) return "🎯 Precision Trade"
  }

  // Generic Classifications by Value
  if (valueInEth > 75) return "💎 Large Value Transfer"
  if (valueInEth > 25) return "💼 Significant Transfer"
  if (valueInEth > 5) return "📦 Medium Transfer"
  if (valueInEth > 1) return "💱 Standard Transfer"
  if (valueInEth > 0.1) return "🔹 Small Transfer"
  if (valueInEth > 0.01) return "📍 Micro Transfer"
  
  return "�� Dust Transfer"
} 