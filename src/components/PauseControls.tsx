import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useReadContract } from 'wagmi'
import { ExternalLink } from 'lucide-react'
import { ARC_TOKEN_ABI, ARC_TOKEN_ADDRESS } from '@/abi/ArcToken'
import { PAUSER_ROLE } from './TokenInfo'
import { buildTxExplorerUrl } from '@/onchain-facts'
import { hint, noRoleBanner, successBanner, errorBanner, explorerLink, Cta } from './MintForm'

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

  const { data: isPaused, refetch: refetchPaused } = useReadContract({ address: ARC_TOKEN_ADDRESS, abi: ARC_TOKEN_ABI, functionName: 'paused', chainId: CHAIN_ID })
  const { data: hasPauser } = useReadContract({ address: ARC_TOKEN_ADDRESS, abi: ARC_TOKEN_ABI, functionName: 'hasRole', args: address ? [PAUSER_ROLE, address] : undefined, query: { enabled: !!address }, chainId: CHAIN_ID })

  const { writeContract, data: txHash, isPending, error: writeError, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })
  if (isSuccess) void refetchPaused()

  const isWrongChain = !!address && chainId !== CHAIN_ID
  const explorerUrl = txHash ? buildTxExplorerUrl(CHAIN_ID, txHash) : undefined

  const handleToggle = () => {
    if (isWrongChain) { switchChain({ chainId: CHAIN_ID }); return }
    reset()
    writeContract({ address: ARC_TOKEN_ADDRESS, abi: ARC_TOKEN_ABI, functionName: isPaused ? 'unpause' : 'pause', chainId: CHAIN_ID })
  }

  if (!address) return <p style={hint}>Connect your wallet to toggle pause.</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Status pill */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(255,255,255,0.46)', border: '1px solid rgba(255,255,255,0.56)',
        borderRadius: '12px', padding: '12px 16px',
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

      {!hasPauser ? (
        <div style={noRoleBanner}>
          <strong>No Pauser role.</strong> Ask an admin to grant PAUSER_ROLE to your wallet first.
        </div>
      ) : (
        <Cta
          isWrongChain={isWrongChain}
          isPending={isPending}
          isConfirming={isConfirming}
          onAction={handleToggle}
          onSwitch={() => switchChain({ chainId: CHAIN_ID })}
          label={isPaused ? 'Unpause contract' : 'Pause contract'}
          color={isPaused ? '#1a8047' : '#ba2b4c'}
        />
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
    </div>
  )
}
