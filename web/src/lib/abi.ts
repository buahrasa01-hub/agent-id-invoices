import { parseAbi, type Address } from "viem";

/** SPACE ID Agent ID (ERC-721, non-transferable) on BNB Chain mainnet. */
export const AGENT_ID_ADDRESS = "0x60B9262456dE011F7d15a54cdd8c48baaa8b022f" as Address;

/**
 * AgentIDInvoice ABI (contracts/src/AgentIDInvoice.sol).
 * BNB-native: pay(invoiceId) takes the exact invoiced amount as msg.value.
 * No token, no approval, no relayer.
 */
export const invoiceAbi = parseAbi([
  "function agentId() view returns (address)",
  "function isAgentIdHolder(address) view returns (bool)",
  "function createInvoice(bytes32 invoiceId, address payer, uint256 amount, uint64 dueAt, string memo)",
  "function pay(bytes32 invoiceId) payable",
  "function cancelInvoice(bytes32 invoiceId)",
  "function invoiceOf(bytes32 invoiceId) view returns ((address merchant, address payer, address paidBy, uint64 createdAt, uint64 dueAt, uint64 paidAt, uint256 amount, string memo, bool paid, bool cancelled))",
  "function isPaid(bytes32) view returns (bool)",
  "function isCancelled(bytes32) view returns (bool)",
  "function isExpired(bytes32) view returns (bool)",
  "function isOpen(bytes32) view returns (bool)",
  "event InvoiceCreated(bytes32 indexed invoiceId, address indexed merchant, address indexed payer, uint256 amount, uint64 dueAt, string memo)",
  "event InvoicePaid(bytes32 indexed invoiceId, address indexed payer, uint256 amount)",
  "event InvoiceCancelled(bytes32 indexed invoiceId)",
  "error NotAgentIdHolder(address)",
  "error NotInvoiceMerchant(address)",
  "error InvoiceExists(bytes32)",
  "error InvoiceNotFound(bytes32)",
  "error AlreadyPaid(bytes32)",
  "error AlreadyCancelled(bytes32)",
  "error InvoiceExpired(bytes32)",
  "error WrongPayer(address)",
  "error WrongAmount(uint256,uint256)",
  "error ZeroAmount()",
  "error ZeroAddress()",
  "error InvalidDueDate()",
  "error TransferFailed()",
]);

/** Minimal Agent ID view (for display: balance + name). */
export const agentIdAbi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function name() view returns (string)",
]);
