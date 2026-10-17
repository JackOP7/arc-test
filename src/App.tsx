import { ConnectKitButton } from 'connectkit'
import { useAccount, useSwitchChain } from 'wagmi'
import { TokenInfo } from './components/TokenInfo'
import { MintForm } from './components/MintForm'
import { BurnForm } from './components/BurnForm'
import { PauseControls } from './components/PauseControls'
import { RoleManager } from './components/RoleManager'

const ARC_TESTNET_ID = 5042002

export default function App() {
  const { isConnected, chainId } = useAccount()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const isWrongChain = isConnected && chainId !== ARC_TESTNET_ID

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-gradient)', padding: '0 0 80px' }}>
      {/* Top nav */}
      <header
        style={{
          background: 'var(--surface)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0, zIndex: 100,
          padding: '0 24px',
        }}
      >
        <div style={{
          maxWidth: '960px', margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: '60px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '8px',
              background: 'var(--accent)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="9" stroke="white" strokeWidth="2" />
                <path d="M6 10h8M10 6v8" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <span className="display" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ink)' }}>
              Arc Token
            </span>
            <span style={{
              fontSize: '11px', fontWeight: 600, color: '#1061a6',
              background: 'rgba(16,97,166,0.08)', borderRadius: '20px',
              padding: '2px 8px', letterSpacing: '0.04em',
            }}>
              Testnet
            </span>
          </div>
          <ConnectKitButton />
        </div>
      </header>

      {/* Main content */}
      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '32px 24px 0' }}>
        {/* Token info hero */}
        <TokenInfo />

        {/* Wrong-chain banner */}
        {isWrongChain && (
          <div style={{
            marginTop: '20px',
            background: 'rgba(186,43,76,0.07)',
            border: '1px solid rgba(186,43,76,0.25)',
            borderRadius: '16px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}>
            <div>
              <p className="display" style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#ba2b4c' }}>
                Wrong network
              </p>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--muted)' }}>
                Switch to Arc Testnet to use this app.
              </p>
            </div>
            <button
              onClick={() => switchChain({ chainId: ARC_TESTNET_ID })}
              disabled={isSwitching}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                border: 'none',
                background: '#ba2b4c',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 700,
                cursor: isSwitching ? 'wait' : 'pointer',
                opacity: isSwitching ? 0.7 : 1,
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
              }}
            >
              {isSwitching ? 'Switching…' : 'Switch to Arc Testnet'}
            </button>
          </div>
        )}

        {/* Action panels */}
        {!isConnected ? (
          <div style={{
            marginTop: '28px', textAlign: 'center',
            background: 'var(--surface)', backdropFilter: 'blur(16px)',
            border: '1px solid var(--border)', borderRadius: '20px',
            padding: '48px 24px',
          }}>
            <p className="display" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ink)', margin: '0 0 8px' }}>
              Connect your wallet
            </p>
            <p style={{ fontSize: '14px', color: 'var(--muted)', margin: '0 0 24px' }}>
              Connect to mint, burn, and manage roles on the Arc Token contract.
            </p>
            <ConnectKitButton />
          </div>
        ) : (
          <div style={{ marginTop: '20px', display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            <MintForm />
            <BurnForm />
            <PauseControls />
            <RoleManager />
          </div>
        )}

        {/* Faucet hint */}
        <div style={{
          marginTop: '28px', textAlign: 'center',
          fontSize: '12px', color: 'var(--subtle)',
        }}>
          Need testnet USDC for gas? Use the{' '}
          <strong style={{ color: 'var(--ink-2)' }}>Get test USDC</strong> button in the Arc Studio sidebar.
        </div>
      </main>
    </div>
  )
}
