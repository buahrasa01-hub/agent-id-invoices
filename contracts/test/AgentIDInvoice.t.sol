// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentIDInvoice} from "../src/AgentIDInvoice.sol";
import {MockAgentID} from "../src/mocks/MockAgentID.sol";

contract AgentIDInvoiceTest is Test {
    MockAgentID agentId;
    AgentIDInvoice invoice;
    address merchant = makeAddr("merchant");
    address buyer = makeAddr("buyer");
    address stranger = makeAddr("stranger");

    bytes32 constant INV = keccak256("inv-1");
    uint256 constant AMOUNT = 0.01 ether;

    function setUp() public {
        agentId = new MockAgentID();
        invoice = new AgentIDInvoice(address(agentId));
        agentId.mint(merchant);
        agentId.mint(buyer);
        vm.deal(buyer, 10 ether);
        vm.deal(stranger, 10 ether);
        vm.prank(merchant);
        invoice.createInvoice(INV, buyer, AMOUNT, 0, "Website redesign - milestone 1");
    }

    // ---------- gating ----------

    function test_isAgentIdHolder() public view {
        assertTrue(invoice.isAgentIdHolder(merchant));
        assertTrue(invoice.isAgentIdHolder(buyer));
        assertFalse(invoice.isAgentIdHolder(stranger));
    }

    function test_createInvoice_revertsForNonHolder() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(AgentIDInvoice.NotAgentIdHolder.selector, stranger));
        invoice.createInvoice(keccak256("inv-2"), buyer, AMOUNT, 0, "");
    }

    function test_pay_revertsForNonHolder() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(AgentIDInvoice.NotAgentIdHolder.selector, stranger));
        invoice.pay{value: AMOUNT}(INV);
    }

    // ---------- createInvoice ----------

    function test_createInvoice_storesFields() public view {
        AgentIDInvoice.InvoiceData memory inv = invoice.invoiceOf(INV);
        assertEq(inv.merchant, merchant);
        assertEq(inv.payer, buyer);
        assertEq(inv.amount, AMOUNT);
        assertEq(inv.dueAt, 0);
        assertEq(inv.memo, "Website redesign - milestone 1");
        assertFalse(inv.paid);
        assertFalse(inv.cancelled);
        assertTrue(invoice.isOpen(INV));
    }

    function test_createInvoice_anyHolderCanBeMerchant() public {
        bytes32 id = keccak256("inv-buyer-merchant");
        vm.prank(buyer);
        invoice.createInvoice(id, merchant, AMOUNT, 0, "buyer invoices merchant");
        assertEq(invoice.invoiceOf(id).merchant, buyer);
    }

    function test_createInvoice_revertsOnDuplicate() public {
        vm.prank(merchant);
        vm.expectRevert(abi.encodeWithSelector(AgentIDInvoice.InvoiceExists.selector, INV));
        invoice.createInvoice(INV, buyer, AMOUNT, 0, "");
    }

    function test_createInvoice_revertsOnZeroAmount() public {
        vm.prank(merchant);
        vm.expectRevert(AgentIDInvoice.ZeroAmount.selector);
        invoice.createInvoice(keccak256("inv-2"), buyer, 0, 0, "");
    }

    function test_createInvoice_revertsOnPastDueDate() public {
        vm.prank(merchant);
        vm.expectRevert(AgentIDInvoice.InvalidDueDate.selector);
        invoice.createInvoice(keccak256("inv-2"), buyer, AMOUNT, uint64(block.timestamp), "");
    }

    function test_createInvoice_openToAnyHolder() public {
        bytes32 id = keccak256("inv-open");
        vm.prank(merchant);
        invoice.createInvoice(id, address(0), AMOUNT, 0, "open invoice");
        assertEq(invoice.invoiceOf(id).payer, address(0));
    }

    // ---------- pay (BNB, exact amount) ----------

    function test_pay_movesExactBnbAndRecords() public {
        uint256 merchantBefore = merchant.balance;
        vm.prank(buyer);
        vm.expectEmit(true, true, false, true, address(invoice));
        emit AgentIDInvoice.InvoicePaid(INV, buyer, AMOUNT);
        invoice.pay{value: AMOUNT}(INV);

        assertEq(merchant.balance, merchantBefore + AMOUNT);
        assertEq(address(invoice).balance, 0);
        assertTrue(invoice.isPaid(INV));
        AgentIDInvoice.InvoiceData memory inv = invoice.invoiceOf(INV);
        assertEq(inv.paidBy, buyer);
        assertEq(inv.amount, AMOUNT);
        assertEq(inv.paidAt, block.timestamp);
    }

    function test_pay_revertsOnWrongAmount() public {
        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(AgentIDInvoice.WrongAmount.selector, AMOUNT, AMOUNT - 1));
        invoice.pay{value: AMOUNT - 1}(INV);
        assertFalse(invoice.isPaid(INV));
    }

    function test_pay_revertsOnSecondPayment() public {
        vm.prank(buyer);
        invoice.pay{value: AMOUNT}(INV);
        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(AgentIDInvoice.AlreadyPaid.selector, INV));
        invoice.pay{value: AMOUNT}(INV);
    }

    function test_pay_revertsForWrongPayer() public {
        address other = makeAddr("other-holder");
        agentId.mint(other);
        vm.deal(other, 10 ether);
        vm.prank(other);
        vm.expectRevert(abi.encodeWithSelector(AgentIDInvoice.WrongPayer.selector, other));
        invoice.pay{value: AMOUNT}(INV);
        assertFalse(invoice.isPaid(INV));
    }

    function test_pay_revertsOnUnknownInvoice() public {
        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(AgentIDInvoice.InvoiceNotFound.selector, keccak256("nope")));
        invoice.pay{value: AMOUNT}(keccak256("nope"));
    }

    function test_pay_revertsWhenExpired() public {
        bytes32 id = keccak256("inv-exp");
        vm.prank(merchant);
        invoice.createInvoice(id, buyer, AMOUNT, uint64(block.timestamp + 1 hours), "");
        vm.warp(block.timestamp + 2 hours);
        assertTrue(invoice.isExpired(id));
        assertFalse(invoice.isOpen(id));

        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(AgentIDInvoice.InvoiceExpired.selector, id));
        invoice.pay{value: AMOUNT}(id);
    }

    function test_pay_revertsWhenCancelled() public {
        vm.prank(merchant);
        invoice.cancelInvoice(INV);

        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(AgentIDInvoice.AlreadyCancelled.selector, INV));
        invoice.pay{value: AMOUNT}(INV);
    }

    function test_directBnbTransferReverts() public {
        vm.prank(buyer);
        (bool ok,) = address(invoice).call{value: 1 ether}("");
        assertFalse(ok);
    }

    // ---------- cancelInvoice ----------

    function test_cancelInvoice_wrongMerchantReverts() public {
        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(AgentIDInvoice.NotInvoiceMerchant.selector, buyer));
        invoice.cancelInvoice(INV);
    }

    function test_cancelInvoice_marksCancelled() public {
        vm.prank(merchant);
        vm.expectEmit(true, false, false, true, address(invoice));
        emit AgentIDInvoice.InvoiceCancelled(INV);
        invoice.cancelInvoice(INV);
        assertTrue(invoice.isCancelled(INV));
        assertFalse(invoice.isOpen(INV));
    }

    function test_cancelInvoice_revertsWhenPaid() public {
        vm.prank(buyer);
        invoice.pay{value: AMOUNT}(INV);

        vm.prank(merchant);
        vm.expectRevert(abi.encodeWithSelector(AgentIDInvoice.AlreadyPaid.selector, INV));
        invoice.cancelInvoice(INV);
    }

    function test_constructor_rejectsZeroAddress() public {
        vm.expectRevert(AgentIDInvoice.ZeroAddress.selector);
        new AgentIDInvoice(address(0));
    }

    function testFuzz_createAndPay(uint256 amount) public {
        amount = bound(amount, 1, 1 ether);
        bytes32 id = keccak256(abi.encode(amount, block.timestamp));
        vm.prank(merchant);
        invoice.createInvoice(id, buyer, amount, 0, "fuzz");
        uint256 merchantBefore = merchant.balance;
        vm.prank(buyer);
        invoice.pay{value: amount}(id);
        assertEq(merchant.balance, merchantBefore + amount);
        assertEq(invoice.invoiceOf(id).amount, amount);
    }
}
