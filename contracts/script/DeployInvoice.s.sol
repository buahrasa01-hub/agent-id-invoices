// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AgentIDInvoice} from "../src/AgentIDInvoice.sol";
import {MockAgentID} from "../src/mocks/MockAgentID.sol";

/// @notice Deploys AgentIDInvoice.
///   - BSC mainnet (56): uses the real Agent ID contract.
///   - BSC testnet (97) and local anvil (31337) / fork: the real Agent ID is
///     not deployed there, so a MockAgentID is deployed instead and one mock
///     ID is minted to the deployer, so the deployer can create test invoices.
///     NEVER point mainnet at the mock.
///
///   make deploy-local                    # anvil on 127.0.0.1:8545
///   make deploy-fork                     # fork of BSC testnet on 127.0.0.1:8555
///   make deploy-testnet ACCOUNT=deployer # uses a keystore made with `cast wallet import`
///   make deploy-mainnet ACCOUNT=deployer # MAINNET: real BNB, only on Bayu's funding decision
contract DeployInvoice is Script {
    /// SPACE ID Agent ID (ERC-721, non-transferable) on BNB Chain mainnet.
    address constant AGENT_ID = 0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F;
    uint256 constant BSC_MAINNET = 56;
    uint256 constant BSC_TESTNET = 97;
    uint256 constant ANVIL_CHAIN = 31337;
    uint256 constant FORK_CHAIN = 97097;

    function run() external returns (AgentIDInvoice invoice, address agentId) {
        vm.startBroadcast();
        (, address deployer,) = vm.readCallers();

        if (AGENT_ID.code.length > 0) {
            require(block.chainid == BSC_MAINNET, "Real Agent ID found on a non-mainnet chain. Refusing.");
            agentId = AGENT_ID;
        } else {
            require(
                block.chainid == BSC_TESTNET || block.chainid == ANVIL_CHAIN || block.chainid == FORK_CHAIN,
                "Agent ID not found on this chain. Deploy only on BSC mainnet (56), BSC testnet (97), or local."
            );
            MockAgentID mock = new MockAgentID();
            mock.mint(deployer);
            agentId = address(mock);
        }
        invoice = new AgentIDInvoice(agentId);
        vm.stopBroadcast();

        console.log("chainId  ", block.chainid);
        console.log("agentId  ", agentId);
        console.log("Invoice  ", address(invoice));
    }
}
