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

const spectral = 'linear-gradient(90deg, #5fbeff, #af8ff4, #f05c6b, #ffcd83, #7ef1b3)'

const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.64)',
  backdropFilter: 'blur(24px) saturate(180%)',
  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.68)',
  boxShadow: '0 8px 32px rgba(18,45,69,0.08), inset 0 1px 0 rgba(255,255,255,0.55)',
  borderRadius: '24px',
  overflow: 'hidden',
}

export function TokenInfo() {
  const { address } = useAccount()

  const { data: tokenName } = useReadContract({ address: ARC_TOKEN_ADDRESS, abi: ARC_TOKEN_ABI, functionName: 'name', chainId: CHAIN_ID })
  const { data: tokenSymbol } = useReadContract({ address: ARC_TOKEN_ADDRESS, abi: ARC_TOKEN_ABI, functionName: 'symbol', chainId: CHAIN_ID })
  const { data: tokenDecimals } = useReadContract({ address: ARC_TOKEN_ADDRESS, abi: ARC_TOKEN_ABI, functionName: 'decimals', chainId: CHAIN_ID })
  const { data: totalSupply } = useReadContract({ address: ARC_TOKEN_ADDRESS, abi: ARC_TOKEN_ABI, functionName: 'totalSupply', chainId: CHAIN_ID })
  const { data: userBalance } = useReadContract({ address: ARC_TOKEN_ADDRESS, abi: ARC_TOKEN_ABI, functionName: 'balanceOf', args: address ? [address] : undefined, query: { enabled: !!address }, chainId: CHAIN_ID })
  const { data: isPaused } = useReadContract({ address: ARC_TOKEN_ADDRESS, abi: ARC_TOKEN_ABI, functionName: 'paused', chainId: CHAIN_ID })
  const { data: hasAdmin } = useReadContract({ address: ARC_TOKEN_ADDRESS, abi: ARC_TOKEN_ABI, functionName: 'hasRole', args: address ? [DEFAULT_ADMIN_ROLE, address] : undefined, query: { enabled: !!address }, chainId: CHAIN_ID })
  const { data: hasMinter } = useReadContract({ address: ARC_TOKEN_ADDRESS, abi: ARC_TOKEN_ABI, functionName: 'hasRole', args: address ? [MINTER_ROLE, address] : undefined, query: { enabled: !!address }, chainId: CHAIN_ID })
  const { data: hasPauser } = useReadContract({ address: ARC_TOKEN_ADDRESS, abi: ARC_TOKEN_ABI, functionName: 'hasRole', args: address ? [PAUSER_ROLE, address] : undefined, query: { enabled: !!address }, chainId: CHAIN_ID })

  const decimals = tokenDecimals ?? 18
  const formattedSupply = totalSupply != null
    ? Number(formatUnits(totalSupply, decimals)).toLocaleString('en-US', { maximumFractionDigits: 4 })
    : null
  const formattedBalance = userBalance != null
    ? Number(formatUnits(userBalance, decimals)).toLocaleString('en-US', { maximumFractionDigits: 4 })
    : null

  const explorerUrl = `${chain.explorerBase}/address/${ARC_TOKEN_ADDRESS}`
  const shortAddress = `${ARC_TOKEN_ADDRESS.slice(0, 8)}…${ARC_TOKEN_ADDRESS.slice(-6)}`

  return (
    <div style={glassCard}>
      {/* Spectral top strip */}
      <div style={{ height: '3px', background: spectral }} />

      <div style={{ padding: '24px 24px 20px' }}>
        {/* Top row: name + badges */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '20px' }}>
          <div>
            <h2 className="display" style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.025em' }}>
              {tokenName ?? <Skeleton width={160} />}
            </h2>
            <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500 }}>
              {tokenSymbol ?? '—'} &middot; {decimals} decimals &middot; Arc Testnet
            </span>
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
            {isPaused && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                fontSize: '11px', fontWeight: 700, color: '#ba2b4c',
                background: 'rgba(186,43,76,0.09)', borderRadius: '20px',
                padding: '4px 10px', letterSpacing: '0.05em', textTransform: 'uppercase',
              }}>
                <Pause size={11} /> Paused
              </span>
            )}
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                fontSize: '11px', fontWeight: 600, color: 'var(--accent)',
                background: 'rgba(255,255,255,0.46)', borderRadius: '20px',
                padding: '4px 12px', textDecoration: 'none',
                border: '1px solid rgba(255,255,255,0.56)',
              }}
            >
              <ExternalLink size={11} /> Explorer
            </a>
          </div>
        </div>

        {/* Balance grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
          <StatCard
            label="Total Supply"
            value={formattedSupply}
            suffix={tokenSymbol ?? ''}
          />
          <StatCard
            label="Your Balance"
            value={address ? formattedBalance : null}
            suffix={tokenSymbol ?? ''}
            highlight
            emptyHint={!address ? 'Connect wallet' : undefined}
          />
        </div>

        {/* Contract address */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.46)',
          border: '1px solid rgba(255,255,255,0.56)',
          borderRadius: '12px', padding: '10px 14px',
          marginBottom: (address && (hasAdmin || hasMinter || hasPauser)) ? '14px' : 0,
        }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--subtle)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Contract
          </span>
          <span className="mono" style={{ fontSize: '12px', color: 'var(--ink-2)' }}>
            {shortAddress}
          </span>
        </div>

        {/* Role pills */}
        {address && (hasAdmin || hasMinter || hasPauser) && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {hasAdmin  && <RolePill label="Admin" />}
            {hasMinter && <RolePill label="Minter" />}
            {hasPauser && <RolePill label="Pauser" />}
          </div>
        )}
        {address && hasAdmin === false && hasMinter === false && hasPauser === false && (
          <p style={{ fontSize: '12px', color: 'var(--subtle)', margin: 0 }}>
            No roles assigned to your wallet.
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────

function Skeleton({ width }: { width: number }) {
  return (
    <span style={{
      display: 'inline-block', width, height: '22px',
      background: 'linear-gradient(90deg, rgba(18,45,69,0.07) 25%, rgba(18,45,69,0.12) 50%, rgba(18,45,69,0.07) 75%)',
      backgroundSize: '200% 100%',
      borderRadius: '6px', verticalAlign: 'middle',
      animation: 'shimmer 1.4s infinite',
    }} />
  )
}

function StatCard({ label, value, suffix, highlight, emptyHint }: {
  label: string
  value: string | null
  suffix: string
  highlight?: boolean
  emptyHint?: string
}) {
  return (
    <div style={{
      background: highlight ? 'rgba(18,45,69,0.04)' : 'rgba(255,255,255,0.46)',
      border: highlight ? '1px solid rgba(18,45,69,0.12)' : '1px solid rgba(255,255,255,0.56)',
      borderRadius: '14px', padding: '14px 16px',
    }}>
      <div style={{ fontSize: '10px', color: 'var(--subtle)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
        {label}
      </div>
      {value != null ? (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span className="display" style={{ fontSize: '22px', fontWeight: 700, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
            {value}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 500 }}>{suffix}</span>
        </div>
      ) : emptyHint ? (
        <span style={{ fontSize: '13px', color: 'var(--subtle)', fontStyle: 'italic' }}>{emptyHint}</span>
      ) : (
        <Skeleton width={80} />
      )}
    </div>
  )
}

function RolePill({ label }: { label: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      fontSize: '11px', fontWeight: 700, color: '#1a8047',
      background: 'rgba(26,128,71,0.09)', borderRadius: '20px',
      padding: '4px 10px', letterSpacing: '0.04em',
    }}>
      <ShieldCheck size={11} /> {label}
    </span>
  )
}
