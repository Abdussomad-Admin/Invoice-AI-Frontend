import test from "node:test";
import assert from "node:assert/strict";
import { buildCreditReadiness } from "./creditReadiness.js";

test("credit readiness shows evidence gaps and a useful next action without assigning a score", () => {
  const readiness = buildCreditReadiness({ coverage: { items: [
    { label: "Sales invoices", status: "Recorded", detail: "3 invoices saved." },
    { label: "Payment records", status: "No records", detail: "No payments saved." }
  ] } });

  assert.equal(readiness.recorded, 1);
  assert.equal(readiness.total, 2);
  assert.equal(readiness.nextStep.action.path, "/app/payments");
  assert.equal(readiness.items[0].action, null);
});

test("credit readiness prioritises unresolved bank review over missing records", () => {
  const readiness = buildCreditReadiness({ coverage: { items: [
    { label: "Business contact details", status: "Not added", detail: "Add contact details." },
    { label: "Bank statement review", status: "Review needed", detail: "One line is unresolved." }
  ] } });

  assert.equal(readiness.nextStep.label, "Bank statement review");
  assert.equal(readiness.nextStep.action.path, "/app/bank-reconciliation");
});

test("credit readiness handles unavailable checklist data", () => {
  const readiness = buildCreditReadiness(null);
  assert.equal(readiness.recorded, 0);
  assert.equal(readiness.total, 0);
  assert.equal(readiness.nextStep, undefined);
  assert.match(readiness.summary, /not available/i);
});
