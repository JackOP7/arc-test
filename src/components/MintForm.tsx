import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useReadContract } from 'wagmi'
import { parseUnits, isAddress } from 'viem'
import { toast } from 'sonner'
import { ExternalLink, Loader2 } from 'lucide-react'
import { ARC_TOKEN_ABI, ARC_TOKEN_ADDRESS } from '@/abi/ArcToken'
import { MINTER_ROLE } from './TokenInfo'
import { buildTxExplorerUrl } from '@/onchain-facts'

const CHAIN_ID = 5042002
const TOKEN_DECIMALS = 18

function parseOnchainError(error: unknown): string {
  const msg = (error as { message?: string })?.message?.toLowerCase() ?? ''
  if (msg.includes('user rejected') || msg.includes('user denied')) return 'Transaction cancelled.'
  if (msg.includes('enforcedpause')) return 'Contract is paused — minting is disabled.'
  if (msg.includes('accesscontrolunauthorized')) return 'Your wallet does not have the Minter role.'
  if (msg.includes('insufficient funds')) return 'Insufficient USDC for gas.'
  return 'Transaction failed. Check the console for details.'
}

export function MintForm() {
  const { address, chainId } = useAccount()
  const { switchChain } = useSwitchChain()
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')

  const { data: hasMinter } = useReadContract({
    address: ARC_TOKEN_ADDRESS, abi: ARC_TOKEN_ABI, functionName: 'hasRole',
    args: address ? [MINTER_ROLE, address] : undefined,
    query: { enabled: !!address }, chainId: CHAIN_ID,
  })

  const { writeContract, data: txHash, isPending, error: writeError, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })
  const isWrongChain = !!address && chainId !== CHAIN_ID
  const explorerUrl = txHash ? buildTxExplorerUrl(CHAIN_ID, txHash) : undefined

  const handleMint = () => {
    if (isWrongChain) { switchChain({ chainId: CHAIN_ID }); return }
    if (!isAddress(recipient)) { toast.error('Enter a valid recipient address.'); return }
    const parsed = parseFloat(amount)
    if (!amount || isNaN(parsed) || parsed <= 0) { toast.error('Enter a valid amount greater than 0.'); return }
    reset()
    writeContract({ address: ARC_TOKEN_ADDRESS, abi: ARC_TOKEN_ABI, functionName: 'mint', args: [recipient, parseUnits(amount, TOKEN_DECIMALS)], chainId: CHAIN_ID })
  }

  if (!address) return <p style={hint}>Connect your wallet to mint.</p>

  if (!hasMinter) {
    return (
      <div style={noRoleBanner}>
        <strong>No Minter role.</strong> Ask an admin to grant MINTER_ROLE to your wallet first.
      </div>
    )
  }

  const busy = isPending || isConfirming

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div>
        <label style={labelStyle}>Recipient address</label>
        <input
          type="text"
          placeholder="0x…"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          style={inputStyle}
          disabled={busy}
        />
      </div>

      <div>
        <label style={labelStyle}>Amount</label>
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
        onAction={handleMint}
        onSwitch={() => switchChain({ chainId: CHAIN_ID })}
        label="Mint tokens"
        color="#1a8047"
      />

      {isSuccess && txHash && (
        <div style={successBanner}>
          Minted successfully!{' '}
          <a href={explorerUrl} target="_blank" rel="noopener noreferrer" style={explorerLink}>
            View tx <ExternalLink size={11} style={{ verticalAlign: 'middle' }} />
          </a>
        </div>
      )}
      {writeError && <div style={errorBanner}>{parseOnchainError(writeError)}</div>}
    </div>
  )
}

// ─── Shared UI primitives exported for sibling components ─────────────────

export const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 700,
  color: 'var(--subtle)', letterSpacing: '0.07em',
  textTransform: 'uppercase', marginBottom: '6px',
}

export const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px',
  border: '1px solid rgba(255,255,255,0.56)',
  borderRadius: '12px', fontSize: '15px',
  background: 'rgba(255,255,255,0.46)',
  color: 'var(--ink)', outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

export const suffixStyle: React.CSSProperties = {
  position: 'absolute', right: '14px', top: '50%',
  transform: 'translateY(-50%)',
  fontSize: '12px', fontWeight: 700, color: 'var(--subtle)',
  pointerEvents: 'none', letterSpacing: '0.04em',
}

export const hint: React.CSSProperties = {
  fontSize: '13px', color: 'var(--subtle)', margin: 0, textAlign: 'center', padding: '8px 0',
}

export const noRoleBanner: React.CSSProperties = {
  fontSize: '13px', color: '#7c4b0d',
  background: 'rgba(186,120,43,0.08)',
  border: '1px solid rgba(186,120,43,0.20)',
  borderRadius: '12px', padding: '12px 16px', lineHeight: 1.5,
}

export const successBanner: React.CSSProperties = {
  fontSize: '13px', color: '#1a8047',
  background: 'rgba(26,128,71,0.07)',
  border: '1px solid rgba(26,128,71,0.20)',
  borderRadius: '12px', padding: '12px 16px',
}

export const errorBanner: React.CSSProperties = {
  fontSize: '13px', color: '#ba2b4c',
  background: 'rgba(186,43,76,0.07)',
  border: '1px solid rgba(186,43,76,0.20)',
  borderRadius: '12px', padding: '12px 16px',
}

export const explorerLink: React.CSSProperties = {
  color: 'inherit', fontWeight: 700, textDecoration: 'underline',
}

// ─── Shared CTA button ────────────────────────────────────────────────────

interface CtaProps {
  isWrongChain: boolean
  isPending: boolean
  isConfirming: boolean
  onAction: () => void
  onSwitch: () => void
  label: string
  color?: string
}

export function Cta({ isWrongChain, isPending, isConfirming, onAction, onSwitch, label, color = 'var(--accent)' }: CtaProps) {
  const busy = isPending || isConfirming
  if (isWrongChain) {
    return (
      <button onClick={onSwitch} style={ctaStyle('#1061a6')}>
        Switch to Arc Testnet
      </button>
    )
  }
  return (
    <button
      onClick={onAction}
      disabled={busy}
      style={{ ...ctaStyle(color), opacity: busy ? 0.65 : 1, cursor: busy ? 'wait' : 'pointer' }}
    >
      {busy ? (
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} />
          {isPending ? 'Confirm in wallet…' : 'Confirming…'}
        </span>
      ) : label}
    </button>
  )
}

function ctaStyle(bg: string): React.CSSProperties {
  return {
    width: '100%', padding: '14px',
    border: 'none', borderRadius: '14px',
    background: bg, color: '#fff',
    fontSize: '14px', fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
    transition: 'transform 0.1s, opacity 0.15s',
    marginTop: '2px',
  }
}
