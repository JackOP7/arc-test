import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useReadContract } from 'wagmi'
import { isAddress } from 'viem'
import { toast } from 'sonner'
import { ShieldCheck, ExternalLink } from 'lucide-react'
import { ARC_TOKEN_ABI, ARC_TOKEN_ADDRESS } from '@/abi/ArcToken'
import { DEFAULT_ADMIN_ROLE, MINTER_ROLE, PAUSER_ROLE } from './TokenInfo'
import { buildTxExplorerUrl } from '@/onchain-facts'
import {
  cardStyle, cardTitle, cardSubtitle, labelStyle, inputStyle,
  hintText, noRoleBanner, successBanner, errorBanner, explorerLink,
  primaryBtn, iconBadge,
} from './MintForm'

const CHAIN_ID = 5042002

const ROLES = [
  { label: 'DEFAULT_ADMIN_ROLE', value: DEFAULT_ADMIN_ROLE },
  { label: 'MINTER_ROLE', value: MINTER_ROLE },
  { label: 'PAUSER_ROLE', value: PAUSER_ROLE },
] as const

function parseOnchainError(error: unknown): string {
  const msg = (error as { message?: string })?.message?.toLowerCase() ?? ''
  if (msg.includes('user rejected') || msg.includes('user denied')) return 'Transaction cancelled.'
  if (msg.includes('accesscontrolunauthorized')) return 'Your wallet does not have the Admin role.'
  if (msg.includes('accesscontrolbadconfirmation')) return 'Invalid confirmation address.'
  return 'Transaction failed. Check the console for details.'
}

export function RoleManager() {
  const { address, chainId } = useAccount()
  const { switchChain } = useSwitchChain()
  const [targetAddress, setTargetAddress] = useState('')
  const [selectedRole, setSelectedRole] = useState<typeof ROLES[number]['value']>(MINTER_ROLE)
  const [action, setAction] = useState<'grant' | 'revoke'>('grant')

  const { data: hasAdmin } = useReadContract({
    address: ARC_TOKEN_ADDRESS,
    abi: ARC_TOKEN_ABI,
    functionName: 'hasRole',
    args: address ? [DEFAULT_ADMIN_ROLE, address] : undefined,
    query: { enabled: !!address },
    chainId: CHAIN_ID,
  })

  const { data: targetHasRole } = useReadContract({
    address: ARC_TOKEN_ADDRESS,
    abi: ARC_TOKEN_ABI,
    functionName: 'hasRole',
    args: isAddress(targetAddress) ? [selectedRole, targetAddress] : undefined,
    query: { enabled: isAddress(targetAddress) },
    chainId: CHAIN_ID,
  })

  const {
    writeContract, data: txHash, isPending, error: writeError, reset,
  } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  const isWrongChain = !!address && chainId !== CHAIN_ID

  const handleSubmit = () => {
    if (isWrongChain) { switchChain({ chainId: CHAIN_ID }); return }
    if (!isAddress(targetAddress)) { toast.error('Enter a valid target address.'); return }
    reset()
    writeContract({
      address: ARC_TOKEN_ADDRESS,
      abi: ARC_TOKEN_ABI,
      functionName: action === 'grant' ? 'grantRole' : 'revokeRole',
      args: [selectedRole, targetAddress],
      chainId: CHAIN_ID,
    })
  }

  const explorerUrl = txHash ? buildTxExplorerUrl(CHAIN_ID, txHash) : undefined
  const disabled = !address || isPending || isConfirming || !hasAdmin
  const roleLabel = ROLES.find((r) => r.value === selectedRole)?.label ?? 'role'

  return (
    <section style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
        <div style={iconBadge('#1061a6', 'rgba(16,97,166,0.1)')}>
          <ShieldCheck size={16} color="#1061a6" />
        </div>
        <div>
          <h3 className="display" style={cardTitle}>Role Manager</h3>
          <p style={cardSubtitle}>Requires Admin role</p>
        </div>
      </div>

      {!address ? (
        <p style={hintText}>Connect your wallet to manage roles.</p>
      ) : !hasAdmin ? (
        <div style={noRoleBanner}>
          Your wallet does not have the Admin role and cannot grant or revoke roles.
        </div>
      ) : (
        <>
          {/* Action toggle */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            {(['grant', 'revoke'] as const).map((a) => (
              <button
                key={a}
                onClick={() => setAction(a)}
                style={{
                  flex: 1, padding: '8px', borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: action === a ? 'var(--accent)' : 'var(--surface-muted)',
                  color: action === a ? '#fff' : 'var(--ink-2)',
                  fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {a === 'grant' ? 'Grant' : 'Revoke'}
              </button>
            ))}
          </div>

          <label style={labelStyle}>Role</label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as typeof selectedRole)}
            style={{ ...inputStyle, marginBottom: '12px', cursor: 'pointer' }}
            disabled={isPending || isConfirming}
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>

          <label style={labelStyle}>Target address</label>
          <input
            type="text"
            placeholder="0x..."
            value={targetAddress}
            onChange={(e) => setTargetAddress(e.target.value)}
            style={inputStyle}
            disabled={isPending || isConfirming}
          />

          {/* Target role status */}
          {isAddress(targetAddress) && targetHasRole !== undefined && (
            <div style={{ fontSize: '12px', color: 'var(--subtle)', marginTop: '6px' }}>
              {targetHasRole
                ? `This address already has ${roleLabel}.`
                : `This address does not have ${roleLabel}.`}
            </div>
          )}

          {isWrongChain ? (
            <button onClick={() => switchChain({ chainId: CHAIN_ID })} style={primaryBtn('#1061a6')}>
              Switch to Arc Testnet
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={disabled} style={primaryBtn('#1061a6', disabled)}>
              {isPending ? 'Confirm in wallet…'
                : isConfirming ? 'Confirming…'
                : action === 'grant' ? `Grant ${roleLabel}` : `Revoke ${roleLabel}`}
            </button>
          )}

          {isSuccess && txHash && (
            <div style={successBanner}>
              {action === 'grant' ? 'Role granted!' : 'Role revoked!'}{' '}
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
