import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useReadContract } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import { toast } from 'sonner'
import { ExternalLink } from 'lucide-react'
import { ARC_TOKEN_ABI, ARC_TOKEN_ADDRESS } from '@/abi/ArcToken'
import { buildTxExplorerUrl } from '@/onchain-facts'
import { labelStyle, inputStyle, suffixStyle, hint, successBanner, errorBanner, explorerLink, Cta } from './MintForm'

const CHAIN_ID = 5042002
const TOKEN_DECIMALS = 18

function parseOnchainError(error: unknown): string {
  const msg = (error as { message?: string })?.message?.toLowerCase() ?? ''
  if (msg.includes('user rejected') || msg.includes('user denied')) return 'Transaction cancelled.'
  if (msg.includes('enforcedpause')) return 'Contract is paused — burning is disabled.'
  if (msg.includes('erc20insufficientbalance')) return 'Insufficient token balance to burn.'
  if (msg.includes('insufficient funds')) return 'Insufficient USDC for gas.'
  return 'Transaction failed. Check the console for details.'
}

export function BurnForm() {
  const { address, chainId } = useAccount()
  const { switchChain } = useSwitchChain()
  const [amount, setAmount] = useState('')

  const { data: balance } = useReadContract({
    address: ARC_TOKEN_ADDRESS, abi: ARC_TOKEN_ABI, functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address }, chainId: CHAIN_ID,
  })

  const { writeContract, data: txHash, isPending, error: writeError, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })
  const isWrongChain = !!address && chainId !== CHAIN_ID
  const explorerUrl = txHash ? buildTxExplorerUrl(CHAIN_ID, txHash) : undefined

  const formattedBalance = balance != null
    ? Number(formatUnits(balance, TOKEN_DECIMALS)).toLocaleString('en-US', { maximumFractionDigits: 4 })
    : null

  const handleBurn = () => {
    if (isWrongChain) { switchChain({ chainId: CHAIN_ID }); return }
    const parsed = parseFloat(amount)
    if (!amount || isNaN(parsed) || parsed <= 0) { toast.error('Enter a valid amount greater than 0.'); return }
    reset()
    writeContract({ address: ARC_TOKEN_ADDRESS, abi: ARC_TOKEN_ABI, functionName: 'burn', args: [parseUnits(amount, TOKEN_DECIMALS)], chainId: CHAIN_ID })
  }

  if (!address) return <p style={hint}>Connect your wallet to burn.</p>

  const busy = isPending || isConfirming

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>Amount</label>
          {formattedBalance != null && (
            <button
              onClick={() => balance != null && setAmount(formatUnits(balance, TOKEN_DECIMALS))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 700, color: 'var(--accent)', padding: 0, fontFamily: 'inherit' }}
            >
              Balance: {formattedBalance} · Max
            </button>
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <input
            inputMode="decimal"
            placeholder="0"
            value={amount}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9.]/g, '')
              if (v === '' || /^\d*\.?\d*$/.test(v)) setAmount(v)
            }}
            style={{ ...inputStyle, paddingRight: '56px' }}
            disabled={busy}
          />
          <span style={suffixStyle}>ARCT</span>
        </div>
      </div>

      <Cta
        isWrongChain={isWrongChain}
        isPending={isPending}
        isConfirming={isConfirming}
        onAction={handleBurn}
        onSwitch={() => switchChain({ chainId: CHAIN_ID })}
        label="Burn tokens"
        color="#ba2b4c"
      />

      {isSuccess && txHash && (
        <div style={successBanner}>
          Burned successfully!{' '}
          <a href={explorerUrl} target="_blank" rel="noopener noreferrer" style={explorerLink}>
            View tx <ExternalLink size={11} style={{ verticalAlign: 'middle' }} />
          </a>
        </div>
      )}
      {writeError && <div style={errorBanner}>{parseOnchainError(writeError)}</div>}
    </div>
  )
}
