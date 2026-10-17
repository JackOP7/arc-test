import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useReadContract } from 'wagmi'
import { ExternalLink, Play, Pause } from 'lucide-react'
import { ARC_TOKEN_ABI, ARC_TOKEN_ADDRESS } from '@/abi/ArcToken'
import { PAUSER_ROLE } from './TokenInfo'
import { buildTxExplorerUrl } from '@/onchain-facts'
import {
  cardStyle, cardTitle, cardSubtitle, hintText,
  noRoleBanner, successBanner, errorBanner, explorerLink,
  primaryBtn, iconBadge,
} from './MintForm'

const CHAIN_ID = 5042002

function parseOnchainError(error: unknown): string {
  const msg = (error as { message?: string })?.message?.toLowerCase() ?? ''
  if (msg.includes('user rejected') || msg.includes('user denied')) return 'Transaction cancelled.'
  if (msg.includes('accesscontrolunauthorized')) return 'Your wallet does not have the Pauser role.'
  if (msg.includes('enforcedpause')) return 'Contract is already paused.'
  if (msg.includes('expectedpause')) return 'Contract is not paused.'
  return 'Transaction failed. Check the console for details.'
}

export function PauseControls() {
  const { address, chainId } = useAccount()
  const { switchChain } = useSwitchChain()

  const { data: isPaused, refetch: refetchPaused } = useReadContract({
    address: ARC_TOKEN_ADDRESS,
    abi: ARC_TOKEN_ABI,
    functionName: 'paused',
    chainId: CHAIN_ID,
  })

  const { data: hasPauser } = useReadContract({
    address: ARC_TOKEN_ADDRESS,
    abi: ARC_TOKEN_ABI,
    functionName: 'hasRole',
    args: address ? [PAUSER_ROLE, address] : undefined,
    query: { enabled: !!address },
    chainId: CHAIN_ID,
  })

  const {
    writeContract, data: txHash, isPending, error: writeError, reset,
  } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  // Refetch paused state after confirmation
  if (isSuccess) void refetchPaused()

  const isWrongChain = !!address && chainId !== CHAIN_ID

  const handleToggle = () => {
    if (isWrongChain) { switchChain({ chainId: CHAIN_ID }); return }
    reset()
    writeContract({
      address: ARC_TOKEN_ADDRESS,
      abi: ARC_TOKEN_ABI,
      functionName: isPaused ? 'unpause' : 'pause',
      chainId: CHAIN_ID,
    })
  }

  const explorerUrl = txHash ? buildTxExplorerUrl(CHAIN_ID, txHash) : undefined
  const disabled = !address || isPending || isConfirming || !hasPauser

  const accentColor = isPaused ? '#1a8047' : '#ba2b4c'
  const accentBg = isPaused ? 'rgba(26,128,71,0.1)' : 'rgba(186,43,76,0.08)'
  const Icon = isPaused ? Play : Pause

  return (
    <section style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
        <div style={iconBadge(accentColor, accentBg)}>
          <Icon size={16} color={accentColor} />
        </div>
        <div>
          <h3 className="display" style={cardTitle}>
            {isPaused === undefined ? 'Pause Controls' : isPaused ? 'Unpause Contract' : 'Pause Contract'}
          </h3>
          <p style={cardSubtitle}>Requires Pauser role</p>
        </div>
      </div>

      {/* Current status */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--surface-muted)', borderRadius: '10px',
        padding: '12px 14px', marginBottom: '16px',
      }}>
        <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500 }}>Current status</span>
        {isPaused === undefined ? (
          <span style={{ fontSize: '13px', color: 'var(--subtle)' }}>Loading…</span>
        ) : isPaused ? (
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#ba2b4c' }}>Paused</span>
        ) : (
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#1a8047' }}>Active</span>
        )}
      </div>

      {!address ? (
        <p style={hintText}>Connect your wallet to toggle pause.</p>
      ) : !hasPauser ? (
        <div style={noRoleBanner}>
          Your wallet does not have the Pauser role. Ask an admin to grant it.
        </div>
      ) : (
        <>
          {isWrongChain ? (
            <button onClick={() => switchChain({ chainId: CHAIN_ID })} style={primaryBtn('#1061a6')}>
              Switch to Arc Testnet
            </button>
          ) : (
            <button onClick={handleToggle} disabled={disabled} style={primaryBtn(accentColor, disabled)}>
              {isPending ? 'Confirm in wallet…' : isConfirming ? 'Confirming…' : isPaused ? 'Unpause' : 'Pause'}
            </button>
          )}

          {isSuccess && txHash && (
            <div style={successBanner}>
              {isPaused ? 'Unpaused' : 'Paused'} successfully!{' '}
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
