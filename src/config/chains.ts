export const CHAIN_CONFIG = {
  ethereum: {
    mainnet: {
      name: "Ethereum Mainnet",
      networkUrl: process.env.NEXT_PUBLIC_ETH_NETWORK_URL,
      alchemyApiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
      blockExplorer: "https://etherscan.io",
      symbol: "ETH",
      icon: "https://ethereum.org/static/4f10d2777b2d14759feb01c65b2765f7/69ce7/eth-glyph-colored.webp"
    }
  },
  solana: {
    mainnet: {
      name: "Solana Mainnet",
      networkUrl: process.env.NEXT_PUBLIC_SOLANA_NETWORK_URL,
      blockExplorer: "https://solscan.io",
      symbol: "SOL",
      icon: "https://solana.com/_next/static/media/solanaLogoMark.17260911.svg"
    }
  }
} as const

export type ChainType = keyof typeof CHAIN_CONFIG
export type NetworkType = "mainnet"

export function getChainConfig(chain: ChainType, network: NetworkType = "mainnet") {
  return CHAIN_CONFIG[chain][network]
}

export function getBlockExplorerUrl(chain: ChainType, type: "tx" | "address", hash: string) {
  const config = getChainConfig(chain, "mainnet")
  return `${config.blockExplorer}/${type}/${hash}`
} 