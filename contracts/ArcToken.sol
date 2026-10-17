// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Pausable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";

contract ArcToken is ERC20, ERC20Burnable, ERC20Pausable, AccessControl {
    error ArcToken__ZeroAdmin();

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    /// @notice Deploys ArcToken with a configurable name and symbol.
    /// @param name The ERC-20 token name.
    /// @param symbol The ERC-20 token symbol.
    /// @param initialAdmin The account granted DEFAULT_ADMIN_ROLE, MINTER_ROLE, and PAUSER_ROLE.
    constructor(string memory name, string memory symbol, address initialAdmin) ERC20(name, symbol) {
        if (initialAdmin == address(0)) revert ArcToken__ZeroAdmin();

        _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);
        _grantRole(MINTER_ROLE, initialAdmin);
        _grantRole(PAUSER_ROLE, initialAdmin);
    }

    /// @notice Mints `amount` tokens to `to`.
    /// @dev Reverts unless the caller has MINTER_ROLE. Also reverts while paused via ERC20Pausable.
    /// @param to The recipient of the newly minted tokens.
    /// @param amount The amount of tokens to mint.
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    /// @notice Burns `amount` tokens from the caller.
    /// @dev Reverts while paused via ERC20Pausable.
    /// @param amount The amount of caller tokens to burn.
    function burn(uint256 amount) public override {
        super.burn(amount);
    }

    /// @notice Burns `amount` tokens from `account` using the caller's allowance.
    /// @dev Reverts while paused via ERC20Pausable.
    /// @param account The account whose tokens are burned.
    /// @param amount The amount of tokens to burn.
    function burnFrom(address account, uint256 amount) public override {
        super.burnFrom(account, amount);
    }

    /// @notice Pauses all token transfers, minting, and burning.
    /// @dev Reverts unless the caller has PAUSER_ROLE.
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /// @notice Unpauses all token transfers, minting, and burning.
    /// @dev Reverts unless the caller has PAUSER_ROLE.
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /// @notice Returns whether this contract supports an interface.
    /// @param interfaceId The interface identifier to check.
    /// @return True if the interface is supported.
    function supportsInterface(bytes4 interfaceId) public view override(AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /// @dev Enforces pause checks for all token state changes (transfer, mint, burn).
    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Pausable) {
        super._update(from, to, value);
    }
}
