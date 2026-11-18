// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal view of the Agent ID token (SPACE ID Agent ID, ERC-721,
///         non-transferable). Only `balanceOf` is needed: > 0 means the address
///         holds an Agent ID.
interface IAgentID {
    function balanceOf(address account) external view returns (uint256);
}

/// @title AgentIDInvoice
/// @notice BNB-native invoicing where ONLY Agent ID holders can create and pay.
///         Any holder can invoice any other holder: the merchant is whoever
///         creates the invoice, and the payment goes straight to that merchant
///         in BNB. No token, no approval, no relayer — the buyer sends one
///         transaction with the exact invoiced amount as `msg.value`.
///
///         Every invoice is an on-chain Agent ID interaction: `InvoiceCreated`
///         and `InvoicePaid` are the receipts, and the Pioneer ranking counts
///         distinct Agent ID holders interacting with this contract.
///
/// @dev Adapted from Aevum Invoices' Invoice.sol (MIT, forked from the Aevum
///      Starter Kit's Checkout.sol by PQA Labs), changed in four ways:
///        1. BNB native instead of a stablecoin: `pay` is payable and the
///           exact invoiced amount must arrive as `msg.value`.
///        2. Multi-merchant: anyone holding an Agent ID can create an invoice;
///           the invoice records its own merchant, who receives the payment.
///        3. Agent ID gating: `createInvoice` and `pay` both revert unless the
///           caller holds an Agent ID (`balanceOf > 0` on the Agent ID contract).
///        4. No `receive()`/`fallback()`: BNB sent straight to the contract by
///           mistake reverts, so funds can never get stuck here. Invoice
///           payments never sit in the contract — they go straight to the
///           merchant — so there is nothing to recover.
contract AgentIDInvoice {
    struct InvoiceData {
        address merchant;
        address payer; // address(0) = any Agent ID holder may pay
        address paidBy;
        uint64 createdAt;
        uint64 dueAt; // 0 = no expiry
        uint64 paidAt;
        uint256 amount; // wei (BNB)
        string memo;
        bool paid;
        bool cancelled;
    }

    /// @notice SPACE ID Agent ID on BNB Chain.
    address public immutable agentId;

    mapping(bytes32 invoiceId => InvoiceData) private _invoices;

    event InvoiceCreated(
        bytes32 indexed invoiceId,
        address indexed merchant,
        address indexed payer,
        uint256 amount,
        uint64 dueAt,
        string memo
    );
    event InvoicePaid(bytes32 indexed invoiceId, address indexed payer, uint256 amount);
    event InvoiceCancelled(bytes32 indexed invoiceId);

    error NotAgentIdHolder(address account);
    error NotInvoiceMerchant(address account);
    error InvoiceExists(bytes32 invoiceId);
    error InvoiceNotFound(bytes32 invoiceId);
    error AlreadyPaid(bytes32 invoiceId);
    error AlreadyCancelled(bytes32 invoiceId);
    error InvoiceExpired(bytes32 invoiceId);
    error WrongPayer(address payer);
    error WrongAmount(uint256 expected, uint256 received);
    error ZeroAmount();
    error ZeroAddress();
    error InvalidDueDate();
    error TransferFailed();

    constructor(address agentId_) {
        if (agentId_ == address(0)) revert ZeroAddress();
        agentId = agentId_;
    }

    /// @notice True when `account` holds an Agent ID. The web app reads this
    ///         to show the gate before a wallet tries to create or pay.
    function isAgentIdHolder(address account) public view returns (bool) {
        return IAgentID(agentId).balanceOf(account) > 0;
    }

    /// @notice Create an invoice. Any Agent ID holder; the caller becomes the
    ///         merchant of this invoice. `dueAt` is a unix timestamp, 0 = no expiry.
    function createInvoice(
        bytes32 invoiceId,
        address payer,
        uint256 amount,
        uint64 dueAt,
        string calldata memo
    ) external {
        if (!isAgentIdHolder(msg.sender)) revert NotAgentIdHolder(msg.sender);
        if (amount == 0) revert ZeroAmount();
        if (_invoices[invoiceId].amount != 0) revert InvoiceExists(invoiceId);
        if (dueAt != 0 && dueAt <= block.timestamp) revert InvalidDueDate();

        _invoices[invoiceId] = InvoiceData({
            merchant: msg.sender,
            payer: payer,
            paidBy: address(0),
            createdAt: uint64(block.timestamp),
            dueAt: dueAt,
            paidAt: 0,
            amount: amount,
            memo: memo,
            paid: false,
            cancelled: false
        });
        emit InvoiceCreated(invoiceId, msg.sender, payer, amount, dueAt, memo);
    }

    /// @notice Pay `invoiceId` with the exact invoiced amount in BNB.
    ///         Only an Agent ID holder, and only the designated payer, if any.
    ///         The BNB goes straight to the invoice's merchant.
    function pay(bytes32 invoiceId) external payable {
        if (!isAgentIdHolder(msg.sender)) revert NotAgentIdHolder(msg.sender);
        InvoiceData storage inv = _payable(invoiceId, msg.sender);
        if (msg.value != inv.amount) revert WrongAmount(inv.amount, msg.value);
        inv.paid = true;
        inv.paidBy = msg.sender;
        inv.paidAt = uint64(block.timestamp);
        emit InvoicePaid(invoiceId, msg.sender, inv.amount);
        (bool ok,) = inv.merchant.call{value: inv.amount}("");
        if (!ok) revert TransferFailed();
    }

    /// @notice Cancel an unpaid invoice. Only that invoice's merchant.
    function cancelInvoice(bytes32 invoiceId) external {
        InvoiceData storage inv = _invoices[invoiceId];
        if (inv.amount == 0) revert InvoiceNotFound(invoiceId);
        if (msg.sender != inv.merchant) revert NotInvoiceMerchant(msg.sender);
        if (inv.paid) revert AlreadyPaid(invoiceId);
        if (inv.cancelled) revert AlreadyCancelled(invoiceId);
        inv.cancelled = true;
        emit InvoiceCancelled(invoiceId);
    }

    function invoiceOf(bytes32 invoiceId) external view returns (InvoiceData memory) {
        return _invoices[invoiceId];
    }

    function isPaid(bytes32 invoiceId) external view returns (bool) {
        return _invoices[invoiceId].paid;
    }

    function isCancelled(bytes32 invoiceId) external view returns (bool) {
        return _invoices[invoiceId].cancelled;
    }

    function isExpired(bytes32 invoiceId) external view returns (bool) {
        InvoiceData storage inv = _invoices[invoiceId];
        return inv.amount != 0 && !inv.paid && inv.dueAt != 0 && block.timestamp > inv.dueAt;
    }

    function isOpen(bytes32 invoiceId) external view returns (bool) {
        InvoiceData storage inv = _invoices[invoiceId];
        return inv.amount != 0 && !inv.paid && !inv.cancelled
            && (inv.dueAt == 0 || block.timestamp <= inv.dueAt);
    }

    function _payable(bytes32 invoiceId, address payer) private view returns (InvoiceData storage) {
        InvoiceData storage inv = _invoices[invoiceId];
        if (inv.amount == 0) revert InvoiceNotFound(invoiceId);
        if (inv.paid) revert AlreadyPaid(invoiceId);
        if (inv.cancelled) revert AlreadyCancelled(invoiceId);
        if (inv.dueAt != 0 && block.timestamp > inv.dueAt) revert InvoiceExpired(invoiceId);
        if (inv.payer != address(0) && inv.payer != payer) revert WrongPayer(payer);
        return inv;
    }
}
