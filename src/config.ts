/**
 * wagmi configuration
 * Built with Arc Studio — https://studio.arc.io
 */

import { http, createConfig } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { arcTestnet } from 'viem/chains'
import { injected, coinbaseWallet } from 'wagmi/connectors'
import { registerChain } from './tracing'

// Pre-register chain RPC URLs so trace events show correct chain names immediately
registerChain(arcTestnet.id, arcTestnet.rpcUrls.default.http[0])

export const config = createConfig({
  chains: [arcTestnet, mainnet], // mainnet included for ENS resolution only
  connectors: [
    injected(),                                   // MetaMask, OKX, Rabby, Frame, etc.
    coinbaseWallet({ appName: 'Arc Token' }),      // Coinbase Wallet
  ],
  transports: {
    // Disable multicall batching (batch: false) so ConnectKit's internal balance
    // reads never fire against chain ID 0 when the wallet is on an unrecognised network.
    [arcTestnet.id]: http(arcTestnet.rpcUrls.default.http[0], { batch: false }),
    [mainnet.id]: http(undefined, { batch: false }),
  },
})
