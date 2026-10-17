import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useReadContract } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import { toast } from 'sonner'
import { Flame, ExternalLink } from 'lucide-react'
import { ARC_TOKEN_ABI, ARC_TOKEN_ADDRESS } from '@/abi/ArcToken'
import { buildTxExplorerUrl } from '@/onchain-facts'
import {
  cardStyle, cardTitle, cardSubtitle, labelStyle, inputStyle,
  inputSuffix, hintText, successBanner, errorBanner, explorerLink,
  primaryBtn, iconBadge,
} from './MintForm'

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
    address: ARC_TOKEN_ADDRESS,
    abi: ARC_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
    chainId: CHAIN_ID,
  })

  const {
    writeContract, data: txHash, isPending, error: writeError, reset,
  } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  const isWrongChain = !!address && chainId !== CHAIN_ID

  const handleBurn = () => {
    if (isWrongChain) { switchChain({ chainId: CHAIN_ID }); return }
    const parsed = parseFloat(amount)
    if (!amount || isNaN(parsed) || parsed <= 0) { toast.error('Enter a valid amount greater than 0.'); return }
    reset()
    writeContract({
      address: ARC_TOKEN_ADDRESS,
      abi: ARC_TOKEN_ABI,
      functionName: 'burn',
      args: [parseUnits(amount, TOKEN_DECIMALS)],
      chainId: CHAIN_ID,
    })
  }

  const explorerUrl = txHash ? buildTxExplorerUrl(CHAIN_ID, txHash) : undefined
  const formattedBalance = balance != null
    ? Number(formatUnits(balance, TOKEN_DECIMALS)).toLocaleString('en-US', { maximumFractionDigits: 4 })
    : '—'
  const disabled = !address || isPending || isConfirming

  return (
    <section style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
        <div style={iconBadge('#ba2b4c', 'rgba(186,43,76,0.08)')}>
          <Flame size={16} color="#ba2b4c" />
        </div>
        <div>
          <h3 className="display" style={cardTitle}>Burn Tokens</h3>
          <p style={cardSubtitle}>Burns from your own balance</p>
        </div>
      </div>

      {!address ? (
        <p style={hintText}>Connect your wallet to burn.</p>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Amount</label>
            <span style={{ fontSize: '12px', color: 'var(--subtle)' }}>
              Balance: <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{formattedBalance}</span>
            </span>
          </div>
          <div style={{ position: 'relative' }}>
            <input
              type="number"
              placeholder="0"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ ...inputStyle, paddingRight: '52px' }}
              disabled={isPending || isConfirming}
            />
            <span style={inputSuffix}>ARCT</span>
          </div>
          {balance != null && (
            <button
              onClick={() => setAmount(formatUnits(balance, TOKEN_DECIMALS))}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '11px', fontWeight: 600, color: 'var(--accent)',
                padding: '4px 0', marginTop: '4px',
              }}
            >
              Use max
            </button>
          )}

          {isWrongChain ? (
            <button onClick={() => switchChain({ chainId: CHAIN_ID })} style={primaryBtn('#1061a6')}>
              Switch to Arc Testnet
            </button>
          ) : (
            <button onClick={handleBurn} disabled={disabled} style={primaryBtn('#ba2b4c', disabled)}>
              {isPending ? 'Confirm in wallet…' : isConfirming ? 'Confirming…' : 'Burn'}
            </button>
          )}

          {isSuccess && txHash && (
            <div style={successBanner}>
              Burned successfully!{' '}
              <a href={explorerUrl} target="_blank" rel="noopener noreferrer" style={explorerLink}>
                View tx <ExternalLink size={11} style={{ verticalAlign: 'middle' }} />
              </a>
            </div>
          )}
          {writeError && <div style={errorBanner}>{parseOnchainError(writeError)}</div>}
        </>
      )}
    </section>
  )
}
