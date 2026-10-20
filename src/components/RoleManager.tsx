import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useReadContract } from 'wagmi'
import { isAddress } from 'viem'
import { toast } from 'sonner'
import { ExternalLink } from 'lucide-react'
import { ARC_TOKEN_ABI, ARC_TOKEN_ADDRESS } from '@/abi/ArcToken'
import { DEFAULT_ADMIN_ROLE, MINTER_ROLE, PAUSER_ROLE } from './TokenInfo'
import { buildTxExplorerUrl } from '@/onchain-facts'
import { labelStyle, inputStyle, hint, noRoleBanner, successBanner, errorBanner, explorerLink, Cta } from './MintForm'

const CHAIN_ID = 5042002

const ROLES = [
  { label: 'MINTER_ROLE',        value: MINTER_ROLE },
  { label: 'PAUSER_ROLE',        value: PAUSER_ROLE },
  { label: 'DEFAULT_ADMIN_ROLE', value: DEFAULT_ADMIN_ROLE },
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

  const { data: hasAdmin } = useReadContract({ address: ARC_TOKEN_ADDRESS, abi: ARC_TOKEN_ABI, functionName: 'hasRole', args: address ? [DEFAULT_ADMIN_ROLE, address] : undefined, query: { enabled: !!address }, chainId: CHAIN_ID })
  const { data: targetHasRole } = useReadContract({ address: ARC_TOKEN_ADDRESS, abi: ARC_TOKEN_ABI, functionName: 'hasRole', args: isAddress(targetAddress) ? [selectedRole, targetAddress] : undefined, query: { enabled: isAddress(targetAddress) }, chainId: CHAIN_ID })

  const { writeContract, data: txHash, isPending, error: writeError, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })
  const isWrongChain = !!address && chainId !== CHAIN_ID
  const explorerUrl = txHash ? buildTxExplorerUrl(CHAIN_ID, txHash) : undefined

  const handleSubmit = () => {
    if (isWrongChain) { switchChain({ chainId: CHAIN_ID }); return }
    if (!isAddress(targetAddress)) { toast.error('Enter a valid target address.'); return }
    reset()
    writeContract({ address: ARC_TOKEN_ADDRESS, abi: ARC_TOKEN_ABI, functionName: action === 'grant' ? 'grantRole' : 'revokeRole', args: [selectedRole, targetAddress], chainId: CHAIN_ID })
  }

  const roleLabel = ROLES.find((r) => r.value === selectedRole)?.label ?? 'role'
  const busy = isPending || isConfirming

  if (!address) return <p style={hint}>Connect your wallet to manage roles.</p>

  if (!hasAdmin) {
    return (
      <div style={noRoleBanner}>
        <strong>No Admin role.</strong> Only wallets with DEFAULT_ADMIN_ROLE can grant or revoke roles.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Grant / Revoke toggle */}
      <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.46)', border: '1px solid rgba(255,255,255,0.56)', borderRadius: '12px', padding: '4px' }}>
        {(['grant', 'revoke'] as const).map((a) => (
          <button
            key={a}
            onClick={() => setAction(a)}
            style={{
              flex: 1, padding: '9px', borderRadius: '9px', border: 'none',
              background: action === a ? 'var(--accent)' : 'transparent',
              color: action === a ? '#fff' : 'var(--ink-2)',
              fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {a === 'grant' ? 'Grant role' : 'Revoke role'}
          </button>
        ))}
      </div>

      {/* Role picker */}
      <div>
        <label style={labelStyle}>Role</label>
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value as typeof selectedRole)}
          style={{ ...inputStyle, cursor: 'pointer' }}
          disabled={busy}
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      {/* Target address */}
      <div>
        <label style={labelStyle}>Target address</label>
        <input
          type="text"
          placeholder="0x…"
          value={targetAddress}
          onChange={(e) => setTargetAddress(e.target.value)}
          style={inputStyle}
          disabled={busy}
        />
        {isAddress(targetAddress) && targetHasRole !== undefined && (
          <p style={{ fontSize: '11px', color: 'var(--subtle)', margin: '5px 0 0' }}>
            {targetHasRole
              ? `This address already has ${roleLabel}.`
              : `This address does not have ${roleLabel}.`}
          </p>
        )}
      </div>

      <Cta
        isWrongChain={isWrongChain}
        isPending={isPending}
        isConfirming={isConfirming}
        onAction={handleSubmit}
        onSwitch={() => switchChain({ chainId: CHAIN_ID })}
        label={action === 'grant' ? `Grant ${roleLabel}` : `Revoke ${roleLabel}`}
        color="#1061a6"
      />

      {isSuccess && txHash && (
        <div style={successBanner}>
          Role {action === 'grant' ? 'granted' : 'revoked'} successfully!{' '}
          <a href={explorerUrl} target="_blank" rel="noopener noreferrer" style={explorerLink}>
            View tx <ExternalLink size={11} style={{ verticalAlign: 'middle' }} />
          </a>
        </div>
      )}
      {writeError && <div style={errorBanner}>{parseOnchainError(writeError)}</div>}
    </div>
  )
}
