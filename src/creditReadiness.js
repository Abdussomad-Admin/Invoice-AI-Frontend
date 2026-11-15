const ACTIONS = {
  "Business contact details": { label: "Add business details", path: "/app/organization-setup" },
  "Sales invoices": { label: "Create an invoice", path: "/app/invoice-new" },
  "Supplier bills": { label: "Review supplier bills", path: "/app/supplier-invoices" },
  "Payment records": { label: "Review payments", path: "/app/payments" },
  "Bank statement review": { label: "Import a bank statement", path: "/app/bank-import" }
};

export function buildCreditReadiness(data) {
  const items = (data?.coverage?.items ?? []).map(item => {
    const complete = item.status === "Recorded" || item.status === "Reviewed";
    return {
      ...item,
      complete,
      action: complete ? null : item.label === "Bank statement review" && item.status === "Review needed"
        ? { label: "Match bank transactions", path: "/app/bank-reconciliation" }
        : ACTIONS[item.label] ?? null
    };
  });
  const recorded = items.filter(item => item.complete).length;
  const needsAttention = items.find(item => item.status === "Review needed");
  const nextStep = needsAttention ?? items.find(item => !item.complete);

  return {
    items,
    recorded,
    total: items.length,
    nextStep,
    summary: items.length === 0
      ? "Your record checklist is not available yet. Refresh to try again."
      : nextStep
        ? "Add or review the records below to keep your business information organised."
        : "The listed record areas have information saved in this workspace."
  };
}
