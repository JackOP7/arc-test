import { useAccount, useReadContract } from 'wagmi'
import { formatUnits } from 'viem'
import { ARC_TOKEN_ABI, ARC_TOKEN_ADDRESS } from '@/abi/ArcToken'
import { requireChain } from '@/onchain-facts'
import { ExternalLink, ShieldCheck, Pause } from 'lucide-react'

const CHAIN_ID = 5042002
const chain = requireChain(CHAIN_ID)

// Role hash constants (keccak256 of the role string)
export const MINTER_ROLE = '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6' as `0x${string}`
export const PAUSER_ROLE = '0x65d7a28e3265b37a6474929f336521b332c1681b933f6cb9f3376673440d862a' as `0x${string}`
export const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`

export function TokenInfo() {
  const { address } = useAccount()

  const { data: tokenName } = useReadContract({
    address: ARC_TOKEN_ADDRESS,
    abi: ARC_TOKEN_ABI,
    functionName: 'name',
    chainId: CHAIN_ID,
  })

  const { data: tokenSymbol } = useReadContract({
    address: ARC_TOKEN_ADDRESS,
    abi: ARC_TOKEN_ABI,
    functionName: 'symbol',
    chainId: CHAIN_ID,
  })

  const { data: tokenDecimals } = useReadContract({
    address: ARC_TOKEN_ADDRESS,
    abi: ARC_TOKEN_ABI,
    functionName: 'decimals',
    chainId: CHAIN_ID,
  })

  const { data: totalSupply } = useReadContract({
    address: ARC_TOKEN_ADDRESS,
    abi: ARC_TOKEN_ABI,
    functionName: 'totalSupply',
    chainId: CHAIN_ID,
  })

  const { data: userBalance } = useReadContract({
    address: ARC_TOKEN_ADDRESS,
    abi: ARC_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
    chainId: CHAIN_ID,
  })

  const { data: isPaused } = useReadContract({
    address: ARC_TOKEN_ADDRESS,
    abi: ARC_TOKEN_ABI,
    functionName: 'paused',
    chainId: CHAIN_ID,
  })

  const { data: hasAdmin } = useReadContract({
    address: ARC_TOKEN_ADDRESS,
    abi: ARC_TOKEN_ABI,
    functionName: 'hasRole',
    args: address ? [DEFAULT_ADMIN_ROLE, address] : undefined,
    query: { enabled: !!address },
    chainId: CHAIN_ID,
  })

  const { data: hasMinter } = useReadContract({
    address: ARC_TOKEN_ADDRESS,
    abi: ARC_TOKEN_ABI,
    functionName: 'hasRole',
    args: address ? [MINTER_ROLE, address] : undefined,
    query: { enabled: !!address },
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

  const decimals = tokenDecimals ?? 18
  const formattedSupply = totalSupply != null
    ? Number(formatUnits(totalSupply, decimals)).toLocaleString('en-US', { maximumFractionDigits: 4 })
    : '—'
  const formattedBalance = userBalance != null
    ? Number(formatUnits(userBalance, decimals)).toLocaleString('en-US', { maximumFractionDigits: 4 })
    : '—'

  const explorerUrl = `${chain.explorerBase}/address/${ARC_TOKEN_ADDRESS}`

  return (
    <div
      style={{
        background: 'var(--surface)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        padding: '28px 24px',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 className="display" style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--ink)' }}>
            {tokenName ?? 'Arc Demo Token'}
          </h2>
          <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500 }}>
            {tokenSymbol ?? '—'} &middot; {decimals} decimals
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {isPaused && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              fontSize: '12px', fontWeight: 600, color: '#ba2b4c',
              background: 'rgba(186,43,76,0.08)', borderRadius: '20px',
              padding: '4px 10px', letterSpacing: '0.04em',
            }}>
              <Pause size={12} /> PAUSED
            </span>
          )}
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              fontSize: '12px', fontWeight: 600, color: 'var(--accent)',
              background: 'var(--surface-muted)', borderRadius: '20px',
              padding: '4px 12px', textDecoration: 'none',
              border: '1px solid var(--border)',
            }}
          >
            <ExternalLink size={12} /> Explorer
          </a>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        <StatCard label="Total Supply" value={formattedSupply} suffix={tokenSymbol ?? ''} />
        <StatCard label="Your Balance" value={formattedBalance} suffix={tokenSymbol ?? ''} highlight />
      </div>

      {/* Contract address */}
      <div style={{
        background: 'var(--surface-muted)', borderRadius: '10px',
        padding: '10px 14px', marginBottom: address ? '16px' : 0,
      }}>
        <div style={{ fontSize: '11px', color: 'var(--subtle)', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '3px' }}>
          Contract
        </div>
        <span className="mono" style={{ fontSize: '12px', color: 'var(--ink-2)', wordBreak: 'break-all' }}>
          {ARC_TOKEN_ADDRESS}
        </span>
      </div>

      {/* Roles */}
      {address && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {hasAdmin && <RolePill label="Admin" />}
          {hasMinter && <RolePill label="Minter" />}
          {hasPauser && <RolePill label="Pauser" />}
          {!hasAdmin && !hasMinter && !hasPauser && (
            <span style={{ fontSize: '12px', color: 'var(--subtle)' }}>No roles assigned to your wallet</span>
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, suffix, highlight }: {
  label: string; value: string; suffix: string; highlight?: boolean
}) {
  return (
    <div style={{
      background: highlight ? 'rgba(18,45,69,0.05)' : 'var(--surface-muted)',
      borderRadius: '12px', padding: '14px 16px',
      border: highlight ? '1px solid rgba(18,45,69,0.15)' : '1px solid transparent',
    }}>
      <div style={{ fontSize: '11px', color: 'var(--subtle)', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '6px' }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
        <span className="display" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </span>
        <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500 }}>{suffix}</span>
      </div>
    </div>
  )
}

function RolePill({ label }: { label: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      fontSize: '12px', fontWeight: 600, color: '#1a8047',
      background: 'rgba(26,128,71,0.08)', borderRadius: '20px',
      padding: '4px 10px', letterSpacing: '0.04em',
    }}>
      <ShieldCheck size={12} /> {label}
    </span>
  )
}
