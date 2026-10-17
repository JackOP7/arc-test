# Implementation Plan: Arc ERC-20 Token with Role-Based Access

## Summary
A mintable, burnable ERC-20 token deployed on Arc Testnet with three distinct roles (DEFAULT_ADMIN, MINTER, PAUSER) enforced via OpenZeppelin's AccessControl. A simple React UI lets you connect your wallet, check balances, and call admin functions like mint, burn, and pause.

## Architecture
- **Blockchain:** Arc Testnet — USDC as gas, sub-second finality, EVM-compatible
- **Contract:** `ArcToken.sol` — ERC-20 + AccessControl + Pausable + Burnable
  - Roles: `DEFAULT_ADMIN_ROLE`, `MINTER_ROLE`, `PAUSER_ROLE`
  - Functions: `mint(to, amount)`, `burn(amount)`, `pause()`, `unpause()`, `grantRole()`, `revokeRole()`
  - All transfers blocked when paused
- **Frontend:** React + wagmi + ConnectKit — wallet connection, balance display, role-gated action forms
- **Wallet:** ConnectKit (default) — connects any injected wallet (MetaMask, etc.)

## Files to Create/Modify

1. `contracts/ArcToken.sol` — ERC-20 contract with AccessControl, Pausable, Burnable
2. `contracts/test/ArcToken.t.sol` — Foundry unit tests (happy path, revert paths, fuzz, events)
3. `src/App.tsx` — Main UI: wallet connect, token info, mint/burn/pause panels
4. `src/components/TokenInfo.tsx` — Displays token name, symbol, total supply, user balance
5. `src/components/MintForm.tsx` — Mint form (MINTER_ROLE only; shows error if no role)
6. `src/components/BurnForm.tsx` — Burn form (any token holder)
7. `src/components/PauseControls.tsx` — Pause/unpause toggle (PAUSER_ROLE only)
8. `src/components/RoleManager.tsx` — Grant/revoke roles (DEFAULT_ADMIN_ROLE only)
9. `src/abi/ArcToken.ts` — Exported ABI for wagmi hooks

## Build Sequence

1. Write `ArcToken.sol` — ERC-20 with AccessControl, Pausable, Burnable; constructor grants all three roles to the deployer
2. Run a balanced security review of the contract; fix any findings
3. Run Slither static analysis; fix actionable findings
4. Write and run Foundry unit tests in `ArcToken.t.sol` — happy paths, role-revert paths, pause behaviour, fuzz mint amounts, event assertions
5. Deploy to Arc Testnet via `deploy_contract`
6. Offer post-deploy integration tests
7. Export ABI to `src/abi/ArcToken.ts` and wire contract address into the frontend
8. Build `TokenInfo`, `MintForm`, `BurnForm`, `PauseControls`, and `RoleManager` components
9. Assemble in `src/App.tsx` with ConnectKit wallet connection

## Done When
- [ ] `ArcToken.sol` compiles cleanly under the Paris EVM target
- [ ] Balanced security review passes with no Critical or High findings
- [ ] Slither returns no actionable findings
- [ ] All Foundry unit tests pass
- [ ] Contract deployed to Arc Testnet with a confirmed address
- [ ] UI connects wallet, shows live token balance, and can call mint/burn/pause from the browser
