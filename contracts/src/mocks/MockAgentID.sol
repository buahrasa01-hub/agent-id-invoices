// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @notice Test-only stand-in for the real Agent ID (SPACE ID Agent ID,
///         ERC-721, non-transferable) on chains where it is not deployed
///         (local anvil, BSC testnet fork). Anyone can mint — NEVER use on
///         mainnet, where the real Agent ID contract must be used instead.
contract MockAgentID is ERC721 {
    uint256 private _nextId = 1;

    constructor() ERC721("Mock Agent ID", "MOCKID") {}

    function mint(address to) external returns (uint256 tokenId) {
        tokenId = _nextId++;
        _mint(to, tokenId);
    }
}
