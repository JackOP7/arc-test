import { useState } from 'react'
import { ConnectKitButton } from 'connectkit'
import { useAccount, useSwitchChain } from 'wagmi'
import { Coins, Flame, Pause, ShieldCheck } from 'lucide-react'
import { TokenInfo } from './components/TokenInfo'
import { MintForm } from './components/MintForm'
import { BurnForm } from './components/BurnForm'
import { PauseControls } from './components/PauseControls'
import { RoleManager } from './components/RoleManager'

const ARC_TESTNET_ID = 5042002

const TABS = [
  { id: 'mint',  label: 'Mint',   Icon: Coins },
  { id: 'burn',  label: 'Burn',   Icon: Flame },
  { id: 'pause', label: 'Pause',  Icon: Pause },
  { id: 'roles', label: 'Roles',  Icon: ShieldCheck },
] as const

type TabId = typeof TABS[number]['id']

export default function App() {
  const { isConnected, chainId } = useAccount()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const isWrongChain = isConnected && chainId !== ARC_TESTNET_ID
  const [activeTab, setActiveTab] = useState<TabId>('mint')

  return (
    <div
      className="relative"
      style={{ minHeight: '100dvh', background: 'linear-gradient(180deg, #f9f9fc 0%, #fffcf7 52%, #fbf7f2 100%)', padding: '0 0 80px' }}
    >
      {/* Ambient blobs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '6%', left: '3%', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(133,177,237,0.20) 0%, transparent 70%)', filter: 'blur(70px)' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '5%', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,205,131,0.18) 0%, transparent 70%)', filter: 'blur(64px)' }} />
        <div style={{ position: 'absolute', top: '45%', right: '18%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(175,143,244,0.12) 0%, transparent 70%)', filter: 'blur(56px)' }} />
      </div>

      {/* Sticky nav */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderBottom: '1px solid rgba(18,45,69,0.08)',
        padding: '0 24px',
      }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Token logo mark */}
            <div style={{
              width: '32px', height: '32px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #122d45 0%, #1061a6 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(18,45,69,0.25)',
            }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8" stroke="white" strokeWidth="1.75" />
                <path d="M7 10h6M10 7v6" stroke="white" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </div>
            <span className="display" style={{ fontSize: '17px', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
              Arc Token
            </span>
            <span style={{
              fontSize: '10px', fontWeight: 700, color: '#1061a6',
              background: 'rgba(16,97,166,0.10)', borderRadius: '20px',
              padding: '3px 8px', letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              Testnet
            </span>
          </div>
          <ConnectKitButton />
        </div>
      </header>

      {/* Page */}
      <main style={{ position: 'relative', zIndex: 1, maxWidth: '680px', margin: '0 auto', padding: '32px 20px 0' }}>

        {/* Hero token info card */}
        <TokenInfo />

        {/* Wrong-chain banner */}
        {isWrongChain && (
          <div style={{
            marginTop: '16px',
            background: 'rgba(186,43,76,0.06)',
            border: '1px solid rgba(186,43,76,0.22)',
            borderRadius: '16px',
            padding: '14px 18px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: '12px', flexWrap: 'wrap',
          }}>
            <div>
              <p className="display" style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#ba2b4c' }}>
                Wrong network
              </p>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--muted)' }}>
                Switch to Arc Testnet to send transactions.
              </p>
            </div>
            <button
              onClick={() => switchChain({ chainId: ARC_TESTNET_ID })}
              disabled={isSwitching}
              style={{
                padding: '10px 18px', borderRadius: '10px', border: 'none',
                background: '#ba2b4c', color: '#fff', fontSize: '13px', fontWeight: 700,
                cursor: isSwitching ? 'wait' : 'pointer', opacity: isSwitching ? 0.7 : 1,
                fontFamily: 'inherit', whiteSpace: 'nowrap',
              }}
            >
              {isSwitching ? 'Switching…' : 'Switch network'}
            </button>
          </div>
        )}

        {/* Action area */}
        <div style={{ marginTop: '20px' }}>
          {!isConnected ? (
            /* Connect prompt */
            <div style={{
              background: 'rgba(255,255,255,0.64)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.68)',
              boxShadow: '0 8px 32px rgba(18,45,69,0.08), inset 0 1px 0 rgba(255,255,255,0.55)',
              borderRadius: '24px',
              padding: '48px 24px',
              textAlign: 'center',
            }}>
              {/* Spectral top strip */}
              <div style={{
                width: '48px', height: '4px', borderRadius: '2px', margin: '0 auto 20px',
                background: 'linear-gradient(90deg, #5fbeff, #af8ff4, #f05c6b, #ffcd83, #7ef1b3)',
              }} />
              <p className="display" style={{ fontSize: '22px', fontWeight: 700, color: 'var(--ink)', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
                Connect your wallet
              </p>
              <p style={{ fontSize: '14px', color: 'var(--muted)', margin: '0 0 28px', maxWidth: '320px', display: 'inline-block' }}>
                Mint, burn, pause, and manage roles on the Arc Token contract.
              </p>
              <div><ConnectKitButton /></div>
            </div>
          ) : (
            /* Tabbed panels */
            <div style={{
              background: 'rgba(255,255,255,0.64)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.68)',
              boxShadow: '0 8px 32px rgba(18,45,69,0.08), inset 0 1px 0 rgba(255,255,255,0.55)',
              borderRadius: '24px',
              overflow: 'hidden',
            }}>
              {/* Tab bar */}
              <div style={{
                display: 'flex',
                borderBottom: '1px solid rgba(18,45,69,0.08)',
                padding: '6px 6px 0',
                gap: '2px',
                background: 'rgba(255,255,255,0.40)',
              }}>
                {TABS.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    style={{
                      flex: 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      padding: '10px 8px 12px',
                      border: 'none',
                      borderRadius: '12px 12px 0 0',
                      background: activeTab === id ? 'rgba(255,255,255,0.90)' : 'transparent',
                      color: activeTab === id ? 'var(--ink)' : 'var(--subtle)',
                      fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'color 0.15s, background 0.15s',
                      borderBottom: activeTab === id ? '2px solid var(--accent)' : '2px solid transparent',
                    }}
                  >
                    <Icon size={14} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {/* Panel body */}
              <div style={{ padding: '24px 20px' }}>
                {activeTab === 'mint'  && <MintForm />}
                {activeTab === 'burn'  && <BurnForm />}
                {activeTab === 'pause' && <PauseControls />}
                {activeTab === 'roles' && <RoleManager />}
              </div>
            </div>
          )}
        </div>

        {/* Faucet hint */}
        <div style={{
          marginTop: '20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          fontSize: '12px', color: 'var(--subtle)',
          background: 'rgba(255,255,255,0.50)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(18,45,69,0.08)',
          borderRadius: '20px', padding: '8px 16px',
          width: 'fit-content', margin: '20px auto 0',
        }}>
          <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
            <path d="M10 2C6.13 2 3 5.13 3 9c0 3.87 7 11 7 11s7-7.13 7-11c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 10 6.5a2.5 2.5 0 0 1 0 5z" fill="currentColor" opacity=".5" />
          </svg>
          Need testnet USDC for gas? Use{' '}
          <strong style={{ color: 'var(--ink-2)', fontWeight: 700 }}>Get test USDC</strong>{' '}
          in the Arc Studio sidebar.
        </div>
      </main>
    </div>
  )
}
