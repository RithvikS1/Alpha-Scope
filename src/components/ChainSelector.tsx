import Image from "next/image"

interface ChainSelectorProps {
  onChainSelect: () => void
}

export function ChainSelector({ onChainSelect }: ChainSelectorProps) {
  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <button
        onClick={onChainSelect}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-200"
      >
        <Image
          src="/ethereum-logo.svg"
          alt="Ethereum"
          width={24}
          height={24}
          className="rounded-full"
        />
        <span className="font-medium">Ethereum</span>
      </button>
    </div>
  )
} 