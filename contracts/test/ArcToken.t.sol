// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ArcToken} from "../ArcToken.sol";

// ─────────────────────────────────────────────────────────────────────────────
// Handler used by the invariant test.
// Tracks a "ghost" running total of net minted tokens per recipient so the
// invariant can assert totalSupply == Σ balanceOf(tracked holders).
// ─────────────────────────────────────────────────────────────────────────────
contract ArcTokenHandler is Test {
    ArcToken public token;
    address public minter;

    // Up to 5 tracked recipients
    address[5] public recipients;
    uint8 public recipientCount;

    constructor(ArcToken _token, address _minter) {
        token = _token;
        minter = _minter;
    }

    /// @dev Mint a bounded amount to one of the tracked recipients.
    function mint(uint8 recipientIndex, uint256 amount) external {
        // Bound amount to a safe per-call range to avoid overflow across many mints.
        amount = bound(amount, 0, 1e27);

        // Choose an existing recipient or register a new one (up to 5).
        address to;
        if (recipientCount == 0) {
            to = makeAddr("holder0");
            recipients[0] = to;
            recipientCount = 1;
        } else {
            uint8 idx = uint8(bound(recipientIndex, 0, recipientCount - 1));
            // Occasionally add a new holder
            if (recipientIndex > 200 && recipientCount < 5) {
                to = makeAddr(string(abi.encodePacked("holder", recipientCount)));
                recipients[recipientCount] = to;
                recipientCount++;
            } else {
                to = recipients[idx];
            }
        }

        vm.prank(minter);
        token.mint(to, amount);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main test contract
// ─────────────────────────────────────────────────────────────────────────────
contract ArcTokenTest is Test {
    ArcToken internal token;

    address internal admin  = makeAddr("admin");
    address internal alice  = makeAddr("alice");
    address internal bob    = makeAddr("bob");
    address internal carol  = makeAddr("carol");
    address internal nobody = makeAddr("nobody");

    bytes32 internal constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 internal constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 internal constant DEFAULT_ADMIN_ROLE = bytes32(0);

    uint256 internal constant MINT_AMOUNT = 1_000e18;

    function setUp() public {
        token = new ArcToken("Arc Token", "ARC", admin);
    }

    // ────────────────────────────────────────────────────────────────────────
    // 1. Deployment & Initialization
    // ────────────────────────────────────────────────────────────────────────

    function test_DeploymentSetsNameAndSymbol() public view {
        assertEq(token.name(),   "Arc Token");
        assertEq(token.symbol(), "ARC");
    }

    function test_DeploymentZeroTotalSupply() public view {
        assertEq(token.totalSupply(), 0);
    }

    function test_DeploymentGrantsRolesToAdmin() public view {
        assertTrue(token.hasRole(DEFAULT_ADMIN_ROLE, admin));
        assertTrue(token.hasRole(MINTER_ROLE,        admin));
        assertTrue(token.hasRole(PAUSER_ROLE,        admin));
    }

    function test_DeploymentRevertsOnZeroAdmin() public {
        vm.expectRevert(ArcToken.ArcToken__ZeroAdmin.selector);
        new ArcToken("Arc Token", "ARC", address(0));
    }

    function test_DeploymentStartsUnpaused() public view {
        assertFalse(token.paused());
    }

    // ────────────────────────────────────────────────────────────────────────
    // 2. Happy path — mint
    // ────────────────────────────────────────────────────────────────────────

    function test_MintIncreasesBalanceAndSupply() public {
        vm.prank(admin);
        token.mint(alice, MINT_AMOUNT);

        assertEq(token.balanceOf(alice), MINT_AMOUNT);
        assertEq(token.totalSupply(),    MINT_AMOUNT);
    }

    function test_MintEmitsTransferFromZero() public {
        vm.prank(admin);
        vm.expectEmit(true, true, false, true, address(token));
        emit IERC20.Transfer(address(0), alice, MINT_AMOUNT);
        token.mint(alice, MINT_AMOUNT);
    }

    function test_MintByGrantedMinter() public {
        // Grant MINTER_ROLE to bob
        vm.prank(admin);
        token.grantRole(MINTER_ROLE, bob);

        vm.prank(bob);
        token.mint(carol, MINT_AMOUNT);

        assertEq(token.balanceOf(carol), MINT_AMOUNT);
    }

    // ────────────────────────────────────────────────────────────────────────
    // 3. Happy path — burn
    // ────────────────────────────────────────────────────────────────────────

    function test_BurnDecreasesBalanceAndSupply() public {
        vm.prank(admin);
        token.mint(alice, MINT_AMOUNT);

        uint256 supplyBefore = token.totalSupply();
        uint256 burnAmount   = 400e18;

        vm.prank(alice);
        token.burn(burnAmount);

        assertEq(token.balanceOf(alice), MINT_AMOUNT - burnAmount);
        assertEq(token.totalSupply(),    supplyBefore - burnAmount);
    }

    function test_BurnEmitsTransferToZero() public {
        vm.prank(admin);
        token.mint(alice, MINT_AMOUNT);

        vm.prank(alice);
        vm.expectEmit(true, true, false, true, address(token));
        emit IERC20.Transfer(alice, address(0), 400e18);
        token.burn(400e18);
    }

    // ────────────────────────────────────────────────────────────────────────
    // 4. Happy path — burnFrom
    // ────────────────────────────────────────────────────────────────────────

    function test_BurnFromDecreasesBalanceAndSupply() public {
        vm.prank(admin);
        token.mint(alice, MINT_AMOUNT);

        // alice approves bob
        vm.prank(alice);
        token.approve(bob, MINT_AMOUNT);

        vm.prank(bob);
        token.burnFrom(alice, 300e18);

        assertEq(token.balanceOf(alice), MINT_AMOUNT - 300e18);
        assertEq(token.totalSupply(),    MINT_AMOUNT - 300e18);
        // Allowance decremented
        assertEq(token.allowance(alice, bob), MINT_AMOUNT - 300e18);
    }

    function test_BurnFromEmitsTransferToZero() public {
        vm.prank(admin);
        token.mint(alice, MINT_AMOUNT);

        vm.prank(alice);
        token.approve(bob, MINT_AMOUNT);

        vm.prank(bob);
        vm.expectEmit(true, true, false, true, address(token));
        emit IERC20.Transfer(alice, address(0), 300e18);
        token.burnFrom(alice, 300e18);
    }

    // ────────────────────────────────────────────────────────────────────────
    // 5. Happy path — transfer while unpaused
    // ────────────────────────────────────────────────────────────────────────

    function test_TransferWhileUnpaused() public {
        vm.prank(admin);
        token.mint(alice, MINT_AMOUNT);

        vm.prank(alice);
        token.transfer(bob, 250e18);

        assertEq(token.balanceOf(alice), MINT_AMOUNT - 250e18);
        assertEq(token.balanceOf(bob),   250e18);
    }

    function test_TransferEmitsTransferEvent() public {
        vm.prank(admin);
        token.mint(alice, MINT_AMOUNT);

        vm.prank(alice);
        vm.expectEmit(true, true, false, true, address(token));
        emit IERC20.Transfer(alice, bob, 250e18);
        token.transfer(bob, 250e18);
    }

    // ────────────────────────────────────────────────────────────────────────
    // 6. Role-revert paths
    // ────────────────────────────────────────────────────────────────────────

    function test_RevertMintWithoutMinterRole() public {
        vm.prank(nobody);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                nobody,
                MINTER_ROLE
            )
        );
        token.mint(alice, MINT_AMOUNT);
    }

    function test_RevertPauseWithoutPauserRole() public {
        vm.prank(nobody);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                nobody,
                PAUSER_ROLE
            )
        );
        token.pause();
    }

    function test_RevertUnpauseWithoutPauserRole() public {
        vm.prank(admin);
        token.pause();

        vm.prank(nobody);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                nobody,
                PAUSER_ROLE
            )
        );
        token.unpause();
    }

    function test_RevertGrantRoleWithoutAdminRole() public {
        vm.prank(nobody);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                nobody,
                DEFAULT_ADMIN_ROLE
            )
        );
        token.grantRole(MINTER_ROLE, alice);
    }

    function test_RevertRevokeRoleWithoutAdminRole() public {
        vm.prank(nobody);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                nobody,
                DEFAULT_ADMIN_ROLE
            )
        );
        token.revokeRole(MINTER_ROLE, admin);
    }

    // ────────────────────────────────────────────────────────────────────────
    // 7. Pause behaviour
    // ────────────────────────────────────────────────────────────────────────

    function test_TransferRevertsWhenPaused() public {
        vm.prank(admin);
        token.mint(alice, MINT_AMOUNT);

        vm.prank(admin);
        token.pause();

        vm.prank(alice);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        token.transfer(bob, 100e18);
    }

    function test_MintRevertsWhenPaused() public {
        vm.prank(admin);
        token.pause();

        vm.prank(admin);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        token.mint(alice, MINT_AMOUNT);
    }

    function test_BurnRevertsWhenPaused() public {
        vm.prank(admin);
        token.mint(alice, MINT_AMOUNT);

        vm.prank(admin);
        token.pause();

        vm.prank(alice);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        token.burn(MINT_AMOUNT);
    }

    function test_BurnFromRevertsWhenPaused() public {
        vm.prank(admin);
        token.mint(alice, MINT_AMOUNT);

        vm.prank(alice);
        token.approve(bob, MINT_AMOUNT);

        vm.prank(admin);
        token.pause();

        vm.prank(bob);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        token.burnFrom(alice, MINT_AMOUNT);
    }

    function test_TransferSucceedsAfterUnpause() public {
        vm.prank(admin);
        token.mint(alice, MINT_AMOUNT);

        vm.prank(admin);
        token.pause();

        vm.prank(admin);
        token.unpause();

        vm.prank(alice);
        token.transfer(bob, 100e18);
        assertEq(token.balanceOf(bob), 100e18);
    }

    function test_MintSucceedsAfterUnpause() public {
        vm.prank(admin);
        token.pause();

        vm.prank(admin);
        token.unpause();

        vm.prank(admin);
        token.mint(alice, MINT_AMOUNT);
        assertEq(token.balanceOf(alice), MINT_AMOUNT);
    }

    function test_BurnSucceedsAfterUnpause() public {
        vm.prank(admin);
        token.mint(alice, MINT_AMOUNT);

        vm.prank(admin);
        token.pause();

        vm.prank(admin);
        token.unpause();

        vm.prank(alice);
        token.burn(MINT_AMOUNT);
        assertEq(token.balanceOf(alice), 0);
    }

    // ────────────────────────────────────────────────────────────────────────
    // 8. Event assertions — Paused / Unpaused
    // ────────────────────────────────────────────────────────────────────────

    function test_PauseEmitsPausedEvent() public {
        vm.prank(admin);
        vm.expectEmit(false, false, false, true, address(token));
        emit Pausable.Paused(admin);
        token.pause();
    }

    function test_UnpauseEmitsUnpausedEvent() public {
        vm.prank(admin);
        token.pause();

        vm.prank(admin);
        vm.expectEmit(false, false, false, true, address(token));
        emit Pausable.Unpaused(admin);
        token.unpause();
    }

    // ────────────────────────────────────────────────────────────────────────
    // 9. Event assertions — RoleGranted / RoleRevoked
    // ────────────────────────────────────────────────────────────────────────

    function test_GrantRoleEmitsRoleGrantedEvent() public {
        vm.prank(admin);
        vm.expectEmit(true, true, true, true, address(token));
        emit IAccessControl.RoleGranted(MINTER_ROLE, bob, admin);
        token.grantRole(MINTER_ROLE, bob);
    }

    function test_RevokeRoleEmitsRoleRevokedEvent() public {
        vm.prank(admin);
        vm.expectEmit(true, true, true, true, address(token));
        emit IAccessControl.RoleRevoked(MINTER_ROLE, admin, admin);
        token.revokeRole(MINTER_ROLE, admin);
    }

    function test_GrantedRoleIsActive() public {
        assertFalse(token.hasRole(MINTER_ROLE, bob));

        vm.prank(admin);
        token.grantRole(MINTER_ROLE, bob);

        assertTrue(token.hasRole(MINTER_ROLE, bob));
    }

    function test_RevokedRoleIsInactive() public {
        vm.prank(admin);
        token.revokeRole(MINTER_ROLE, admin);

        assertFalse(token.hasRole(MINTER_ROLE, admin));

        // Minting now reverts
        vm.prank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                admin,
                MINTER_ROLE
            )
        );
        token.mint(alice, MINT_AMOUNT);
    }

    // ────────────────────────────────────────────────────────────────────────
    // 10. Fuzz — mint over a wide uint256 range
    // ────────────────────────────────────────────────────────────────────────

    /// @dev Full uint256 range split across successive mints to alice and bob.
    ///      Checks that balances and totalSupply are always consistent.
    function testFuzz_MintBalanceAndSupplyConsistency(uint256 amount) public {
        vm.assume(alice != address(0));
        // Bound to avoid any theoretical overflow in a single mint.
        // type(uint128).max still covers an enormous space and ensures no wrap.
        amount = bound(amount, 0, type(uint128).max);

        uint256 supplyBefore = token.totalSupply();
        uint256 balBefore    = token.balanceOf(alice);

        vm.prank(admin);
        token.mint(alice, amount);

        assertEq(token.balanceOf(alice), balBefore + amount,   "balance mismatch");
        assertEq(token.totalSupply(),    supplyBefore + amount, "supply mismatch");
    }

    /// @dev Two independent recipients: totalSupply == balanceOf(a) + balanceOf(b).
    function testFuzz_MintTwoRecipientsSupplyEqualsSum(uint256 amountA, uint256 amountB) public {
        amountA = bound(amountA, 0, type(uint128).max);
        amountB = bound(amountB, 0, type(uint128).max);

        vm.startPrank(admin);
        token.mint(alice, amountA);
        token.mint(bob,   amountB);
        vm.stopPrank();

        assertEq(
            token.totalSupply(),
            token.balanceOf(alice) + token.balanceOf(bob),
            "supply != sum of balances"
        );
    }

    /// @dev Mint then burn: net supply must equal exactly amountMinted - amountBurned.
    function testFuzz_MintBurnNetSupply(uint256 mintAmt, uint256 burnAmt) public {
        mintAmt = bound(mintAmt, 1, type(uint128).max);
        burnAmt = bound(burnAmt, 0, mintAmt);

        vm.prank(admin);
        token.mint(alice, mintAmt);

        vm.prank(alice);
        token.burn(burnAmt);

        assertEq(token.totalSupply(),    mintAmt - burnAmt, "supply wrong after burn");
        assertEq(token.balanceOf(alice), mintAmt - burnAmt, "balance wrong after burn");
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Invariant test — totalSupply == Σ balanceOf over all tracked holders.
// ─────────────────────────────────────────────────────────────────────────────
contract ArcTokenInvariantTest is Test {
    ArcToken        internal token;
    ArcTokenHandler internal handler;

    address internal admin = makeAddr("invariant-admin");

    function setUp() public {
        token   = new ArcToken("Arc Token", "ARC", admin);
        handler = new ArcTokenHandler(token, admin);
        targetContract(address(handler));
    }

    /// @dev Core conservation law: totalSupply must equal the sum of all
    ///      balances tracked by the handler, across every possible call sequence.
    function invariant_TotalSupplyEqualsSumOfBalances() public view {
        uint256 sumBalances;
        uint8 count = handler.recipientCount();
        for (uint8 i = 0; i < count; i++) {
            sumBalances += token.balanceOf(handler.recipients(i));
        }
        assertEq(token.totalSupply(), sumBalances, "invariant: supply != sum of balances");
    }

    /// @dev Paused flag must be false at all times (handler never pauses).
    function invariant_ContractNeverPaused() public view {
        assertFalse(token.paused(), "invariant: token unexpectedly paused");
    }
}
