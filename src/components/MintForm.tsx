import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useReadContract } from 'wagmi'
import { parseUnits, isAddress } from 'viem'
import { toast } from 'sonner'
import { Coins, ExternalLink } from 'lucide-react'
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
    address: ARC_TOKEN_ADDRESS,
    abi: ARC_TOKEN_ABI,
    functionName: 'hasRole',
    args: address ? [MINTER_ROLE, address] : undefined,
    query: { enabled: !!address },
    chainId: CHAIN_ID,
  })

  const {
    writeContract,
    data: txHash,
    isPending,
    error: writeError,
    reset,
  } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  const isWrongChain = !!address && chainId !== CHAIN_ID

  const handleMint = () => {
    if (isWrongChain) { switchChain({ chainId: CHAIN_ID }); return }
    if (!isAddress(recipient)) { toast.error('Enter a valid recipient address.'); return }
    const parsed = parseFloat(amount)
    if (!amount || isNaN(parsed) || parsed <= 0) { toast.error('Enter a valid amount greater than 0.'); return }
    reset()
    writeContract({
      address: ARC_TOKEN_ADDRESS,
      abi: ARC_TOKEN_ABI,
      functionName: 'mint',
      args: [recipient, parseUnits(amount, TOKEN_DECIMALS)],
      chainId: CHAIN_ID,
    })
  }

  const explorerUrl = txHash ? buildTxExplorerUrl(CHAIN_ID, txHash) : undefined

  const disabled = !address || isPending || isConfirming || !hasMinter

  return (
    <section style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
        <div style={iconBadge('#1a8047', 'rgba(26,128,71,0.1)')}>
          <Coins size={16} color="#1a8047" />
        </div>
        <div>
          <h3 className="display" style={cardTitle}>Mint Tokens</h3>
          <p style={cardSubtitle}>Requires Minter role</p>
        </div>
      </div>

      {!address ? (
        <p style={hintText}>Connect your wallet to mint.</p>
      ) : !hasMinter ? (
        <div style={noRoleBanner}>
          Your wallet does not have the Minter role. Ask an admin to grant it.
        </div>
      ) : (
        <>
          <label style={labelStyle}>Recipient address</label>
          <input
            type="text"
            placeholder="0x..."
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            style={inputStyle}
            disabled={disabled && !hasMinter}
          />

          <label style={{ ...labelStyle, marginTop: '12px' }}>Amount</label>
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

          {isWrongChain ? (
            <button onClick={() => switchChain({ chainId: CHAIN_ID })} style={primaryBtn('#1061a6')}>
              Switch to Arc Testnet
            </button>
          ) : (
            <button onClick={handleMint} disabled={disabled} style={primaryBtn('#122d45', disabled)}>
              {isPending ? 'Confirm in wallet…' : isConfirming ? 'Confirming…' : 'Mint'}
            </button>
          )}

          {isSuccess && txHash && (
            <div style={successBanner}>
              Minted successfully!{' '}
              <a href={explorerUrl} target="_blank" rel="noopener noreferrer" style={explorerLink}>
                View tx <ExternalLink size={11} style={{ verticalAlign: 'middle' }} />
              </a>
            </div>
          )}
          {writeError && (
            <div style={errorBanner}>{parseOnchainError(writeError)}</div>
          )}
        </>
      )}
    </section>
  )
}

// ─── Shared styles ─────────────────────────────────────────────────────────

export const cardStyle: React.CSSProperties = {
  background: 'var(--surface)',
  backdropFilter: 'blur(16px)',
  border: '1px solid var(--border)',
  borderRadius: '16px',
  padding: '22px 20px',
}

export const cardTitle: React.CSSProperties = {
  margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--ink)',
}

export const cardSubtitle: React.CSSProperties = {
  margin: 0, fontSize: '12px', color: 'var(--subtle)',
}

export const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '12px', fontWeight: 600,
  color: 'var(--muted)', letterSpacing: '0.05em',
  textTransform: 'uppercase', marginBottom: '6px',
}

export const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px',
  border: '1px solid var(--border)',
  borderRadius: '10px', fontSize: '14px',
  background: 'var(--surface-muted)',
  color: 'var(--ink)', outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

export const inputSuffix: React.CSSProperties = {
  position: 'absolute', right: '12px', top: '50%',
  transform: 'translateY(-50%)',
  fontSize: '12px', fontWeight: 600, color: 'var(--subtle)',
  pointerEvents: 'none',
}

export const hintText: React.CSSProperties = {
  fontSize: '13px', color: 'var(--subtle)', margin: 0,
}

export const noRoleBanner: React.CSSProperties = {
  fontSize: '13px', color: '#7c4b0d',
  background: 'rgba(186,120,43,0.08)',
  border: '1px solid rgba(186,120,43,0.2)',
  borderRadius: '10px', padding: '10px 14px',
}

export const successBanner: React.CSSProperties = {
  fontSize: '13px', color: '#1a8047',
  background: 'rgba(26,128,71,0.07)',
  border: '1px solid rgba(26,128,71,0.2)',
  borderRadius: '10px', padding: '10px 14px',
  marginTop: '10px',
}

export const errorBanner: React.CSSProperties = {
  fontSize: '13px', color: '#ba2b4c',
  background: 'rgba(186,43,76,0.07)',
  border: '1px solid rgba(186,43,76,0.2)',
  borderRadius: '10px', padding: '10px 14px',
  marginTop: '10px',
}

export const explorerLink: React.CSSProperties = {
  color: 'inherit', fontWeight: 600, textDecoration: 'underline',
}

export function primaryBtn(bg: string, disabled?: boolean): React.CSSProperties {
  return {
    width: '100%', marginTop: '14px',
    padding: '11px 0', borderRadius: '10px',
    border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
    background: disabled ? 'var(--surface-muted)' : bg,
    color: disabled ? 'var(--subtle)' : '#fff',
    fontSize: '14px', fontWeight: 600,
    fontFamily: 'inherit', transition: 'opacity 0.15s',
    opacity: disabled ? 0.7 : 1,
  }
}

export function iconBadge(color: string, bg: string): React.CSSProperties {
  return {
    width: '36px', height: '36px',
    borderRadius: '10px', background: bg,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  }
}
