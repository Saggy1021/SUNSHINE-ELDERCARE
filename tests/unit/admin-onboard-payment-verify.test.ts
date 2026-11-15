import assert from "node:assert/strict";
import { adminVerifyPayment } from "../../lib/services/payment";

const FIXED_NOW = new Date("2026-11-14T10:00:00.000Z");
const FIXED_END = new Date("2027-05-13T10:00:00.000Z");

function makeHarness(options: {
  payment?: any;
  carePlan?: any;
  legacyPlan?: any;
  updateCount?: number;
  renewalRequest?: any;
} = {}) {
  const events: Array<{ name: string; data?: any }> = [];
  const writes: Array<{ name: string; data?: any }> = [];
  let committed = false;
  const payment = options.payment ?? {
    id: "payment-1",
    userId: "user-1",
    invoiceId: "invoice-1",
    amount: 38940,
    currency: "INR",
    paymentMethod: "OFFLINE",
    reference: "BANK-REF-1",
    status: "VERIFICATION_PENDING",
    invoice: {
      id: "invoice-1",
      planId: "plan-slug",
      paymentStatus: "UNPAID",
      status: "DRAFT",
      invoiceNumber: null,
      customerName: "Test Member",
      customerEmail: "member@example.test",
      customerAddress: "Kolkata",
      customerPhone: "9000000000",
      issueDate: FIXED_NOW,
      lineItems: [{
        id: "line-1",
        planName: "Plan Slug",
        durationMonths: 6,
        variantType: "COUPLE",
      }],
    },
    renewalRequest: options.renewalRequest ?? null,
    user: {
      name: "Test Member",
      email: "member@example.test",
      memberProfile: { serviceAddress: "Kolkata", mobileNumber: "9000000000" },
    },
  };

  const tx: any = {
    invoice: {
      findUnique: async () => payment.invoice,
      update: async (args: any) => writes.push({ name: "invoice.update", data: args.data }),
    },
    payment: {
      updateMany: async (args: any) => {
        events.push({ name: "payment.updateMany", data: args });
        return { count: options.updateCount ?? 1 };
      },
    },
    receipt: {
      create: async (args: any) => writes.push({ name: "receipt.create", data: args.data }),
    },
    carePlan: {
      findFirst: async () => options.carePlan === undefined ? { id: "care-plan-1", name: "Plan Slug" } : options.carePlan,
    },
    plan: {
      findUnique: async () => options.legacyPlan ?? null,
    },
    subscription: {
      create: async (args: any) => {
        writes.push({ name: "subscription.create", data: args.data });
        return { id: "subscription-created-1" };
      },
      updateMany: async (args: any) => writes.push({ name: "subscription.updateMany", data: args }),
      update: async (args: any) => writes.push({ name: "subscription.update", data: args }),
    },
    subscriptionAddOn: {
      createMany: async (args: any) => writes.push({ name: "subscriptionAddOn.createMany", data: args.data }),
    },
    renewalRequest: {
      update: async (args: any) => writes.push({ name: "renewalRequest.update", data: args.data }),
    },
    auditLog: {
      create: async (args: any) => writes.push({ name: "auditLog.create", data: args.data }),
    },
  };

  const database: any = {
    payment: { findUnique: async () => payment },
    subscription: {
      findUnique: async (args: any) => {
        events.push({ name: "subscription.findUnique", data: args });
        return {
          id: args.where.id,
          status: "ACTIVE",
          startDate: FIXED_NOW,
          endDate: FIXED_END,
          carePlanId: "care-plan-1",
          variantType: "COUPLE",
          durationMonths: 6,
          addOns: [],
        };
      },
    },
    $transaction: async (callback: (client: any) => Promise<void>) => {
      await callback(tx);
      committed = true;
    },
  };

  const dependencies: any = {
    dbClient: database,
    documentSequences: {
      generateInvoiceNumber: async () => "SEC/1001/2026-27",
      generateReceiptNumber: async () => "SEC/REC/1001/2026-27",
    },
    memberIdentity: {
      ensureMemberIdForUser: async (...args: any[]) => events.push({ name: "memberIdentity.ensure", data: args }),
    },
    notifications: {
      onPaymentVerified: async (...args: any[]) => events.push({ name: "notification.sent", data: args }),
    },
    calculateEndDateFn: () => FIXED_END,
    now: () => FIXED_NOW,
  };

  return { events, writes, dependencies, committed: () => committed };
}

async function rejectsWith(promise: Promise<unknown>, message: RegExp) {
  await assert.rejects(promise, (error: any) => {
    assert.match(String(error?.message), message);
    return true;
  });
}

async function runTests() {
  // The real service function must settle a valid onboarding payment and create a subscription.
  {
    const h = makeHarness();
    await adminVerifyPayment("payment-1", "admin-1", h.dependencies);
    assert.equal(h.committed(), true);
    assert.equal(h.writes.filter((w) => w.name === "subscription.create").length, 1);
    assert.equal(h.writes.find((w) => w.name === "subscription.create")?.data.variantType, "COUPLE");
    assert.equal(h.writes.find((w) => w.name === "subscription.create")?.data.durationMonths, 6);
    assert.equal(h.writes.find((w) => w.name === "invoice.update")?.data.paymentStatus, "PAID");
    assert.equal(h.writes.find((w) => w.name === "receipt.create")?.data.paymentId, "payment-1");
    assert.equal(h.writes.find((w) => w.name === "auditLog.create")?.data.metadata.subscriptionId, "subscription-created-1");
    assert.equal(h.events.find((e) => e.name === "subscription.findUnique")?.data.where.id, "subscription-created-1");
    assert.equal(h.events.some((e) => e.name === "notification.sent"), true);
  }

  // Invalid plan must abort the transaction before it can commit any settlement.
  {
    const h = makeHarness({ carePlan: null, legacyPlan: null });
    await rejectsWith(
      adminVerifyPayment("payment-1", "admin-1", h.dependencies),
      /valid care plan/
    );
    assert.equal(h.committed(), false);
    assert.equal(h.writes.some((w) => w.name === "subscription.create"), false);
    assert.equal(h.writes.some((w) => w.name === "auditLog.create"), false);
  }

  // A concurrent verification losing the conditional payment update must abort.
  {
    const h = makeHarness({ updateCount: 0 });
    await rejectsWith(
      adminVerifyPayment("payment-1", "admin-1", h.dependencies),
      /already been processed/
    );
    assert.equal(h.committed(), false);
    assert.equal(h.writes.some((w) => w.name === "receipt.create"), false);
  }

  // A renewal creates the requested lifecycle state and completes its renewal request.
  {
    const renewalRequest = {
      id: "renewal-1",
      userId: "user-1",
      carePlanId: "care-plan-1",
      variantType: "SINGLE",
      durationMonths: 3,
      requestedStartDate: new Date("2026-12-01T00:00:00.000Z"),
      calculatedEndDate: new Date("2027-03-01T00:00:00.000Z"),
      currentSubscriptionId: "old-subscription",
      addOns: [{ addOnId: "addon-1" }],
      carePlan: { name: "Renewal Plan" },
    };
    const h = makeHarness({ renewalRequest });
    await adminVerifyPayment("payment-1", "admin-1", h.dependencies);
    assert.equal(h.committed(), true);
    assert.equal(h.writes.find((w) => w.name === "subscription.create")?.data.status, "SCHEDULED");
    assert.equal(h.writes.find((w) => w.name === "subscriptionAddOn.createMany")?.data[0].addOnId, "addon-1");
    assert.equal(h.writes.find((w) => w.name === "renewalRequest.update")?.data.status, "COMPLETED");
    assert.equal(h.writes.some((w) => w.name === "subscription.update"), false);
  }

  console.log("PASS: onboarding settlement creates a subscription and receipt");
  console.log("PASS: unresolved plan aborts settlement transaction");
  console.log("PASS: duplicate/concurrent verification aborts settlement transaction");
  console.log("PASS: future renewal creates scheduled subscription and completes request");
  console.log("All admin payment verification service tests passed.");
}

runTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
