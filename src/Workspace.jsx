import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownLeft, ArrowLeft, ArrowRight, ArrowUpRight, Bell, Bot, Building2, CalendarDays, ChartNoAxesCombined, CheckCircle2, ChevronDown, CircleDollarSign, CircleHelp, Clock3, CreditCard, FileText, Home, Landmark, LayoutDashboard, LogOut, Menu, Plus, RefreshCw, Repeat, Search, Settings, Share2, Shield, Sparkles, Upload, Users, WalletCards, X, Zap } from "lucide-react";
import { api, apiBlob, clearSession, friendlyErrorMessage } from "./api";
import { buildCreditReadiness } from "./creditReadiness";
import { askFirebaseAssistant, extractSupplierBillWithFirebase } from "./firebaseAssistant";
import Toast from "./Toast";
import RecurringInvoices from "./RecurringInvoices";
import WorkspaceTour, { TOUR_KEY } from "./WorkspaceTour";
import { askOnDevice, firebaseOnDeviceConfigured, preloadOnDeviceSdk } from "./firebaseOnDeviceAssistant";
import "./workspace.css";
import "./dashboard-overrides.css";
import "./modal.css";

const groups = [
  ["Home", [["/app", "Dashboard", LayoutDashboard], ["/app/financial-health", "Financial health", ChartNoAxesCombined], ["/app/financial-guidance", "Learn & stay safe", Shield]]],
  ["Sales", [["/app/invoices", "Invoices", FileText], ["/app/invoice-new", "Create invoice", Plus], ["/app/recurring-invoices", "Recurring invoices", Repeat], ["/app/invoice-detail", "Find an invoice", FileText], ["/app/invoice-preview", "View invoice PDF", FileText], ["/app/customers", "Customers", Users]]],
  ["Bills & expenses", [["/app/supplier-invoices", "Supplier bills", FileText], ["/app/upload-supplier-invoice", "Upload a bill", Upload], ["/app/suppliers", "Suppliers", Building2], ["/app/extraction-review", "Review scanned bill", Bot]]],
  ["Payments & bank", [["/app/payments", "Money received & paid", CreditCard], ["/app/payment-account", "Get paid online", WalletCards], ["/app/bank-import", "Upload bank statement", Upload], ["/app/bank-reconciliation", "Match bank transactions", RefreshCw]]],
  ["Reports", [["/app/reports", "Reports", ChartNoAxesCombined], ["/app/credit-readiness", "Credit readiness", Shield], ["/app/financial-records", "Financial records", FileText], ["/app/insights", "Compare results", Sparkles], ["/app/assistant", "Ask Invoice AI", Bot]]],
  ["Business setup · optional", [["/app/organization", "Business details", Building2], ["/app/organization-setup", "Set up business details", Building2], ["/app/team", "Team access · optional", Users], ["/app/invitations", "Invite a teammate · optional", Plus]]],
  ["Account", [["/app/billing", "Plans & subscription", CreditCard], ["/app/billing-history", "Billing details", CreditCard], ["/app/notifications", "Notifications", Bell], ["/app/profile", "My profile", Users], ["/app/security", "Password & security", Shield], ["/app/preferences", "Notification settings", Settings], ["/app/help", "Help & support", CircleHelp]]]
];
const pages = {
  "/app": ["Dashboard", "/api/reports/financial-summary"], "/app/financial-health": ["Financial health", "/api/reports/financial-summary"], "/app/financial-records": ["Financial records", null], "/app/credit-readiness": ["Credit readiness", null], "/app/financial-guidance": ["Learn & stay safe", null], "/app/onboarding": ["Set up your workspace", "/api/organization"], "/app/invoices": ["Invoices", "/api/invoices"],
  "/app/customers": ["Customers", "/api/customers"], "/app/suppliers": ["Suppliers", "/api/suppliers"],
  "/app/supplier-invoices": ["Supplier invoice records", "/api/supplier-bills"], "/app/payments": ["Payments", "/api/payments"],
  "/app/reports": ["Financial reports", "/api/reports/financial-summary"], "/app/assistant": ["Ask Invoice AI", "/api/assistant/tools"],
  "/app/insights": ["Business insights", "/api/reports/year-comparison"], "/app/organization": ["Business details", "/api/organization"],
  "/app/team": ["Team members", "/api/members"], "/app/invitations": ["Invitations", "/api/invitations"],
  "/app/billing": ["Plans", "/api/billing/plans"], "/app/notifications": ["Alerts", "/api/invoices?overdue=true&pageSize=100"],
  "/app/profile": ["My profile", "/api/profile"], "/app/security": ["Account & security", null],
  "/app/preferences": ["Notification preferences", null], "/app/help": ["Help & support", null],
  "/app/bank-reconciliation": ["Match bank transactions", null], "/app/bank-import": ["Upload a bank statement", null],
  "/app/invoice-new": ["Create invoice", "/api/customers"], "/app/invoice-detail": ["Invoice details", "/api/invoices"],
  "/app/invoice-preview": ["Invoice PDF preview", "/api/invoices"], "/app/upload-supplier-invoice": ["Upload supplier invoice", null],
  "/app/recurring-invoices": ["Recurring invoices", "/api/recurring-invoices"],
  "/app/extraction-review": ["AI extraction review", "/api/supplier-documents"], "/app/billing-history": ["Billing history", "/api/billing/history"], "/app/billing/return": ["Payment confirmation", null],
  "/app/organization-setup": ["Set up your business", "/api/organization"], "/app/payment-account": ["Get paid online", "/api/payment-accounts/paystack"], "/app/payments": ["Money received & paid", "/api/payments"]
};
const tablePages = ["/app/invoices", "/app/customers", "/app/suppliers", "/app/supplier-invoices", "/app/payments", "/app/invoice-detail", "/app/invoice-new", "/app/extraction-review"];
const pageDescriptions = {
  "/app/onboarding": "Add the business details you want to use on invoices, then choose your workspace preferences.",
  "/app": "See your income, expenses and payments in one place.",
  "/app/financial-health": "Understand recorded income, costs, cash flow and the balances still due.",
  "/app/financial-records": "Review and download a clear summary of the financial records saved in this workspace.",
  "/app/credit-readiness": "Organise the business records a lender may ask to review. You stay in control of what you share.",
  "/app/financial-guidance": "Simple explanations for everyday business money and safer payments.",
  "/app/invoices": "Create invoices, check their status and follow up on unpaid balances.",
  "/app/invoice-new": "Create a sales invoice for one of your customers.",
  "/app/invoice-detail": "Choose an invoice to review its items, balance and payment history.",
  "/app/invoice-preview": "Choose an invoice to view its printable PDF.",
  "/app/recurring-invoices": "Set up regular invoices. Each scheduled invoice is created as a draft for you to review and send.",
  "/app/customers": "Keep customer contact details in one place for faster invoicing.",
  "/app/suppliers": "Save supplier details so you can track bills and payments.",
  "/app/supplier-invoices": "Review supplier bills and see what is still owed.",
  "/app/upload-supplier-invoice": "Upload a supplier bill and let AI fill in the details for you.",
  "/app/extraction-review": "Check the details AI found before creating a supplier bill.",
  "/app/payments": "Review money received from customers and paid to suppliers.",
  "/app/bank-import": "Upload a statement from your bank to compare deposits and withdrawals with payments in Invoice AI.",
  "/app/bank-reconciliation": "Compare bank statement lines with customer and supplier payments you recorded.",
  "/app/reports": "Review income, expenses, unpaid invoices and cash flow over time.",
  "/app/assistant": "Ask a question about the financial information in your workspace.",
  "/app/insights": "Compare this year’s results with the previous year.",
  "/app/organization-setup": "Add business details if you want them to appear on your invoices. You can use Invoice AI without filling this in.",
  "/app/organization": "Add or update business details for your invoices. Freelancers can leave this blank.",
  "/app/team": "You can use Invoice AI on your own. Add teammates here if you work with others.",
  "/app/invitations": "Invite someone to help manage invoices. You can skip this if you work alone.",
  "/app/billing": "Compare plans and choose the one that fits your business.",
  "/app/billing-history": "Check your current plan and the next billing date.",
  "/app/notifications": "See invoices that are past their due date.",
  "/app/profile": "Update the name and email used for your personal account.",
  "/app/security": "Change your password to keep your account secure.",
  "/app/preferences": "Choose which reminders and updates appear in your workspace.",
  "/app/help": "Find a quick answer or contact the Invoice AI support team."
  ,"/app/payment-account": "Choose your bank and account so Paystack can send your customer invoice payments to the right place."
};
const titles = { id: "ID", name: "Name", customerName: "Customer", supplierName: "Supplier", number: "Invoice #", email: "Email", phone: "Phone", status: "Status", total: "Total", balance: "Balance", amountPaid: "Paid", dueDate: "Due date", createdAt: "Created", code: "Plan code", description: "Description", currencyCode: "Currency", amountMinor: "Monthly price (minor units)", invoiceLimit: "Invoices / month", memberLimit: "Team seats", aiExtractionLimit: "AI extractions / month", isArchived: "Archived", role: "Role", fullName: "Full name", organizationName: "Organization", currentPeriodEnd: "Period ends" };
const asList = x => Array.isArray(x) ? x : x?.items || x?.data || (x && typeof x === "object" ? [x] : []);
const pretty = x => x == null ? "—" : typeof x === "object" ? (x.name || x.label || JSON.stringify(x)) : String(x);

function Table({ data, onEdit, onView, onArchive, onViewLabel = "View details", emptyMessage = "No records to show yet.", variant, currencyCode = "NGN" }) {
  const rows = asList(data);
  if (!rows.length) return <div className="ws-empty"><span className="ws-empty-icon"><FileText/></span><b>{emptyMessage}</b><small>When you add a record, it will appear here.</small></div>;
  const keys = variant === "invoice-lines" ? ["position", "description", "quantity", "unitPrice", "discountPercent", "taxRatePercent", "lineSubtotal"] : variant === "invoice-payments" ? ["paidOn", "method", "reference", "amount", "isReversed"] : variant === "financial-monthly"
    ? ["month", "income", "expenses", "estimatedProfit", "cashReceived", "cashPaidOut", "netCashFlow"]
    : variant === "expense-monthly"
      ? ["month", "netBilled", "tax", "grossBilled", "paid"]
      : variant === "aging-buckets"
        ? ["label", "invoiceCount", "balance"]
        : variant === "aging-entities"
          ? [rows[0].customerName != null ? "customerName" : "supplierName", "current", "days1To30", "days31To60", "days61To90", "over90", "total"]
          : variant === "top-suppliers"
            ? ["supplierName", "netBilled", "billCount"]
            : variant === "customers"
    ? ["name", "email", "phone", "createdAt"]
    : variant === "payments"
      ? ["paidOn", "paymentType", "reference", "amount", "method", "isReversed"]
    : Object.keys(rows[0]).filter(k => !["lines", "notes", "addressLine1", "addressLine2", "taxIdentificationNumber", "postalCode", "countryCode", "region", "city"].includes(k)).slice(0, 7);
  const display = (row, key) => {
    if (["financial-monthly", "expense-monthly", "aging-buckets", "aging-entities", "top-suppliers"].includes(variant)) {
      if (["invoiceCount", "billCount"].includes(key)) return Number(row[key] || 0).toLocaleString();
      if (key !== "month" && key !== "label" && key !== "customerName" && key !== "supplierName") return formatMoney(row[key], currencyCode);
      return pretty(row[key]);
    }
    if (variant === "invoice-lines") {
      if (key === "position") return row.position ?? row.lineNumber ?? "—";
      if (["unitPrice", "lineSubtotal"].includes(key)) return formatMoney(row[key], currencyCode);
      if (["discountPercent", "taxRatePercent"].includes(key)) return `${Number(row[key] || 0)}%`;
      return pretty(row[key]);
    }
    if (variant === "invoice-payments") {
      if (key === "amount") return formatMoney(row.amount, row.currencyCode || currencyCode);
      if (key === "isReversed") return row.isReversed ? "Reversed" : "Received";
      if (key === "method") return String(row.method || "—").replace(/([a-z])([A-Z])/g, "$1 $2");
      if (key === "reference") return row.reference || "—";
      if (key === "paidOn") return row.paidOn ? new Date(row.paidOn).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";
    }
    if (["createdAt", "paidOn"].includes(key)) return row[key] ? new Date(row[key]).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";
    if (key === "paymentType") return row[key] === "Sales" ? `Customer payment · ${row.invoiceNumber || "Invoice"}` : `Supplier payment · ${row.billNumber || "Bill"}`;
    if (key === "reference") return row.reference || "—";
    if (key === "amount") return `${row.currencyCode || ""} ${Number(row.amount || 0).toLocaleString()}`.trim();
    if (key === "isReversed") return row.isReversed ? "Reversed" : "Completed";
    if (key === "method") return String(row.method || "—").replace(/([a-z])([A-Z])/g, "$1 $2");
    return pretty(row[key]);
  };
  const invoiceLineTitles = {position:"#",description:"Description",quantity:"Qty",unitPrice:"Unit price",discountPercent:"Discount",taxRatePercent:"Tax",lineSubtotal:"Line total"};
  const reportTitles = {income:"Income",expenses:"Expenses",estimatedProfit:"Estimated profit",cashReceived:"Cash received",cashPaidOut:"Cash paid out",netCashFlow:"Net cash flow",month:"Month",netBilled:"Net billed",tax:"Tax",grossBilled:"Gross billed",paid:"Paid",label:"Due date",invoiceCount:"Invoices",billCount:"Bills",balance:"Balance",customerName:"Customer",supplierName:"Supplier",current:"Current",days1To30:"1–30 days",days31To60:"31–60 days",days61To90:"61–90 days",over90:"Over 90 days",total:"Total"};
  return <div className={`ws-table-wrap${variant ? ` ws-table-${variant}` : ""}`}><table><thead><tr>{keys.map(k => <th key={k}>{variant === "invoice-lines" ? invoiceLineTitles[k] : variant === "invoice-payments" ? ({paidOn:"Date received",method:"Method",reference:"Reference",amount:"Amount received",isReversed:"Status"}[k]) : variant === "payments" ? ({paidOn:"Date",paymentType:"Payment",reference:"Reference",amount:"Amount",currencyCode:"Currency",method:"Method",isReversed:"Status"}[k]) : reportTitles[k] || titles[k] || k.replace(/[A-Z]/g, m => ` ${m}`).replace(/^./, m => m.toUpperCase())}</th>)}{(onEdit||onView||onArchive)&&<th>Actions</th>}</tr></thead><tbody>{rows.map((row, i) => <tr key={row.id || i}>{keys.map(k => <td key={k}>{k === "email" && row[k] ? <a className="ws-table-email" href={`mailto:${row[k]}`}>{display(row,k)}</a> : display(row,k)}</td>)}{(onEdit||onView||onArchive)&&<td><div className="ws-row-actions">{onView&&<button className="ws-row-action" onClick={()=>onView(row)}>{onViewLabel}</button>}{onEdit&&<button className="ws-row-action" onClick={()=>onEdit(row)}>Edit</button>}{onArchive&&<button className="ws-row-action subtle" onClick={()=>onArchive(row)}>{row.isArchived?"Restore":"Archive"}</button>}</div></td>}</tr>)}</tbody></table></div>;
}
function RecordForm({ kind, onDone, onCancel, initial = {} }) {
  const customer = kind === "customer", supplier = kind === "supplier", invite = kind === "invite", invoice = kind === "invoice", bill = kind === "bill";
  const draftKey = `invoice-ai-invoice-draft:${sessionStorage.getItem("invoice-ai-organization") || "default"}`;
  const [offlineDraft] = useState(() => {
    if (!invoice || initial.id) return {};
    try { return JSON.parse(sessionStorage.getItem(draftKey) || "{}"); } catch { return {}; }
  });
  const formInitial = invoice && !initial.id ? { ...initial, ...offlineDraft, lines: [{ ...(initial.lines?.[0] || {}), ...(offlineDraft.line || {}) }] } : initial;
  const [invoiceCurrency, setInvoiceCurrency] = useState(formInitial.currencyCode || "NGN");
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [draftSaved, setDraftSaved] = useState(Boolean(offlineDraft.savedAt));
  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", update); window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
  const [baseCurrency, setBaseCurrency] = useState(initial.baseCurrencyCode || "NGN");
  const [suppliers, setSuppliers] = useState([]);
  const [countryCode, setCountryCode] = useState(() => {
    const value = String(initial.countryCode || "").trim();
    return value.toUpperCase() === "NIGERIA" ? "NG" : value.slice(0, 2).toUpperCase();
  });
  useEffect(() => { if (invoice || bill) api("/api/organization").then(o => { const code = o.baseCurrencyCode || "NGN"; setBaseCurrency(code); if (!initial.id && !offlineDraft.currencyCode) setInvoiceCurrency(code); }).catch(() => {}); if (bill) api("/api/suppliers").then(r => setSuppliers(asList(r).filter(s => !s.isArchived))).catch(() => {}); }, [invoice, bill, initial.id, offlineDraft.currencyCode]);
  const fields = customer || supplier ? [["name", "Name", "text", true], ["email", "Email", "email"], ["phone", "Phone", "tel"], ["taxIdentificationNumber", "Tax ID"], ["addressLine1", "Address line 1"], ["addressLine2", "Address line 2"], ["city", "City"], ["region", "State / region"], ["postalCode", "Postal code"], ["countryCode", "Country code"], ["notes", "Notes"]] : invite ? [["email", "Email", "email", true], ["role", "Role", "select", true]] : invoice ? [["customerId", "Customer", "select", true], ["paymentTermsDays", "Payment terms (days)", "number"]] : bill ? [["supplierId", "Supplier", "select", true], ["number", "Bill number", "text", true], ["billDate", "Bill date", "date", true], ["dueDate", "Due date", "date"], ["notes", "Notes"]] : kind === "profile" ? [["fullName", "Full name", "text", true]] : [["name", "Business name", "text", true], ["email", "Contact email", "email"], ["phone", "Phone", "tel"], ["taxIdentificationNumber", "Tax ID"], ["addressLine1", "Address line 1"], ["addressLine2", "Address line 2"], ["city", "City"], ["region", "State / region"], ["postalCode", "Postal code"], ["defaultPaymentTermsDays", "Default payment terms (days)", "number"]];
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  function saveInvoiceDraft(form) {
    if (!invoice || initial.id) return;
    const values = Object.fromEntries(new FormData(form).entries());
    try {
      sessionStorage.setItem(draftKey, JSON.stringify({ ...values, currencyCode: values.currencyCode || invoiceCurrency, line: { description: values.description, quantity: values.quantity, unitPrice: values.unitPrice, discountPercent: values.discountPercent, taxRatePercent: values.taxRatePercent }, savedAt: new Date().toISOString() }));
      setDraftSaved(true);
    } catch { setError("This browser tab could not save your invoice draft. Keep this page open while offline."); }
  }
  async function submit(e) {
    e.preventDefault(); setError("");
    if (invoice && !initial.id && !navigator.onLine) { saveInvoiceDraft(e.currentTarget); setError("You’re offline. Your invoice is saved in this browser tab and has not been sent. Reconnect, then select Save to add it to Invoice AI."); return; }
    setBusy(true); const f = new FormData(e.currentTarget); const body = Object.fromEntries(f.entries());
    try {
      if (customer) await api(initial.id ? `/api/customers/${initial.id}` : "/api/customers", { method: initial.id ? "PUT" : "POST", body: { ...body, countryCode: countryCode || null, taxIdentificationNumber: body.taxIdentificationNumber || null, addressLine2: body.addressLine2 || null, region: body.region || null, postalCode: body.postalCode || null, notes: body.notes || null } });
      else if (supplier) await api(initial.id ? `/api/suppliers/${initial.id}` : "/api/suppliers", { method: initial.id ? "PUT" : "POST", body: { ...body, countryCode: countryCode || null, taxIdentificationNumber: body.taxIdentificationNumber || null, addressLine2: body.addressLine2 || null, region: body.region || null, postalCode: body.postalCode || null, notes: body.notes || null, defaultPaymentTermsDays: Number(body.defaultPaymentTermsDays) || initial.defaultPaymentTermsDays || 30 } });
      else if (invite) await api("/api/invitations", { method: "POST", body: { email: body.email, role: body.role } });
      else if (invoice) await api(initial.id ? `/api/invoices/${initial.id}` : "/api/invoices", { method: initial.id ? "PUT" : "POST", body: { customerId: body.customerId, paymentTermsDays: Number(body.paymentTermsDays) || 30, notes: body.notes || null, currencyCode: body.currencyCode, exchangeRateToBase: body.currencyCode === baseCurrency ? 1 : Number(body.exchangeRateToBase), lines: [{ description: body.description || "Services", quantity: Number(body.quantity) || 1, unitPrice: Number(body.unitPrice) || 0, discountPercent: Number(body.discountPercent) || 0, taxRatePercent: Number(body.taxRatePercent) || 0 }] } });
      else if (bill) await api("/api/supplier-bills", { method: "POST", body: { supplierId: body.supplierId, number: body.number, billDate: body.billDate, dueDate: body.dueDate || null, notes: body.notes || null, currencyCode: body.currencyCode, exchangeRateToBase: body.currencyCode === baseCurrency ? 1 : Number(body.exchangeRateToBase), lines: [{ description: body.description, quantity: Number(body.quantity) || 1, unitPrice: Number(body.unitPrice) || 0, discountPercent: Number(body.discountPercent) || 0, taxRatePercent: Number(body.taxRatePercent) || 0 }] } });
      else if (kind === "profile") await api("/api/profile", { method: "PUT", body: { fullName: body.fullName } });
      else await api("/api/organization", { method: "PUT", body: { ...initial, ...body, defaultPaymentTermsDays: Number(body.defaultPaymentTermsDays) || 30 } });
      if (invoice && !initial.id) { try { sessionStorage.removeItem(draftKey); } catch {} }
      onDone();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <form className="ws-form" onSubmit={submit} onChange={e => saveInvoiceDraft(e.currentTarget)}>{invoice && !initial.id && !isOnline && <div className="ws-offline-draft" role="status"><b>You’re offline</b><span>Your invoice stays in this browser tab. It won’t be added to your workspace until you reconnect and press Save.</span></div>}{invoice && !initial.id && draftSaved && isOnline && <div className="ws-offline-draft restored" role="status"><b>Draft restored from this tab</b><span>Review the details, then press Save to add this invoice to your workspace.</span></div>}<div className="ws-form-grid">{fields.map(([key, label, type = "text", required]) => <label key={key}>{label}{type === "select" && invite ? <select name={key} required={required}><option value="">Select role</option><option value="Staff">Staff</option><option value="Accountant">Accountant</option><option value="Admin">Admin</option></select> : bill && key === "supplierId" ? <select name={key} required defaultValue={initial.supplierId || ""}><option value="">Choose a supplier</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select> : invoice && key === "customerId" ? <select name={key} required defaultValue={formInitial.customerId || ""}><option value="">Choose a customer</option>{formInitial.customerId && !asList(initial.customers || initial).some(customer => customer.id === formInitial.customerId) && <option value={formInitial.customerId}>Previously selected customer</option>}{asList(initial.customers || initial).map(customer=><option key={customer.id} value={customer.id}>{customer.name} · {customer.email||"no email"}</option>)}</select> : (customer || supplier) && key === "countryCode" ? <><input name={key} value={countryCode} onChange={e=>setCountryCode(e.target.value.replace(/[^a-z]/gi, "").slice(0, 2).toUpperCase())} placeholder="NG" autoComplete="country" maxLength={2} aria-describedby="country-code-help"/><small id="country-code-help">Enter the 2-letter country code (Nigeria is NG).</small></> : <input name={key} type={type} required={required} defaultValue={formInitial[key] ?? (bill && key === "billDate" ? new Date().toISOString().slice(0,10) : "")} />}</label>)}{(invoice || bill) && <><label>{bill ? "Bill currency" : "Invoice currency"}<input name="currencyCode" value={invoiceCurrency} onChange={e=>setInvoiceCurrency(e.target.value.toUpperCase())} maxLength="3" required/><small>Workspace reporting currency: {baseCurrency}</small></label>{invoiceCurrency !== baseCurrency && <label>Exchange rate to {baseCurrency}<input name="exchangeRateToBase" type="number" min="0.00000001" step="0.00000001" defaultValue={formInitial.exchangeRateToBase ?? ""} required/><small>For each 1 {invoiceCurrency}, enter its value in {baseCurrency}. Saved with the record.</small></label>}<label>Description<input name="description" defaultValue={formInitial.lines?.[0]?.description || ""} required /></label><label>Quantity<input name="quantity" type="number" min="0.01" step="0.01" defaultValue={formInitial.lines?.[0]?.quantity ?? "1"} required /></label><label>Unit price ({invoiceCurrency})<input name="unitPrice" type="number" min="0.01" step="0.01" defaultValue={formInitial.lines?.[0]?.unitPrice ?? ""} required /></label><label>Discount (%)<input name="discountPercent" type="number" min="0" max="100" step="0.01" defaultValue={formInitial.lines?.[0]?.discountPercent ?? "0"}/></label><label>Tax rate (%)<input name="taxRatePercent" type="number" min="0" max="100" step="0.01" defaultValue={formInitial.lines?.[0]?.taxRatePercent ?? "0"}/></label></>}</div>{error && <p className="ws-error">{error}</p>}<div className="ws-form-actions"><button type="button" className="ws-button secondary" onClick={onCancel}>Cancel</button><button className="ws-button primary" disabled={busy}>{busy ? "Saving…" : "Save"}</button></div></form>;
}

function TeamMembers({ members, onRefresh }) {
  const [error,setError]=useState("");
  return <div className="ws-table-wrap"><table><thead><tr><th>Member</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody>{asList(members).map(m=><tr key={m.userId}><td>{m.fullName}</td><td>{m.email}</td><td><select aria-label={`Role for ${m.fullName}`} value={m.role} onChange={async e=>{try{await api(`/api/members/${m.userId}/role`,{method:"PUT",body:{role:e.target.value}});onRefresh()}catch(x){setError(x.message)}}}><option value="Owner">Owner</option><option value="Admin">Admin</option><option value="Accountant">Accountant</option><option value="Staff">Staff</option></select></td><td>{m.isActive?"Active":"Inactive"}</td><td><button className="ws-text-button" onClick={async()=>{try{await api(`/api/members/${m.userId}/${m.isActive?"deactivate":"activate"}`,{method:"POST"});onRefresh()}catch(x){setError(x.message)}}}>{m.isActive?"Deactivate":"Activate"}</button></td></tr>)}</tbody></table>{error&&<p className="ws-error">{error}</p>}</div>;
}
function InvitationsList({ invitations, onRefresh }) {
 const [error,setError]=useState("");
 return <div className="ws-table-wrap"><table><thead><tr><th>Email</th><th>Role</th><th>Invited</th><th>Expires</th><th/></tr></thead><tbody>{asList(invitations).map(i=><tr key={i.id}><td>{i.email}</td><td>{i.role}</td><td>{new Date(i.createdAt).toLocaleDateString()}</td><td>{new Date(i.expiresAt).toLocaleDateString()}</td><td><button className="ws-text-button" onClick={async()=>{try{await api(`/api/invitations/${i.id}`,{method:"DELETE"});onRefresh()}catch(x){setError(x.message)}}}>Revoke</button></td></tr>)}</tbody></table>{error&&<p className="ws-error">{error}</p>}</div>;
}

function ExtractionApproval({ extraction, documentId, baseCurrencyCode, setBusy, onError, onSuccess }) {
  const numericValue = value => {
    if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
    const raw = String(value ?? "").trim();
    if (!raw) return NaN;
    const normalized = raw.replace(/,/g, "").replace(/[^\d.-]/g, "");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : NaN;
  };
  const numericInput = value => {
    const parsed = numericValue(value);
    return Number.isFinite(parsed) ? String(parsed) : "";
  };
  const [currencyCode, setCurrencyCode] = useState(extraction.data?.currencyCode || baseCurrencyCode);
  const [exchangeRate, setExchangeRate] = useState("");
  const bill = extraction.data;
  const [supplierName, setSupplierName] = useState(bill?.supplierName || "");
  const [supplierId, setSupplierId] = useState(extraction.matchedSupplierId || "");
  const [invoiceNumber, setInvoiceNumber] = useState(bill?.invoiceNumber || bill?.reference || "");
  const [invoiceDate, setInvoiceDate] = useState(bill?.invoiceDate || "");
  const [dueDate, setDueDate] = useState(bill?.dueDate || "");
  const [suppliers, setSuppliers] = useState([]);
  const [lines, setLines] = useState(() => (bill?.lines?.length ? bill.lines.map(line => ({ ...line, quantity: numericInput(line.quantity), unitPrice: numericInput(line.unitPrice) })) : [{ description: "Items from supplier invoice", quantity: 1, unitPrice: numericInput(bill?.total), discountPercent: 0, taxRatePercent: 0 }]));
  const [printedTotal, setPrintedTotal] = useState(numericInput(bill?.total));
  useEffect(() => { let active = true; api("/api/suppliers").then(result => { if (active) setSuppliers(asList(result).filter(supplier => !supplier.isArchived)); }).catch(() => {}); return () => { active = false; }; }, []);
  useEffect(() => {
    setCurrencyCode(extraction.data?.currencyCode || baseCurrencyCode);
    setExchangeRate("");
    setSupplierName(extraction.data?.supplierName || "");
    setSupplierId(extraction.matchedSupplierId || "");
    setInvoiceNumber(extraction.data?.invoiceNumber || extraction.data?.reference || "");
    setInvoiceDate(extraction.data?.invoiceDate || "");
    setDueDate(extraction.data?.dueDate || "");
    setLines(extraction.data?.lines?.length ? extraction.data.lines.map(line => ({ ...line, quantity: numericInput(line.quantity), unitPrice: numericInput(line.unitPrice) })) : [{ description: "Items from supplier invoice", quantity: 1, unitPrice: numericInput(extraction.data?.total), discountPercent: 0, taxRatePercent: 0 }]);
    setPrintedTotal(numericInput(extraction.data?.total));
  }, [extraction, baseCurrencyCode]);
  const approvalIssues = [];
  if (!supplierName.trim()) approvalIssues.push("Enter the supplier or person paid.");
  if (!invoiceDate) approvalIssues.push("Enter the invoice or payment date.");
  if (!invoiceNumber.trim()) approvalIssues.push("Enter the invoice or transaction reference.");
  if (!lines.length) approvalIssues.push("Add at least one item.");
  else lines.forEach((line, index) => {
    if (!line.description?.trim()) approvalIssues.push(`Add a description for item ${index + 1}.`);
    if (!(numericValue(line.quantity) > 0)) approvalIssues.push(`Enter a quantity greater than zero for item ${index + 1}.`);
    if (!(numericValue(line.unitPrice) > 0)) approvalIssues.push(`Enter an amount greater than zero for item ${index + 1}.`);
  });
  if (!currencyCode.trim()) approvalIssues.push("Enter the bill currency.");
  if (currencyCode !== baseCurrencyCode && !(numericValue(exchangeRate) > 0)) approvalIssues.push(`Enter the exchange rate to ${baseCurrencyCode}.`);
  const canApprove = approvalIssues.length === 0;
  const updateLine = (index, field, value) => setLines(current => current.map((line, i) => i === index ? { ...line, [field]: value } : line));
  return <div className="ws-extraction-approval">
    <div className="ws-extraction-notice"><b>Check the details before saving.</b> AI can mistake a bank or payment app for the supplier. Make sure the supplier name and invoice reference match the bill.</div>
    {!bill?.lines?.length && <div className="ws-extraction-notice"><b>Line items weren’t detected.</b> We filled one item using the invoice total. Check the description and amount before saving.</div>}
    <div className="ws-extraction-identity"><label>Supplier / person paid<input value={supplierName} onChange={e => { setSupplierName(e.target.value); setSupplierId(""); }} placeholder="Name under Recipient Details" required/><small>On a payment receipt, use the name under Recipient or Paid to. OPay is the payment app, not the supplier.</small></label><label>Choose a saved supplier (optional)<select value={supplierId} onChange={e => { const id = e.target.value; setSupplierId(id); if (id) setSupplierName(suppliers.find(supplier => supplier.id === id)?.name || supplierName); }}><option value="">Use the name above</option>{suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label><label>Invoice / transaction reference<input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="Invoice No. or Transaction No." required/><small>For this receipt, use the Transaction No. shown on it.</small></label><label>Invoice / payment date<input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} required/></label><label>Due date (if shown)<input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></label></div>
    <div className="ws-extraction-lines"><div className="ws-card-title"><div><h3>Review bill items</h3><p className="ws-muted">Confirm what this supplier charged you. You can edit or add items.</p></div><button type="button" className="ws-button secondary" onClick={() => setLines(current => [...current, { description: "", quantity: 1, unitPrice: "", discountPercent: 0, taxRatePercent: 0 }])}>Add item</button></div>
      {lines.map((line, index) => <div className="ws-extraction-line" key={index}><label>Description<input value={line.description || ""} onChange={e => updateLine(index, "description", e.target.value)} placeholder="What did you buy?" /></label><label>Quantity<input type="number" min="0.01" step="0.01" value={line.quantity ?? 1} onChange={e => updateLine(index, "quantity", e.target.value)} /></label><label>Unit price ({currencyCode})<input type="number" min="0" step="0.01" value={line.unitPrice ?? ""} onChange={e => updateLine(index, "unitPrice", e.target.value)} /></label><label>Discount %<input type="number" min="0" max="100" step="0.01" value={line.discountPercent ?? 0} onChange={e => updateLine(index, "discountPercent", e.target.value)} /></label><label>Tax %<input type="number" min="0" max="100" step="0.01" value={line.taxRatePercent ?? 0} onChange={e => updateLine(index, "taxRatePercent", e.target.value)} /></label>{lines.length > 1 && <button type="button" className="ws-text-button" onClick={() => setLines(current => current.filter((_, i) => i !== index))}>Remove</button>}</div>)}
    </div>
    <div className="ws-form-grid ws-extraction-settings"><label>Invoice total ({currencyCode})<input type="number" min="0" step="0.01" value={printedTotal} onChange={e => setPrintedTotal(e.target.value)} /><small>This should match the amount printed on the supplier invoice.</small></label><label>Bill currency<input value={currencyCode} maxLength={3} onChange={e=>setCurrencyCode(e.target.value.toUpperCase())} required/><small>Workspace reporting currency: {baseCurrencyCode}.</small></label>{currencyCode!==baseCurrencyCode&&<label>Exchange rate to {baseCurrencyCode}<input type="number" min="0.00000001" step="0.00000001" value={exchangeRate} onChange={e=>setExchangeRate(e.target.value)} required/><small>For each 1 {currencyCode}, enter its value in {baseCurrencyCode}.</small></label>}</div>
    {!canApprove && <div className="ws-extraction-notice" role="status"><b>Complete these details to create the draft:</b><ul>{approvalIssues.map(issue => <li key={issue}>{issue}</li>)}</ul></div>}
    <button className="ws-button primary" disabled={!canApprove} onClick={async()=>{setBusy(true);onError("");try{await api(`/api/supplier-documents/${documentId.trim()}/approve`,{method:"POST",body:{supplierId:supplierId||null,newSupplier:supplierId?null:{name:supplierName.trim(),taxIdentificationNumber:bill.supplierTaxId||null,email:null,phone:null,defaultPaymentTermsDays:30},number:invoiceNumber.trim(),billDate:invoiceDate,dueDate:dueDate||null,notes:"Created from AI reviewed supplier invoice",lines:lines.map(line=>({description:line.description.trim(),quantity:numericValue(line.quantity),unitPrice:numericValue(line.unitPrice),discountPercent:Number(line.discountPercent)||0,taxRatePercent:Number(line.taxRatePercent)||0})),printedTotal:printedTotal===""?null:numericValue(printedTotal),confirmCurrencyIsBase:false,currencyCode,exchangeRateToBase:currencyCode===baseCurrencyCode?1:numericValue(exchangeRate)}});onSuccess();}catch(e){onError(e.message)}finally{setBusy(false)}}}>Create draft supplier bill</button>
  </div>;
}

function DraftBillCorrection({ bill, setBusy, onError, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [supplierId, setSupplierId] = useState(bill.supplierId);
  const [createSupplier, setCreateSupplier] = useState(false);
  const [supplierName, setSupplierName] = useState(bill.supplierName || "");
  const [number, setNumber] = useState(bill.number);
  useEffect(() => { let active = true; api("/api/suppliers").then(result => { if (active) setSuppliers(asList(result).filter(supplier => !supplier.isArchived)); }).catch(() => {}); return () => { active = false; }; }, []);
  if (bill.status !== "Draft") return null;
  if (!editing) return <button className="ws-button secondary" onClick={() => setEditing(true)}>Correct supplier or reference</button>;
  return <form className="ws-payment-form ws-draft-bill-correction" onSubmit={async event => { event.preventDefault(); setBusy(true); onError(""); try { let selectedSupplierId = supplierId; if (createSupplier) { const created = await api("/api/suppliers", { method: "POST", body: { name: supplierName.trim(), email: null, phone: null, taxIdentificationNumber: null, addressLine1: null, addressLine2: null, city: null, region: null, postalCode: null, countryCode: null, notes: null, defaultPaymentTermsDays: 30 } }); selectedSupplierId = created.id; } const updated = await api(`/api/supplier-bills/${bill.id}`, { method: "PUT", body: { supplierId: selectedSupplierId, number: number.trim(), billDate: bill.billDate, dueDate: bill.dueDate, notes: bill.notes, currencyCode: bill.currencyCode, exchangeRateToBase: bill.exchangeRateToBase, lines: bill.lines.map(line => ({ description: line.description, quantity: line.quantity, unitPrice: line.unitPrice, discountPercent: line.discountPercent, taxRatePercent: line.taxRatePercent })) } }); setSupplierId(selectedSupplierId); setCreateSupplier(false); setNumber(updated.number); onSaved(updated); setEditing(false); } catch (error) { onError(error.message); } finally { setBusy(false); } }}><h3>Correct this draft bill</h3><p className="ws-muted">Change the supplier or invoice reference. The bill’s amounts and items will stay the same.</p><div className="ws-form-grid"><label>Supplier<select value={createSupplier ? "__new" : supplierId} onChange={event => { setCreateSupplier(event.target.value === "__new"); if (event.target.value !== "__new") setSupplierId(event.target.value); }} required><option value="">Choose a supplier</option>{suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}<option value="__new">Add a new supplier</option></select></label>{createSupplier && <label>Supplier or recipient name<input value={supplierName} onChange={event => setSupplierName(event.target.value)} required placeholder="Name under Recipient Details"/></label>}<label>Invoice / transaction reference<input value={number} onChange={event => setNumber(event.target.value)} required/></label></div><div className="ws-form-actions"><button type="button" className="ws-button secondary" onClick={() => setEditing(false)}>Cancel</button><button className="ws-button primary" disabled={busy || (createSupplier && !supplierName.trim())}>{busy ? "Saving…" : "Save corrections"}</button></div></form>;
}

function CreditNoteCard({ note, invoice, payments, onError }) {
  const [refunds, setRefunds] = useState([]);
  const [busy, setBusy] = useState(false);
  const [channel, setChannel] = useState("External");
  const [paymentId, setPaymentId] = useState("");
  const eligiblePayments = payments.filter(p => !p.isReversed && p.currencyCode === note.currencyCode);
  const selectedPayment = eligiblePayments.find(p => p.id === paymentId) || eligiblePayments[0];
  const canPaystack = selectedPayment?.method === "Card" && selectedPayment?.reference?.startsWith("invpay_");
  const reserved = refunds.filter(r => r.status !== "Failed").reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const remaining = Math.max(0, Number(note.amount || 0) - reserved);
  const refresh = useCallback(async () => {
    try { setRefunds(asList(await api(`/api/invoices/${invoice.id}/credit-notes/${note.id}/refunds`))); }
    catch (e) { onError(e.message); }
  }, [invoice.id, note.id, onError]);
  useEffect(() => { refresh(); }, [refresh]);

  async function downloadPdf() {
    try {
      const blob = await apiBlob(`/api/invoices/${invoice.id}/credit-notes/${note.id}/pdf`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = `${note.number}.pdf`;
      document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    } catch (e) { onError(e.message); }
  }

  async function submitRefund(e) {
    e.preventDefault(); const target = e.currentTarget; const form = new FormData(target); setBusy(true); onError("");
    try {
      await api(`/api/invoices/${invoice.id}/credit-notes/${note.id}/refunds`, { method: "POST", body: {
        paymentId: form.get("paymentId"), amount: Number(form.get("amount")), reason: form.get("reason"),
        channel: canPaystack && channel === "Paystack" ? "Paystack" : "External", reference: form.get("reference") || null
      }});
      await refresh(); target.reset();
    } catch (error) { onError(error.message); }
    finally { setBusy(false); }
  }

  return <article className="ws-credit-note"><div className="ws-credit-note-head"><div><b>{note.number}</b><span>{note.issuedOn} · {note.currencyCode} {Number(note.amount).toLocaleString()}</span><small>{note.reason}</small></div><button className="ws-button secondary" type="button" onClick={downloadPdf}><FileText/> Download PDF</button></div>
    {refunds.length > 0 && <div className="ws-refund-list"><b>Refund activity</b>{refunds.map(r=><div key={r.id}><span>{r.currencyCode} {Number(r.amount).toLocaleString()} · {r.channel === "Paystack" ? "Paystack" : "External refund"}</span><span>{r.status}{r.failureReason ? ` · ${r.failureReason}` : ""}</span></div>)}</div>}
    {remaining > 0 && eligiblePayments.length > 0 && <form className="ws-payment-form" onSubmit={submitRefund}><h4>Refund this credit</h4><p className="ws-muted">Choose an original payment. External means you have already sent the money outside Invoice AI.</p><div className="ws-form-grid"><label>Payment<select name="paymentId" value={selectedPayment?.id || ""} onChange={e=>setPaymentId(e.target.value)} required>{eligiblePayments.map(p=><option key={p.id} value={p.id}>{p.method} · {p.currencyCode} {Number(p.amount).toLocaleString()}{p.reference?` · ${p.reference}`:""}</option>)}</select></label><label>Refund amount ({note.currencyCode})<input name="amount" type="number" min="0.01" step="0.01" max={remaining} required/></label><label>Reason<input name="reason" maxLength="500" defaultValue={note.reason} required/></label>{canPaystack&&<label>How was it refunded?<select value={channel} onChange={e=>setChannel(e.target.value)}><option value="Paystack">Start refund through Paystack</option><option value="External">I already refunded outside Invoice AI</option></select></label>}{(!canPaystack||channel==="External")&&<label>External refund reference<input name="reference" maxLength="100" placeholder="Bank or cash receipt reference"/></label>}</div><button className="ws-button primary" disabled={busy}>{busy?"Saving refund…":canPaystack&&channel==="Paystack"?"Start Paystack refund":"Record completed refund"}</button></form>}
    {remaining > 0 && eligiblePayments.length === 0 && <p className="ws-muted">Refunds can only be recorded up to the amount received on a matching payment.</p>}
  </article>;
}

function PaymentAccountPanel({ data, setData, onError, busy, setBusy }) {
  const [banks, setBanks] = useState([]);
  const [banksLoading, setBanksLoading] = useState(true);
  const [bankError, setBankError] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [usdSubaccountCode, setUsdSubaccountCode] = useState("");

  useEffect(() => {
    let active = true;
    setBanksLoading(true);
    api("/api/payment-accounts/paystack/banks")
      .then(result => { if (active) { const available = asList(result.banks); setBanks(available); setSelectedBank(available[0]?.code || ""); setBankError(""); } })
      .catch(error => { if (active) setBankError(error.message); })
      .finally(() => { if (active) setBanksLoading(false); });
    return () => { active = false; };
  }, []);

  async function refreshStatus() {
    setBusy(true); onError("");
    try { setData(await api("/api/payment-accounts/paystack/refresh", { method: "POST" })); }
    catch (error) { onError(error.message); }
    finally { setBusy(false); }
  }

  async function removeAccountLink(currencyCode) {
    const confirmed = window.confirm(`Remove the inactive ${currencyCode} account link from Invoice AI? This only clears the saved link here; it does not change anything in Paystack.`);
    if (!confirmed) return;
    setBusy(true); onError("");
    try { setData(await api(`/api/payment-accounts/paystack/${encodeURIComponent(currencyCode)}`, { method: "DELETE" })); }
    catch (error) { onError(error.message); }
    finally { setBusy(false); }
  }

  async function connect(e) {
    e.preventDefault();
    const target = e.currentTarget;
    const form = new FormData(target);
    setBusy(true); onError("");
    try {
      await api("/api/payment-accounts/paystack", { method: "POST", body: {
        bankCode: String(form.get("bankCode")).trim(), accountNumber: String(form.get("accountNumber")).trim()
      }});
      setData(await api("/api/payment-accounts/paystack"));
      target.reset();
    } catch (error) { onError(error.message); }
    finally { setBusy(false); }
  }

  async function connectUsd(e) {
    e.preventDefault();
    setBusy(true); onError("");
    try {
      await api("/api/payment-accounts/paystack/link", { method: "POST", body: { subaccountCode: usdSubaccountCode.trim() } });
      setData(await api("/api/payment-accounts/paystack"));
      setUsdSubaccountCode("");
    } catch (error) { onError(error.message); }
    finally { setBusy(false); }
  }

  const accounts = asList(data.accounts);
  const ready = accounts.length ? accounts.some(account => account.isActive && (account.isVerified || data.isTestMode)) : data.isActive && (data.isVerified || data.isTestMode);
  const usdEligibleCountry = ["NG", "KE"].includes(String(data.countryCode || "").toUpperCase());
  const usdAccount = accounts.find(account => account.currencyCode === "USD");
  const baseAccount = accounts.find(account => account.currencyCode === (data.defaultPaymentCurrencyCode || data.baseCurrencyCode));
  return <div className="ws-money-page">
    <section className="ws-card ws-money-hero">
      <div className="ws-money-hero-icon"><WalletCards/></div>
      <div className="ws-money-hero-copy"><span className="ws-money-eyebrow">ONLINE PAYMENTS</span><h2>Get paid through your invoices</h2><p>Connect the bank account where you want to receive customer payments. When a customer pays an invoice online, Paystack sends the money to this account.</p></div>
      <div className={`ws-money-status ${ready ? "ready" : "pending"}`}><i/>{ready ? "Ready to receive payments" : data.status || "Setup needed"}</div>
    </section>

    {accounts.length > 0 && <section className="ws-money-status-grid" aria-label="Payment account status">{accounts.map(account => <article className="ws-card ws-money-status-card" key={account.currencyCode}><span>{account.currencyCode} settlement account</span><b>{account.isActive && (account.isVerified || data.isTestMode) ? "Ready" : account.isActive ? "Verification pending" : "Inactive"}</b><small>{account.currencyCode} invoice payments settle to this Paystack subaccount.</small>{!account.isActive && <button className="ws-button secondary" type="button" disabled={busy} onClick={() => removeAccountLink(account.currencyCode)}>Remove old link</button>}</article>)}</section>}

    {!baseAccount && <section className="ws-card ws-payment-setup">
      <div className="ws-money-section-heading"><div><span className="ws-money-step">STEP 1</span><h3>Where should we send your money?</h3><p>Choose your bank and enter the business account number. We send these details to Paystack to verify the account.</p></div></div>
      {bankError && <div className="ws-money-inline-error" role="alert"><b>We couldn’t load the bank list.</b><span>{bankError}</span><button className="ws-button secondary" type="button" onClick={() => window.location.reload()}>Try again</button></div>}
      <form className="ws-payment-form ws-payment-setup-form" onSubmit={connect}>
        <div className="ws-form-grid">
          <label>Bank<select name="bankCode" value={selectedBank} onChange={e=>setSelectedBank(e.target.value)} required disabled={banksLoading || banks.length === 0}><option value="">{banksLoading ? "Loading banks…" : banks.length ? "Choose your bank" : "Bank list unavailable"}</option>{banks.map(bank=><option key={bank.code} value={bank.code}>{bank.name}</option>)}</select><small>Pick the bank where your business account is held.</small></label>
          <label>Business account number<input name="accountNumber" inputMode="numeric" autoComplete="off" required minLength={8} maxLength={20} pattern="[0-9]{8,20}" placeholder="Enter the account number"/><small>Use the account number for the bank you selected.</small></label>
        </div>
        <div className="ws-payment-privacy"><Shield size={16}/><span>Your account number is sent securely to Paystack for verification. Invoice AI doesn’t store it.</span></div>
        <div className="ws-payment-setup-actions"><button className="ws-button primary" disabled={busy || banksLoading || banks.length === 0}>{busy ? "Connecting your account…" : "Connect bank account"}</button></div>
      </form>
    </section>}
    {accounts.length > 0 && <section className="ws-card ws-connected-account">
      <div className="ws-money-section-heading"><div><span className="ws-money-step">CONNECTED ACCOUNTS</span><h3>Your Paystack settlement accounts</h3><p>{ready ? "Invoices can use the connected account with the same currency." : "Paystack is still verifying your connected account details."}</p></div><button className="ws-button secondary" disabled={busy} onClick={refreshStatus}><RefreshCw/>{busy ? "Checking…" : "Refresh status"}</button></div>
      <div className="ws-connected-account-note"><CheckCircle2/><div><b>{ready ? "Account connected" : "Verification pending"}</b><span>Invoice currency must match a ready Paystack subaccount currency.</span></div></div>
    </section>}
    {usdEligibleCountry && !usdAccount && <section className="ws-card ws-payment-setup ws-payment-usd-setup">
      <div className="ws-money-section-heading"><div><span className="ws-money-step">OPTIONAL · USD</span><h3>Accept USD invoice payments</h3><p>Create a USD subaccount in your Paystack dashboard, then connect its code here. Paystack must enable USD for your business first.</p></div></div>
      <ol className="ws-usd-setup-steps"><li>In Paystack, request or enable international USD payments for your business.</li><li>Create a subaccount with currency set to USD and complete Paystack’s account verification.</li><li>Copy its subaccount code and connect it below.</li></ol>
      {data.countryCode?.toUpperCase() === "NG" && <p className="ws-muted">For payouts in USD, Paystack requires an approved USD domiciliary account. Otherwise, create invoices in NGN for local-currency settlement.</p>}
      <form className="ws-payment-form ws-usd-link-form" onSubmit={connectUsd}><label>USD subaccount code<input value={usdSubaccountCode} onChange={event=>setUsdSubaccountCode(event.target.value)} autoComplete="off" placeholder="ACCT_…" maxLength={100} required/><small>Invoice AI verifies the code and USD currency directly with Paystack.</small></label><button className="ws-button primary" disabled={busy}>{busy ? "Verifying USD account…" : "Connect USD account"}</button></form>
    </section>}
    <p className="ws-money-footnote"><Shield size={14}/> Card details are entered on Paystack’s secure checkout page. Invoice AI never handles or stores card details.</p>
  </div>;
}

function baseCurrencyCodeFallback(data) { return data.currencyCode || "Workspace currency"; }

function OrganizationProfile({ organization }) {
  const address = [organization.addressLine1, organization.addressLine2].filter(Boolean).join(", ");
  const value = item => item == null || item === "" ? "Not added yet" : String(item);
  const field = (label, content) => <div className="ws-org-profile-field" key={label}><dt>{label}</dt><dd>{value(content)}</dd></div>;

  return <section className="ws-card ws-org-profile">
    <div className="ws-org-profile-identity"><span className="ws-org-profile-mark"><Building2/></span><div><span className="ws-org-profile-eyebrow">BUSINESS PROFILE</span><h2>{organization.name || "Your business"}</h2><p>{organization.accountType || "Workspace"} · Details used on your invoices</p></div><span className="ws-org-profile-badge">{organization.accountType || "Workspace"}</span></div>
    <div className="ws-org-profile-grid">
      <section className="ws-org-profile-section"><h3>Contact information</h3><p>How customers can reach your business.</p><dl>{field("Contact email", organization.email)}{field("Phone number", organization.phone)}{field("Tax ID", organization.taxIdentificationNumber)}</dl></section>
      <section className="ws-org-profile-section"><h3>Business address</h3><p>Address details shown on your invoices.</p><dl>{field("Street address", address)}{field("City", organization.city)}{field("State / region", organization.region)}{field("Postal code", organization.postalCode)}{field("Country code", organization.countryCode)}</dl></section>
      <section className="ws-org-profile-section"><h3>Invoice defaults</h3><p>Starting values used when you create invoices.</p><dl>{field("Currency", organization.baseCurrencyCode)}{field("Payment terms", organization.defaultPaymentTermsDays == null ? null : `${organization.defaultPaymentTermsDays} days`)}</dl></section>
      <section className="ws-org-profile-section ws-org-profile-note"><span><Shield/></span><div><h3>Your workspace, your way</h3><p>These details are optional for freelancers. Add the information you want customers to see on your invoices.</p></div></section>
    </div>
  </section>;
}

function BillingHistoryPanel({ data, onRefresh, onError }) {
  const [busy, setBusy] = useState(false);
  const subscription = data?.subscription || {};
  const historyUnavailable = data?.historyUnavailable;
  const checkouts = asList(data?.checkouts);
  const canCancel = subscription.canCancel;

  async function cancelRenewal() {
    setBusy(true);
    onError("");
    try {
      await api("/api/billing/subscription/cancel", { method: "POST" });
      await onRefresh();
    } catch (error) {
      onError(error.message);
    } finally {
      setBusy(false);
    }
  }

  return <>
    <section className="ws-card">
      <div className="ws-card-title"><div><h2>Current subscription</h2><p className="ws-muted">Your plan and renewal status.</p></div>
        {canCancel && <button className="ws-button secondary" disabled={busy} onClick={cancelRenewal}>{busy ? "Updating…" : "Turn off renewal"}</button>}
      </div>
      <div className="ws-billing-summary">
        <span>Status <b>{subscription.status || "Free"}</b></span>
        <span>Plan <b>{subscription.planName || subscription.planCode || "Free"}</b></span>
        <span>Next renewal <b>{subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : "—"}</b></span>
        <span>Price <b>{subscription.currencyCode ? `${subscription.currencyCode} ${(Number(subscription.amountMinor || 0) / 100).toLocaleString()}` : "—"}</b></span>
      </div>
      {subscription.status === "NonRenewing" && <p className="ws-muted">Your plan remains active until the end of this billing period.</p>}
    </section>
    <section className="ws-card">
      <div className="ws-card-title"><div><h2>Payment attempts</h2><p className="ws-muted">The latest subscription checkout activity.</p></div></div>
      {checkouts.length ? <div className="ws-table-wrap"><table><thead><tr><th>Date</th><th>Plan</th><th>Amount</th><th>Status</th></tr></thead><tbody>{checkouts.map(item => <tr key={item.id}><td>{new Date(item.createdAt).toLocaleString()}</td><td>{item.planCode}</td><td>{item.currencyCode} {(Number(item.amountMinor || 0) / 100).toLocaleString()}</td><td>{item.status}</td></tr>)}</tbody></table></div> : <div className="ws-empty"><span className="ws-empty-icon"><CreditCard/></span><b>No billing activity yet</b><small>When you start a paid plan, checkout activity will appear here.</small></div>}
    </section>
    {historyUnavailable && <p className="ws-muted">Your current plan is shown above. Payment attempt history is not available from this server yet.</p>}
  </>;
}

function SubscriptionPaymentReturn({ navigate }) {
  const reference = new URLSearchParams(window.location.search).get("reference") || "";
  const [status, setStatus] = useState("checking");
  const [checkout, setCheckout] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const initialCheckStarted = useRef(false);

  const checkPayment = useCallback(async () => {
    if (!reference) { setStatus("missing"); return; }
    setBusy(true);
    setError("");
    try {
      const result = await api(`/api/billing/checkout/confirm?reference=${encodeURIComponent(reference)}`, { method: "POST" });
      setCheckout(result);
      if (result.status === "Succeeded") {
        const history = await api("/api/billing/history");
        const activeSubscription = history?.subscription || null;
        if (activeSubscription?.planCode !== result.planCode || result.currentPlanCode !== result.planCode) {
          throw new Error("Payment was received, but the new plan is not active in this workspace yet. Please check again in a moment.");
        }
        setSubscription(activeSubscription);
        setStatus("success");
      } else if (result.status === "Failed") {
        setStatus("failed");
      } else {
        setStatus("pending");
      }
    } catch (e) {
      setError(e.message || "We couldn’t check this payment yet.");
      setStatus("error");
    } finally {
      setBusy(false);
    }
  }, [reference]);

  useEffect(() => {
    if (initialCheckStarted.current) return;
    initialCheckStarted.current = true;
    checkPayment();
  }, [checkPayment]);

  const succeeded = status === "success";
  const pending = status === "checking" || status === "pending";
  const planName = subscription?.planName || checkout?.planCode || "your selected plan";
  const amount = checkout ? `${checkout.currencyCode} ${(Number(checkout.amountMinor || 0) / 100).toLocaleString()}` : "";

  return <section className={`ws-card ws-subscription-return ${succeeded ? "is-success" : status === "failed" ? "is-failed" : "is-pending"}`}>
    <span className="ws-subscription-return-icon">{succeeded ? <CheckCircle2/> : status === "failed" ? <X/> : <CreditCard/>}</span>
    <p className="ws-subscription-return-eyebrow">SUBSCRIPTION PAYMENT</p>
    <h2>{succeeded ? "Payment confirmed" : status === "failed" ? "Payment not completed" : status === "missing" ? "Payment reference missing" : status === "error" ? "We couldn’t confirm your payment" : "Checking your payment"}</h2>
    <p className="ws-muted">{succeeded
      ? `Your ${planName} plan is active and the payment has been recorded in Invoice AI.`
      : status === "failed" ? "Paystack did not confirm this payment. You can return to your plans and try again."
      : status === "missing" ? "We didn’t receive a payment reference. Open Billing details to check whether the payment was recorded."
      : status === "error" ? error
      : "Please wait while Invoice AI securely verifies the payment and updates your subscription."}</p>
    {succeeded && <div className="ws-subscription-return-summary"><span>Plan <b>{planName}</b></span>{amount && <span>Paid <b>{amount}</b></span>}<span>Status <b>Active</b></span></div>}
    {error && status !== "error" && <p className="ws-error">{error}</p>}
    {pending && status !== "checking" && <p className="ws-subscription-return-note">If you have just paid, confirmation can take a short moment. Your payment is checked securely when you try again.</p>}
    <div className="ws-subscription-return-actions">
      {pending || status === "error" ? <button className="ws-button primary" disabled={busy} onClick={checkPayment}><RefreshCw/>{busy ? "Checking…" : "Check payment again"}</button> : null}
      {succeeded && <button className="ws-button primary" onClick={() => navigate("/app/billing-history")}>View billing details <ArrowRight/></button>}
      {status === "failed" && <button className="ws-button primary" onClick={() => navigate("/app/billing")}>Return to plans <ArrowRight/></button>}
      <button className="ws-button secondary" onClick={() => navigate("/app")}>Go to dashboard</button>
    </div>
    {checkout?.reference && <small className="ws-subscription-return-reference">Payment reference: {checkout.reference}</small>}
  </section>;
}

function InvoiceActions({ invoice, onUpdate, onError, onEdit }) {
 const [busy,setBusy]=useState(false),[reason,setReason]=useState(""),[dueDate,setDueDate]=useState(invoice.dueDate||"");
 async function run(suffix,body){setBusy(true);onError("");try{onUpdate(await api(`/api/invoices/${invoice.id}/${suffix}`,{method:"POST",body}))}catch(e){onError(e.message)}finally{setBusy(false)}}
 const issued = ["Issued","PartiallyPaid"].includes(invoice.status);
 const notSent = issued && Number(invoice.sentCount || 0) === 0;
 return <section className="ws-invoice-actions"><div className="ws-invoice-actions-heading"><div><h4>Invoice actions</h4><p>Update the status or manage this invoice.</p></div><span className={`ws-invoice-status ${String(invoice.status||"").toLowerCase()}`}>{String(invoice.status||"Unknown").replace(/([a-z])([A-Z])/g,"$1 $2")}</span></div>{notSent&&<p className="ws-invoice-delivery-note">Issued and ready, but not emailed yet. Issuing an invoice does not send it to your customer.</p>}{invoice.sentCount>0&&issued&&<p className="ws-invoice-reminder-info">After you email this invoice, automatic payment reminders are scheduled for 7 days before the due date, on the due date, and 7 and 30 days after it. They stop when the balance is paid. Each reminder includes a Pay now link.</p>}{invoice.status==="Paid"&&Number(invoice.amountPaid)>0&&<p className="ws-invoice-delivery-note">This invoice is marked paid because {formatMoney(invoice.amountPaid,invoice.currencyCode)} has been recorded as received. Issuing an invoice alone does not record a payment.</p>}<div className="ws-record-actions">{invoice.status==="Draft"&&<><button className="ws-button secondary" onClick={onEdit}>Edit draft</button><label>Due date<input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}/></label><button className="ws-button primary" disabled={busy} onClick={()=>run("issue",{dueDate:dueDate||null})}>{busy?"Working…":"Issue invoice"}</button></>}{issued&&<button className="ws-button secondary" disabled={busy} onClick={()=>run("send",{message:null})}>{busy?"Sending…":notSent?"Email invoice to customer":"Send invoice email again"}</button>}{!["Paid","Void"].includes(invoice.status)&&<form onSubmit={e=>{e.preventDefault();if(reason.trim())run("void",{reason:reason.trim()})}}><input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Reason to void" required/><button className="ws-button secondary" disabled={busy}>Void invoice</button></form>}</div></section>;
}

function InvoicePdfPreview({ invoices, loading, loadError, onRetry, initialInvoiceId, navigate }) {
  const invoiceRows = Array.isArray(invoices)
    ? invoices
    : Array.isArray(invoices?.items)
      ? invoices.items
      : Array.isArray(invoices?.data)
        ? invoices.data
        : [];
  const [invoiceId, setInvoiceId] = useState(initialInvoiceId || "");
  const [pdfUrl, setPdfUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [pdfError, setPdfError] = useState("");
  useEffect(() => { if (initialInvoiceId) setInvoiceId(initialInvoiceId); }, [initialInvoiceId]);
  useEffect(() => () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); }, [pdfUrl]);
  async function openPdf(event) {
    event.preventDefault();
    if (!invoiceId) return;
    setBusy(true);
    setPdfError("");
    try {
      const blob = await apiBlob(`/api/invoices/${encodeURIComponent(invoiceId)}/pdf`);
      setPdfUrl(URL.createObjectURL(blob));
    } catch (error) {
      setPdfUrl("");
      setPdfError(error.message);
    } finally { setBusy(false); }
  }
  return <section className="ws-card ws-pdf-preview-card">
    <div className="ws-pdf-preview-intro"><span className="ws-task-icon"><FileText/></span><div><h2>Preview an invoice</h2><p className="ws-muted">Choose an invoice to view or download its PDF.</p></div></div>
    {loading ? <div className="ws-empty"><b>Loading your invoices…</b></div> : loadError ? <div className="ws-pdf-preview-message error"><b>We couldn’t load your invoices</b><span>{String(loadError)}</span><button className="ws-button secondary" type="button" onClick={onRetry}><RefreshCw/> Try again</button></div> : !invoiceRows.length ? <div className="ws-pdf-preview-message"><span className="ws-task-icon"><FileText/></span><b>No invoices yet</b><span>Create your first invoice and it will be available to preview here.</span><button className="ws-button primary" type="button" onClick={()=>navigate("/app/invoice-new")}>Create invoice <ArrowRight/></button></div> : <form className="ws-pdf-preview-form" onSubmit={openPdf}>
      <label htmlFor="pdf-invoice-select">Select an invoice</label>
      <div><select id="pdf-invoice-select" value={invoiceId} onChange={e=>{setInvoiceId(e.target.value);setPdfUrl("");setPdfError("")}} required><option value="" disabled>Choose an invoice</option>{invoiceRows.filter(invoice=>invoice?.id).map(invoice=><option key={invoice.id} value={invoice.id}>{invoice.number || `Invoice · ${String(invoice.id).slice(0,8)}`} · {invoice.customerName || "Customer"} · {formatMoney(invoice.total,invoice.currencyCode)}</option>)}</select><button className="ws-button primary" disabled={busy||!invoiceId}>{busy?"Preparing PDF…":<>Open PDF <ArrowRight/></>}</button></div>
    </form>}
    {pdfError&&<div className="ws-pdf-preview-message error"><b>We couldn’t prepare this PDF</b><span>{pdfError}</span></div>}
    {pdfUrl&&<div className="ws-pdf-preview-result"><div><b>Invoice PDF</b><span className="ws-pdf-preview-links"><a className="ws-button secondary" href={pdfUrl} target="_blank" rel="noopener noreferrer">Open PDF</a><a className="ws-button secondary" href={pdfUrl} download="invoice.pdf">Download PDF</a></span></div><p className="ws-pdf-preview-mobile-help">On a phone, tap <b>Open PDF</b> to view the invoice in your browser, or download it to your device.</p><iframe title="Invoice PDF preview" className="ws-pdf-frame" src={pdfUrl}/></div>}
  </section>;
}

function formatMoney(value, currencyCode = "NGN") {
  try {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency: currencyCode, maximumFractionDigits: 0 }).format(Number(value) || 0);
  } catch {
    return `${currencyCode} ${(Number(value) || 0).toLocaleString()}`;
  }
}

function periodBounds(period) {
  const to = new Date();
  const from = new Date(to);
  if (period === "month") from.setDate(1);
  else if (period === "30days") from.setDate(from.getDate() - 29);
  else if (period === "90days") from.setDate(from.getDate() - 89);
  else from.setMonth(0, 1);
  const iso = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return { from: iso(from), to: iso(to) };
}

function GroupedMoneyChart({ rows, currencyCode, label }) {
  if (!rows.length) return <div className="ws-chart-empty">Chart will appear when there is activity to compare.</div>;
  const width = 1100, height = 320, left = 76, right = 18, top = 30, bottom = 52;
  const plotWidth = width - left - right, plotHeight = height - top - bottom;
  const maxValue = Math.max(1, ...rows.flatMap(row => [Number(row.income) || 0, Number(row.expenses) || 0, Number(row.incoming) || 0, Number(row.outgoing) || 0]));
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const axisMoney = value => { try { return new Intl.NumberFormat("en-NG", { style: "currency", currency: currencyCode || "NGN", notation: "compact", maximumFractionDigits: 1 }).format(value); } catch { return String(value); } };
  const barLabel = value => { try { return new Intl.NumberFormat("en-NG", { notation: "compact", maximumFractionDigits: 1 }).format(value); } catch { return Number(value || 0).toLocaleString(); } };
  const slot = plotWidth / rows.length;
  const barWidth = Math.min(30, slot * .25);
  const dateLabel = value => {
    if (!value) return "";
    if (/^Week\s/i.test(String(value))) return String(value);
    const date = new Date(`${String(value).slice(0, 7)}-01T00:00:00`);
    return Number.isNaN(date.getTime()) ? String(value).slice(0, 7) : date.toLocaleDateString("en-NG", { month: "short" });
  };
  return <div className="ws-chart-scroll"><svg className="ws-money-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
    {ticks.map(tick => { const y = top + plotHeight * (1 - tick); return <g key={tick}><line x1={left} x2={width - right} y1={y} y2={y} className="ws-chart-gridline"/><text x={left - 9} y={y + 4} textAnchor="end" className="ws-chart-axis">{axisMoney(maxValue * tick)}</text></g>; })}
    {rows.map((row,index) => {
      const center = left + slot * (index + .5);
      const first = Number(row.income ?? row.incoming) || 0;
      const second = Number(row.expenses ?? row.outgoing) || 0;
      const firstHeight = Math.max(0, first / maxValue * plotHeight), secondHeight = Math.max(0, second / maxValue * plotHeight);
      const month = row.month || row.label || `Period ${index + 1}`;
      return <g key={`${month}-${index}`}><rect x={center - barWidth - 4} y={top + plotHeight - firstHeight} width={barWidth} height={firstHeight} rx="6" className="ws-chart-income"><title>{`Cash received / income: ${formatMoney(first,currencyCode)}`}</title></rect><rect x={center + 4} y={top + plotHeight - secondHeight} width={barWidth} height={secondHeight} rx="6" className="ws-chart-expenses"><title>{`Cash paid / expenses: ${formatMoney(second,currencyCode)}`}</title></rect>{first > 0 && <text x={center - barWidth / 2 - 4} y={Math.max(top - 8, top + plotHeight - firstHeight - 8)} textAnchor="middle" className="ws-chart-value">{barLabel(first)}</text>}{second > 0 && <text x={center + barWidth / 2 + 4} y={Math.max(top - 8, top + plotHeight - secondHeight - 8)} textAnchor="middle" className="ws-chart-value">{barLabel(second)}</text>}<text x={center} y={height - 17} textAnchor="middle" className="ws-chart-axis ws-chart-month">{dateLabel(month)}</text></g>;
    })}
  </svg></div>;
}

function MonthlyIncomeExpenseChart({ rows, currencyCode }) {
  const chartRows = asList(rows).slice(-6);
  return <div className="ws-chart-card"><div className="ws-chart-legend"><span><i className="income"/>Income</span><span><i className="expenses"/>Supplier bill expenses</span></div><GroupedMoneyChart rows={chartRows} currencyCode={currencyCode} label="Bar chart comparing monthly invoiced income and supplier bill expenses"/><small className="ws-chart-caption">Amounts are grouped by invoice and bill date; they do not represent cash received or paid.</small></div>;
}

function MonthlyCashFlowChart({ rows, currencyCode, loading, error, onRetry }) {
  const [range, setRange] = useState(6);
  const chartRows = asList(rows).slice(-range).map(row => ({
    month: row.month,
    incoming: Number(row.cashReceived) || 0,
    outgoing: Number(row.cashPaidOut) || 0
  }));
  const hasPayments = chartRows.some(row => row.incoming > 0 || row.outgoing > 0);
  const totals = chartRows.reduce((result, row) => ({ received: result.received + row.incoming, paid: result.paid + row.outgoing }), { received: 0, paid: 0 });
  const compactMoney = value => {
    try { return new Intl.NumberFormat("en-NG", { style: "currency", currency: currencyCode || "NGN", notation: "compact", maximumFractionDigits: 1 }).format(value); }
    catch { return formatMoney(value, currencyCode); }
  };
  return <section className="ws-card ws-report-card ws-dashboard-chart">
    <div className="ws-dashboard-chart-heading"><div className="ws-dashboard-chart-title"><span className="ws-dashboard-chart-icon"><ChartNoAxesCombined/></span><div><h3>Cash Flow</h3><p>Money received and paid over the last {range} months.</p></div></div><div className="ws-dashboard-chart-controls"><label className="ws-dashboard-period"><CalendarDays/><select aria-label="Cash flow chart period" value={range} onChange={event=>setRange(Number(event.target.value))}><option value={3}>Last 3 Months</option><option value={6}>Last 6 Months</option></select><ChevronDown/></label><button className="ws-dashboard-chart-refresh" onClick={onRetry} disabled={loading} aria-label={loading ? "Updating chart" : "Refresh chart"} title={loading ? "Updating chart" : "Refresh chart"}><RefreshCw className={loading ? "ws-spin" : ""}/></button></div></div>
    {error ? <div className="ws-report-warning" role="status"><span>{error}</span><button className="ws-button secondary" onClick={onRetry}>Try again</button></div> : loading && chartRows.length === 0 ? <div className="ws-report-inline-state">Loading payment activity…</div> : hasPayments ? <><div className="ws-chart-summary" aria-label="Six-month payment totals"><div className="received"><i><WalletCards/></i><span><small>Cash Received</small><b>{compactMoney(totals.received)}</b><em>Recorded in the last 6 months</em></span></div><div className="paid"><i><CreditCard/></i><span><small>Cash Paid</small><b>{compactMoney(totals.paid)}</b><em>Recorded in the last 6 months</em></span></div></div><div className="ws-chart-card ws-dashboard-plot"><div className="ws-chart-legend"><span><i className="income"/>Cash Received</span><span><i className="expenses"/>Cash Paid</span></div><GroupedMoneyChart rows={chartRows} currencyCode={currencyCode} label="Bar chart comparing customer payments received with supplier payments made for each of the last six months"/><small className="ws-chart-caption">Figures cover the last six months and may be rounded. Reversed payments are excluded.</small></div></> : <div className="ws-chart-empty">Monthly cash-flow bars will appear here after you record a customer or supplier payment.</div>}
  </section>;
}

function DashboardPanels({ records, recordsLoading, periodIncome, currencyCode, navigate, setQuestion }) {
  const total = records?.counts?.total;
  const paid = records?.counts?.paid;
  const pending = records?.counts?.pending;
  return <section className="ws-dashboard-panels">
    <article className="ws-dashboard-panel ws-dashboard-key-metrics">
      <header><span className="ws-dashboard-panel-title"><i><LayoutDashboard/></i><b>Key Metrics</b></span><button type="button" onClick={()=>navigate("/app/reports")}>View details <ArrowRight/></button></header>
      <div className="ws-key-metric-grid">
        {[["Total invoices",total,FileText,"purple"],["Paid invoices",paid,CheckCircle2,"green"],["Pending invoices",pending,Clock3,"amber"],["Total revenue",formatMoney(periodIncome,currencyCode),ChartNoAxesCombined,"blue"]].map(([label,value,Icon,tone])=><div className={`ws-key-metric ${tone}`} key={label}><i><Icon/></i><span><small>{label}</small><b>{recordsLoading&&value==null?"…":value??"—"}</b>{label==="Total revenue"&&<em>Current reporting period</em>}</span></div>)}
      </div>
    </article>
    <article className="ws-dashboard-panel ws-dashboard-activity">
      <header><span className="ws-dashboard-panel-title"><i><Zap/></i><b>Recent Activity</b></span><button type="button" onClick={()=>navigate("/app/payments")}>View all <ArrowRight/></button></header>
      {recordsLoading&&!records?.activity ? <div className="ws-dashboard-panel-state">Loading your recent activity…</div> : records?.activity?.length ? <div className="ws-activity-list">{records.activity.slice(0,3).map((item,index)=><div className={`ws-activity-row ${item.kind}`} key={`${item.kind}-${item.id||item.title}-${index}`}><i>{item.kind==="received"?<ArrowDownLeft/>:item.kind==="paid"?<ArrowUpRight/>:<FileText/>}</i><span><b>{item.title}</b><small>{item.detail} · {item.date}</small></span><strong>{item.amount!=null?formatMoney(item.amount,item.currencyCode||currencyCode):"—"}</strong></div>)}</div> : <div className="ws-dashboard-panel-state">No recent activity yet. Payments and issued invoices will appear here.</div>}
    </article>
    <DashboardAiInsights navigate={navigate} setQuestion={setQuestion}/>
  </section>;
}

function DashboardAiInsights({ navigate, setQuestion }) {
  const [insight,setInsight]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const prompt="Review my income, expenses and cash flow over the last six months. Share one short, practical insight using only the financial records in my workspace. If there is not enough data, say so.";
  const generate=async()=>{setLoading(true);setError("");try{const result=await askFirebaseAssistant(prompt);setInsight(result?.answer||"I couldn’t find a useful pattern in the recorded data yet.")}catch(e){setError(e.message||"The insight could not be generated right now.")}finally{setLoading(false)}};
  const askMore=()=>{setQuestion(prompt);navigate("/app/assistant")};
  return <article className="ws-dashboard-panel ws-dashboard-ai-insight"><header><span className="ws-dashboard-panel-title"><i><Sparkles/></i><b>AI Insights</b></span><span className="ws-insight-new">New</span></header><div className="ws-insight-body"><span className="ws-insight-bulb"><Sparkles/></span><div>{error?<p className="ws-insight-error">{error}</p>:<p>{insight||"Ask Invoice AI for a useful observation about your recent income, expenses and cash flow."}</p>}<small>Answers use the latest data available in your workspace.</small></div></div><button className="ws-insight-action" type="button" onClick={insight?askMore:generate} disabled={loading}>{loading?<><RefreshCw className="ws-spin"/> Reviewing your records…</>:<><Bot/> Ask Invoice AI</>}</button></article>;
}

function ForecastWeeklyChart({ forecast }) {
  const start = new Date(`${forecast.asOf}T00:00:00`);
  const rows = Array.from({ length: 5 }, (_, index) => {
    const from = new Date(start); from.setDate(from.getDate() + index * 7);
    const through = new Date(start); through.setDate(through.getDate() + index * 7 + 6);
    const incoming = (forecast.scheduledItems || []).filter(item => item.direction === "Incoming" && new Date(`${item.dueDate}T00:00:00`) >= from && new Date(`${item.dueDate}T00:00:00`) <= through).reduce((sum,item) => sum + (Number(item.amount) || 0), 0);
    const outgoing = (forecast.scheduledItems || []).filter(item => item.direction === "Outgoing" && new Date(`${item.dueDate}T00:00:00`) >= from && new Date(`${item.dueDate}T00:00:00`) <= through).reduce((sum,item) => sum + (Number(item.amount) || 0), 0);
    return { month: `Week ${index + 1}`, incoming, outgoing };
  });
  return <div className="ws-chart-card ws-forecast-chart"><h4>Expected due amounts by week</h4><div className="ws-chart-legend"><span><i className="income"/>Expected from customers</span><span><i className="expenses"/>Expected for suppliers</span></div><GroupedMoneyChart rows={rows} currencyCode={forecast.currencyCode} label="Bar chart of customer and supplier amounts due in each of the next five weeks"/><small className="ws-chart-caption">Based on due dates for open invoices and bills. Payment is not guaranteed.</small></div>;
}

function FinancialHealthPage({ data, extras, forecast, forecastLoading, forecastError, onRetryForecast, loading, error, extrasLoading, extrasError, periodChoice, onPeriodChange, onRetry, onRetryExtras, navigate }) {
  if (loading) return <section className="ws-card ws-report-state"><RefreshCw/><h2>Preparing your financial overview</h2><p>We’re gathering the records saved in this workspace.</p></section>;
  if (!data?.period) return <section className="ws-card ws-report-state"><ChartNoAxesCombined/><h2>Your financial overview could not be loaded</h2><p>{error || "Try again to load your workspace records."}</p><button className="ws-button primary" onClick={onRetry}><RefreshCw/> Try again</button></section>;
  const p = data.period;
  const receivables = extras?.receivables;
  const payables = extras?.payables;
  const monthly = asList(data.monthly);
  const incomeValues = monthly.map(row => Number(row.income) || 0);
  const positiveMonths = incomeValues.filter(value => value > 0).length;
  const hasMonthlyHistory = monthly.length >= 2 && positiveMonths > 0;
  const rangeLabels = { month: "This month", "30days": "Last 30 days", "90days": "Last 90 days", year: "This year" };
  return <div className="ws-report-page ws-financial-health">
    <section className="ws-report-hero"><div><span>BUSINESS FINANCIAL HEALTH</span><h2>A clear picture of your business finances</h2><p>These figures come from invoices, supplier bills and payments recorded in this workspace. Estimated profit and cash available are different measures.</p></div><span className="ws-report-hero-icon"><ChartNoAxesCombined/></span></section>
    <section className="ws-health-toolbar"><div><b>Reporting period</b><small>Choose which saved activity to review.</small></div><select aria-label="Financial health reporting period" value={periodChoice} onChange={event => onPeriodChange(event.target.value)}><option value="month">This month</option><option value="30days">Last 30 days</option><option value="90days">Last 90 days</option><option value="year">This year</option></select></section>
    {error && <div className="ws-report-warning" role="status"><span>{error}</span><button className="ws-button secondary" onClick={onRetry}>Retry</button></div>}
    <section className="ws-health-grid">
      {[["Income",p.income,"Issued invoices, excluding tax",CircleDollarSign], ["Expenses",p.expenses,"Finalized supplier bills, excluding tax",WalletCards], ["Estimated profit",p.estimatedProfit,"Income minus recorded supplier costs",ChartNoAxesCombined], ["Cash received",p.cashReceived,"Customer payments recorded",ArrowDownLeft], ["Cash paid out",p.cashPaidOut,"Supplier payments recorded",ArrowUpRight], ["Net cash flow",p.netCashFlow,"Received minus paid during this period",Repeat]].map(([label,value,note,Icon])=><article className="ws-report-metric" key={label}><span><Icon size={15}/>{label}</span><b>{formatMoney(value,data.currencyCode)}</b><small>{note}</small></article>)}
    </section>
    <div className="ws-health-two-col">
      <section className="ws-card ws-report-card"><div className="ws-report-card-heading"><div><span>CUSTOMERS</span><h3>Money still owed to you</h3><p>Open invoice balances, including amounts past their due date.</p></div><b>{receivables ? formatMoney(receivables.totalOutstanding,receivables.currencyCode||data.currencyCode) : "—"}</b></div>{receivables ? <div className="ws-health-balance"><span>Overdue<b>{formatMoney(receivables.totalOverdue,receivables.currencyCode||data.currencyCode)}</b></span><span>Open invoices<b>{receivables.buckets?.reduce((sum,bucket)=>sum+Number(bucket.invoiceCount||0),0) || 0}</b></span><button className="ws-button secondary" onClick={()=>navigate("/app/invoices")}>Review invoices <ArrowRight/></button></div> : <div className="ws-report-inline-state">{extrasLoading ? "Loading customer balances…" : "Customer balances aren’t available right now."}</div>}</section>
      <section className="ws-card ws-report-card"><div className="ws-report-card-heading"><div><span>SUPPLIERS</span><h3>Supplier bills to plan for</h3><p>Open bills help you see upcoming and overdue obligations.</p></div><b>{payables ? formatMoney(payables.totalOutstanding,payables.currencyCode||data.currencyCode) : "—"}</b></div>{payables ? <div className="ws-health-balance"><span>Overdue<b>{formatMoney(payables.totalOverdue,payables.currencyCode||data.currencyCode)}</b></span><span>Due in 30 days<b>{formatMoney(payables.dueWithin30Days,payables.currencyCode||data.currencyCode)}</b></span><button className="ws-button secondary" onClick={()=>navigate("/app/supplier-invoices")}>Review bills <ArrowRight/></button></div> : <div className="ws-report-inline-state">{extrasLoading ? "Loading supplier balances…" : "Supplier balances aren’t available right now."}</div>}</section>
    </div>
    <section className="ws-card ws-report-card ws-forecast-card"><div className="ws-report-card-heading"><div><span>30-DAY CASH-FLOW FORECAST</span><h3>Payments currently due</h3><p>Outstanding invoices and bills due from {forecast?.asOf || "today"} to {forecast?.through || "30 days from today"}. Payment dates are estimates.</p></div><button className="ws-button secondary" onClick={onRetryForecast} disabled={forecastLoading}><RefreshCw/>{forecastLoading ? "Updating…" : "Refresh forecast"}</button></div>{forecastError ? <div className="ws-report-warning" role="status"><span>{forecastError}</span><button className="ws-button secondary" onClick={onRetryForecast}>Try again</button></div> : forecastLoading && !forecast ? <div className="ws-report-inline-state">Loading outstanding items…</div> : forecast ? <><div className="ws-health-grid ws-forecast-summary">{[["Expected in",forecast.expectedIncoming], ["Expected out",forecast.expectedOutgoing], ["Net expected movement",forecast.expectedNetMovement], ["Overdue customer balances",forecast.overdueIncoming], ["Overdue supplier bills",forecast.overdueOutgoing]].map(([label,value])=><article className="ws-report-metric" key={label}><span>{label}</span><b>{formatMoney(value,forecast.currencyCode)}</b><small>Due amounts only · payment is not guaranteed</small></article>)}</div>{forecast.scheduledItems?.length ? <><ForecastWeeklyChart forecast={forecast}/><div className="ws-forecast-items">{forecast.scheduledItems.map((item,index)=><article key={`${item.direction}-${item.reference}-${index}`}><span className={`ws-forecast-direction ${item.direction?.toLowerCase()}`}>{item.direction === "Incoming" ? <ArrowDownLeft/> : <ArrowUpRight/>}{item.direction === "Incoming" ? "Customer due" : "Supplier due"}</span><div><b>{item.counterparty}</b><small>{item.reference} · due {new Date(`${item.dueDate}T00:00:00`).toLocaleDateString("en-NG",{day:"numeric",month:"short",year:"numeric"})}</small></div><strong>{formatMoney(item.amount,forecast.currencyCode)}</strong></article>)}</div></> : <div className="ws-report-inline-state">No open invoices or bills have due dates in the next 30 days.</div>}<details className="ws-report-details"><summary>What this forecast includes and leaves out</summary>{forecast.assumptions?.map((note,index)=><p key={index}>{note}</p>)}</details></> : null}</section>
    <section className="ws-card ws-report-card"><div className="ws-report-card-heading"><div><span>INCOME AND COSTS</span><h3>Activity by month</h3><p>{hasMonthlyHistory ? `${positiveMonths} of ${monthly.length} months in this period have recorded sales.` : "There isn’t enough recorded history in this period to assess income consistency."}</p></div><span className="ws-report-count">{p.invoiceCount} invoices · {p.billCount} bills</span></div><Table data={monthly} variant="financial-monthly" currencyCode={data.currencyCode} emptyMessage="No activity recorded for this period."/></section>
    <section className="ws-health-notes"><article><Shield/><div><b>How to read this overview</b><p>Estimated profit uses recorded invoices and supplier bills. It is not your bank balance. Cash flow counts recorded customer and supplier payments.</p></div></article><article><CircleHelp/><div><b>Keep your records complete</b><p>This view cannot include costs you haven’t recorded. Add supplier bills for business costs, and upload a bank statement when you want to reconcile transactions.</p><div><button className="ws-text-button" onClick={()=>navigate("/app/supplier-invoices")}>Record a supplier bill <ArrowRight/></button><button className="ws-text-button" onClick={()=>navigate("/app/bank-import")}>Reconcile a statement <ArrowRight/></button></div></div></article></section>
    {extrasError && <div className="ws-report-warning" role="status"><span>{extrasError}</span><button className="ws-button secondary" onClick={onRetryExtras} disabled={extrasLoading}>{extrasLoading ? "Retrying…" : "Retry balances"}</button></div>}
    <details className="ws-report-details ws-report-caveats"><summary>Calculation notes</summary>{data.caveats?.map((note,index)=><p key={index}>{note}</p>)}<p>Reporting period: {rangeLabels[periodChoice]} ({p.from} to {p.to}). Amounts use {data.currencyCode}, your workspace currency.</p></details>
  </div>;
}

function FinancialRecordsPage({ data, loading, error, periodChoice, onPeriodChange, onRetry, onDownload, onShare, busy }) {
  const [shareConsent, setShareConsent] = useState(false);
  useEffect(() => { setShareConsent(false); }, [data?.from, data?.to, data?.generatedAt]);
  const currency = data?.currencyCode || "NGN";
  const metrics = data ? [
    ["Income from invoices", data.income, `${data.invoiceCount} invoices in this period`],
    ["Supplier bill expenses", data.expenses, `${data.billCount} bills in this period`],
    ["Estimated profit", data.estimatedProfit, "Income less recorded supplier bill costs"],
    ["Customer payments received", data.cashReceived, "Payments recorded in this period"],
    ["Supplier payments made", data.cashPaidOut, "Payments recorded in this period"],
    ["Net cash flow", data.netCashFlow, "Payments received less payments made"],
    ["Open customer balances", data.receivables, "Current unpaid invoice balances"],
    ["Open supplier bills", data.payables, "Current unpaid supplier bill balances"]
  ] : [];
  return <div className="ws-report-page ws-financial-records">
    <section className="ws-report-hero"><div><span>BUSINESS FINANCIAL RECORDS</span><h2>Organise your records for review</h2><p>Preview a summary of your saved business activity and download a copy to share if you choose. Invoice AI does not send it to lenders or other organisations.</p></div><span className="ws-report-hero-icon"><FileText/></span></section>
    <section className="ws-health-toolbar"><div><b>Reporting period</b><small>Balances still owed are current balances as of report generation.</small></div><select aria-label="Financial records reporting period" value={periodChoice} onChange={event => onPeriodChange(event.target.value)}><option value="month">This month</option><option value="90days">Last 90 days</option><option value="year">This year</option></select></section>
    {loading && <section className="ws-card ws-report-state"><RefreshCw/><h2>Preparing your report</h2><p>We’re gathering records from your workspace.</p></section>}
    {!loading && error && <section className="ws-card ws-report-state"><CircleHelp/><h2>Your report could not be loaded</h2><p>{error}</p><button className="ws-button primary" onClick={onRetry}><RefreshCw/> Try again</button></section>}
    {!loading && data && <>
      <section className="ws-health-grid">{metrics.map(([label,amount,note])=><article className="ws-report-metric" key={label}><span>{label}</span><b>{formatMoney(amount,currency)}</b><small>{note}</small></article>)}</section>
      <section className="ws-card ws-report-card"><div className="ws-report-card-heading"><div><span>BUSINESS PROFILE</span><h3>{data.business?.name || "Business details"}</h3><p>{[data.business?.city,data.business?.region,data.business?.countryCode].filter(Boolean).join(", ") || "No business address added"} · {data.business?.email || data.business?.phone || "No contact details added"}</p></div><span className="ws-report-count">{currency}</span></div></section>
      <section className="ws-card ws-report-card"><div className="ws-report-card-heading"><div><span>MONTH BY MONTH</span><h3>Recorded activity</h3><p>{data.from} to {data.to} · Generated {new Date(data.generatedAt).toLocaleString()}</p></div><div className="ws-financial-records-actions"><button className="ws-button secondary" onClick={async()=>{await onShare();setShareConsent(false)}} disabled={busy || !shareConsent || !navigator.share}><Share2/>{busy ? "Preparing PDF…" : "Share report"}</button><button className="ws-button primary" onClick={onDownload} disabled={busy}><FileText/>{busy ? "Preparing PDF…" : "Download PDF"}</button></div></div><Table data={asList(data.monthly)} variant="financial-monthly" currencyCode={currency} emptyMessage="No activity recorded for this period."/><label className="ws-financial-records-consent"><input type="checkbox" checked={shareConsent} onChange={event=>setShareConsent(event.target.checked)}/><span><b>I consent to sharing this report with a destination I choose</b><small>Sharing is optional. Nothing leaves Invoice AI unless you check this box, press Share report, and choose a recipient in your device’s share menu. You can download a private copy without giving sharing consent.</small></span></label>{!navigator.share&&<p className="ws-muted" role="status">Your browser does not support direct sharing. You can still download the PDF and share it yourself.</p>}</section>
      <section className="ws-card ws-report-card"><div className="ws-report-card-heading"><div><span>PAYMENT HISTORY</span><h3>Payments recorded in this period</h3><p>Latest {asList(data.payments).length} of {data.totalPaymentRecords ?? asList(data.payments).length} customer and supplier entries.</p></div></div>{asList(data.payments).length ? <div className="ws-record-payment-list">{asList(data.payments).map((payment,index)=><article key={`${payment.paidOn}-${payment.documentNumber}-${index}`}><div><b>{payment.party} <span className={`ws-record-payment-direction ${payment.direction === "Received" ? "incoming" : "outgoing"}`}>{payment.direction}</span></b><small>{payment.documentNumber} · {payment.method} · {new Date(`${payment.paidOn}T00:00:00`).toLocaleDateString("en-NG",{day:"numeric",month:"short",year:"numeric"})}{payment.reference ? ` · Ref ${payment.reference}` : ""}</small></div><strong>{formatMoney(payment.amount,payment.currencyCode)}<small>{payment.status}</small></strong></article>)}</div> : <div className="ws-report-inline-state">No customer or supplier payments were recorded in this period.</div>}<p className="ws-muted">“Recorded” entries may be entered manually and are not independently verified by this report. Reversed entries are labelled.</p></section>
      <section className="ws-card ws-report-card ws-readiness-card"><div className="ws-report-card-heading"><div><span>RECORDS CHECKLIST</span><h3>What is on file for this period</h3><p>This is a practical checklist, not a credit score or loan decision.</p></div><span className="ws-report-count">No readiness score</span></div><div className="ws-readiness-list">{data.coverage?.items?.map((item,index)=><article key={item.label+index}><span className={`ws-readiness-status ${item.status === "Recorded" || item.status === "Reviewed" ? "is-ready" : item.status === "Review needed" ? "needs-review" : "not-added"}`} aria-hidden="true">{item.status === "Recorded" || item.status === "Reviewed" ? <CheckCircle2/> : <CircleHelp/>}</span><div><b>{item.label}</b><p>{item.detail}</p></div><strong>{item.status}</strong></article>)}</div><p className="ws-muted">Bank statement lines: {data.coverage?.importedStatementLines ?? 0} imported · {data.coverage?.matchedStatementLines ?? 0} matched · {data.coverage?.ignoredStatementLines ?? 0} reviewed without a match · {data.coverage?.unresolvedStatementLines ?? 0} unresolved.</p></section>
      <section className="ws-health-two-col"><article className="ws-card ws-report-card"><div className="ws-report-card-heading"><div><span>CUSTOMER BALANCES</span><h3>Money still owed to you</h3></div><b>{formatMoney(data.receivables,currency)}</b></div><p className="ws-muted">Overdue: {formatMoney(data.overdueReceivables,currency)}</p></article><article className="ws-card ws-report-card"><div className="ws-report-card-heading"><div><span>SUPPLIER BALANCES</span><h3>Money you still owe</h3></div><b>{formatMoney(data.payables,currency)}</b></div><p className="ws-muted">Overdue: {formatMoney(data.overduePayables,currency)}</p></article></section>
      <details className="ws-report-details" open><summary>What this report includes</summary>{data.notes?.map((note,index)=><p key={index}>{note}</p>)}</details>
    </>}
  </div>;
}

function CreditReadinessPage({ data, loading, error, onRetry, navigate }) {
  const readiness = buildCreditReadiness(data);
  return <div className="ws-report-page ws-credit-readiness">
    <section className="ws-report-hero"><div><span>GET YOUR RECORDS READY</span><h2>Credit readiness</h2><p>Keep useful business records together before you speak with a lender or financial provider.</p></div><span className="ws-report-hero-icon"><Shield/></span></section>
    <section className="ws-card ws-report-card ws-credit-readiness-intro"><span className="ws-readiness-icon"><FileText/></span><div><h3>Build a clearer picture of your business</h3><p>Review the records you have saved and take simple steps to fill any gaps. Requirements differ between providers, and only a provider can assess an application.</p></div><button className="ws-button secondary" onClick={()=>navigate("/app/financial-records")}><FileText/> View financial records</button></section>
    {loading && <section className="ws-card ws-report-state" role="status"><RefreshCw/><h2>Checking your records</h2><p>We’re gathering information saved in this workspace.</p></section>}
    {!loading && error && <section className="ws-card ws-report-state" role="alert"><CircleHelp/><h2>We couldn’t check your records</h2><p>{error}</p><button className="ws-button primary" onClick={onRetry}><RefreshCw/> Try again</button></section>}
    {!loading && data && <>
      <section className="ws-card ws-report-card ws-readiness-checklist ws-readiness-card"><div className="ws-report-card-heading"><div><span>YOUR RECORD CHECKLIST</span><h3>{readiness.recorded} of {readiness.total} record areas have information</h3><p>{readiness.summary}</p></div><button className="ws-button secondary" onClick={onRetry}><RefreshCw/> Refresh</button></div>
        <div className="ws-readiness-progress" role="progressbar" aria-label="Record areas with information" aria-valuemin={0} aria-valuemax={readiness.total} aria-valuenow={readiness.recorded}><span style={{width:`${readiness.total ? readiness.recorded / readiness.total * 100 : 0}%`}}/></div>
        {readiness.items.length ? <div className="ws-readiness-list">{readiness.items.map((item,index)=><article key={`${item.label}-${index}`}><span className={`ws-readiness-status ${item.complete ? "is-ready" : item.status === "Review needed" ? "needs-review" : "not-added"}`} aria-hidden="true">{item.complete ? <CheckCircle2/> : <CircleHelp/>}</span><div><b>{item.label}</b><p>{item.detail}</p></div><strong>{item.status}</strong>{item.action && <button className="ws-text-button" onClick={()=>navigate(item.action.path)}>{item.action.label}<ArrowRight/></button>}</article>)}</div> : <p className="ws-report-inline-state">Your checklist is empty right now. Refresh this page or review financial records.</p>}
      </section>
      <section className="ws-credit-readiness-note"><Shield/><p><b>This is a record organiser, not a credit score.</b> Invoice AI does not decide whether you qualify for credit, guarantee approval, or send your information to a provider. Review each provider’s terms and share records only when you choose.</p></section>
      <section className="ws-credit-readiness-actions"><button className="ws-button primary" onClick={()=>navigate("/app/financial-records")}><FileText/> Open financial records</button><button className="ws-button secondary" onClick={()=>navigate("/app/financial-guidance")}><CircleHelp/> Learn about business finances</button></section>
    </>}
  </div>;
}

function DashboardOverview({ data, trend, trendLoading, trendError, records, recordsLoading, onRetryTrend, navigate, refresh, onStartTour, onPaymentSetup, setQuestion }) {
  const summary = data?.data ?? data?.result ?? data ?? {};
  const read = (object, key) => object?.[key] ?? object?.[`${key[0].toUpperCase()}${key.slice(1)}`];
  const period = read(summary, "period") || summary;
  const periodValues = {
    income: read(period, "income"), expenses: read(period, "expenses"),
    estimatedProfit: read(period, "estimatedProfit"), cashReceived: read(period, "cashReceived"),
    invoiceCount: read(period, "invoiceCount"), from: read(period, "from"), to: read(period, "to")
  };
  if (![periodValues.income, periodValues.expenses, periodValues.estimatedProfit, periodValues.cashReceived, periodValues.invoiceCount].some(value => value != null)) {
    return <section className="ws-card ws-dashboard-unavailable"><span className="ws-task-icon"><ChartNoAxesCombined/></span><h2>We couldn’t read your financial summary</h2><p className="ws-muted">Try again in a moment. Your invoices and other workspace pages are still available from the menu.</p><button className="ws-button primary" onClick={refresh}><RefreshCw/> Try again</button></section>;
  }
  const values = [periodValues.income, periodValues.expenses, periodValues.estimatedProfit, periodValues.cashReceived].map(value => Number(value) || 0);
  const isNew = records?.counts?.total != null
    ? Number(records.counts.total) === 0
    : Number(periodValues.invoiceCount) === 0 && values.every(value => value === 0);
  const dateLabel = periodValues.from && periodValues.to
    ? `${new Date(`${periodValues.from}T00:00:00`).toLocaleDateString("en-NG", { day: "numeric", month: "short" })} – ${new Date(`${periodValues.to}T00:00:00`).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}`
    : "Current financial period";
  const metrics = [
    ["Income", periodValues.income, CircleDollarSign, "income", "Sales recorded in this period"],
    ["Expenses", periodValues.expenses, WalletCards, "expenses", "Supplier costs recorded"],
    ["Estimated profit", periodValues.estimatedProfit, ChartNoAxesCombined, "profit", "Income less expenses"],
    ["Cash received", periodValues.cashReceived, CreditCard, "cash", "Payments received"],
  ];
  const actions = [
    ["/app/invoice-new", "Create an invoice", "Send your first sales invoice", FileText],
    ["/app/customers", "Add a customer", "Save a customer for faster invoicing", Users],
    ["/app/upload-supplier-invoice", "Upload a supplier invoice", "Let AI capture the bill details", Upload],
    ["/app/reports", "Explore reports", "Review income, expenses and cash flow", ChartNoAxesCombined],
  ];

  return <div className="ws-dashboard">
    <section className={`ws-dashboard-hero${isNew ? " is-new" : ""}`}>
      <div className="ws-dashboard-hero-copy">
        <span className="ws-dashboard-kicker"><Sparkles size={14}/> YOUR FINANCES</span>
        <h2>{isNew ? "Your workspace is ready" : "Your finances, at a glance"}</h2>
        <p>{isNew
          ? "Create your first invoice to start tracking income, payments and financial performance here."
          : `Here’s your financial activity for ${dateLabel}. Your figures update as invoices, bills and payments are recorded.`}</p>
        <div className="ws-dashboard-hero-actions">
          <button className="ws-button primary" onClick={() => navigate("/app/invoice-new")}><Plus/> Create invoice</button>
          <button className="ws-button hero-secondary" onClick={() => navigate("/app/customers")}><Users/> Add customer</button>
          <button className="ws-button hero-secondary ws-dashboard-payment-setup" onClick={onPaymentSetup}><WalletCards/> Get paid online</button>
          <button className="ws-button hero-secondary ws-tour-launch" onClick={onStartTour}><CircleHelp/> Take a tour</button>
        </div>
      </div>
      <div className="ws-dashboard-art" aria-hidden="true"><div className="ws-art-orbit orbit-one"/><div className="ws-art-orbit orbit-two"/><span className="ws-art-icon"><ChartNoAxesCombined/></span><span className="ws-art-chip"><CheckCircle2/> Clear financial picture</span></div>
    </section>

    <div className="ws-section-heading"><div><h2>Financial overview</h2><p>Key figures for your current reporting period</p></div><span className="ws-period-chip"><CalendarDays/>{dateLabel}</span></div>
    <section className="ws-metrics">{metrics.map(([label,value,Icon,tone,description])=><article className={`ws-metric ${tone}`} key={label}><div className="ws-metric-top"><span>{label}</span><i><Icon/></i></div><b>{formatMoney(value, read(summary, "currencyCode") || "NGN")}</b><small>{description}</small></article>)}</section>

    <MonthlyCashFlowChart rows={trend?.monthly} currencyCode={trend?.currencyCode || read(summary,"currencyCode") || "NGN"} loading={trendLoading} error={trendError} onRetry={onRetryTrend}/>

    <DashboardPanels records={records} recordsLoading={recordsLoading} periodIncome={periodValues.income} currencyCode={read(summary,"currencyCode") || "NGN"} navigate={navigate} setQuestion={setQuestion}/>
    <div className="ws-section-heading ws-actions-heading"><div><h2>{isNew ? "Get started" : "Quick actions"}</h2><p>{isNew ? "A few simple steps will make this dashboard more useful." : "Common tasks, ready when you are."}</p></div></div>
    <section className="ws-action-grid">{actions.map(([href,title,description,Icon],index)=><button className={`ws-action-card action-${index+1}`} key={href} onClick={() => navigate(href)}><span><Icon/></span><span className="ws-action-copy"><b>{title}</b><small>{description}</small></span><ArrowUpRight className="ws-action-arrow"/></button>)}</section>
  </div>;
}

function AssistantFinancialVisualization({ result }) {
  const summarySource = result?.sources?.find(source => source?.succeeded && source?.tool === "get_financial_summary");
  const summary = summarySource?.data;
  const period = summary?.period;
  const months = Array.isArray(summary?.monthly) ? summary.monthly : [];
  if (!period || !months.length) return null;

  const currencyCode = summary.currencyCode || "NGN";
  const chartRows = months.map(row => {
    const match = /^(\d{4})-(\d{1,2})/.exec(String(row.month || ""));
    const month = match
      ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1)).toLocaleDateString("en", { month: "short", timeZone: "UTC" })
      : String(row.month || "").slice(0, 8);
    return { month, income: Number(row.income) || 0, expenses: Number(row.expenses) || 0 };
  });
  const canChart = chartRows.length > 1 && chartRows.some(row => row.income > 0 || row.expenses > 0);
  const insights = [
    ["Total income", period.income],
    ["Total expenses", period.expenses],
    ["Estimated profit", period.estimatedProfit],
    ["Net cash flow", period.netCashFlow]
  ];

  return <section className="ws-assistant-insights" aria-label="Financial visualization from your records">
    {canChart && <div className="ws-assistant-chart-card">
      <div className="ws-assistant-visual-heading"><ChartNoAxesCombined/><h3>Income vs expenses</h3><span>{chartRows.length} months</span></div>
      <div className="ws-assistant-chart-legend"><span><i className="income"/>Income</span><span><i className="expenses"/>Expenses</span></div>
      <GroupedMoneyChart rows={chartRows.map(row=>({month:row.month,income:row.income,expenses:row.expenses}))} currencyCode={currencyCode} label={`Monthly income and expenses for ${chartRows.length} months`}/>
      <small className="ws-assistant-chart-note">Monthly income and supplier expenses recorded in this workspace.</small>
    </div>}
    <aside className="ws-assistant-key-insights"><h3><Sparkles/> Key insights</h3>{insights.map(([label, value])=><div key={label}><CheckCircle2/><span>{label}<b>{formatMoney(value, currencyCode)}</b></span></div>)}<small>Profit is estimated from recorded income and supplier bills.</small></aside>
  </section>;
}

function FinancialAssistantPage({ tools, question, setQuestion, result, busy, onAsk, onNewChat, messages, deviceBusy, deviceProgress, onAskOnDevice, deviceConfigured }) {
  const [deviceSdkReady, setDeviceSdkReady] = useState(false);
  useEffect(() => {
    let active = true;
    if (deviceConfigured) preloadOnDeviceSdk().then(() => { if (active) setDeviceSdkReady(true); }).catch(() => {});
    return () => { active = false; };
  }, [deviceConfigured]);
  const prompts = ["Which invoices are overdue?", "How much did I receive this month?", "Compare my income and expenses."];
  return <div className="ws-report-page ws-assistant-page">
    <section className="ws-report-hero assistant"><div><span>INVOICE AI ASSISTANT</span><h2>Ask a clear question about your finances</h2><p>Get answers based on the invoices, payments and supplier bills recorded in your workspace.</p></div><span className="ws-report-hero-icon"><Bot/></span></section>
    <section className="ws-card ws-assistant-card"><div className="ws-assistant-intro"><span className="ws-assistant-icon"><Sparkles/></span><div><h3>Your conversation</h3><p>Ask in everyday language. Your workspace data stays permission-checked.</p></div><button className="ws-button secondary ws-assistant-new-chat" type="button" onClick={onNewChat}>New chat</button></div>{messages.length===0?<div className="ws-assistant-conversation ws-assistant-empty-chat"><article className="ws-assistant-message model"><span className="ws-chat-avatar"><Bot/></span><div><b>Invoice AI</b><p>Hello! How can I help you with your business finances today?</p><p>Ask me about income, expenses, estimated profit, cash flow, overdue invoices, or bills.</p></div></article>{prompts.map(prompt=><button className="ws-assistant-suggestion" type="button" key={prompt} onClick={()=>setQuestion(prompt)}>{prompt}<ArrowUpRight/></button>)}</div>:<div className="ws-assistant-conversation" aria-live="polite">{messages.map((message,index)=><article className={`ws-assistant-message ${message.role}`} key={`${index}-${message.role}`}><span className="ws-chat-avatar">{message.role==="user"?"You":<Bot/>}</span><div><b>{message.role==="user"?"You":"Invoice AI"}</b><p>{message.text}</p>{message.role==="model"&&index===messages.length-1&&result?.sources?.length>0&&<AssistantFinancialVisualization result={result}/>}</div></article>)}</div>}<form className="ws-ask ws-assistant-form" onSubmit={onAsk}><textarea aria-label="Your message" id="financial-assistant-question" value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Message Invoice AI…" required/><div className="ws-assistant-form-footer"><small>AI answers use your saved financial records.</small><div className="ws-assistant-submit-actions"><button className="ws-button primary" disabled={busy||deviceBusy||!question.trim()}>{busy?<><RefreshCw className="ws-spin"/> Thinking…</>:<><Bot/> Send</>}</button><button className="ws-button secondary ws-on-device-button" type="button" disabled={busy||deviceBusy||!question.trim()||!deviceConfigured||!deviceSdkReady} onClick={onAskOnDevice} title="General answers on this device; cannot read workspace records">{deviceBusy?<><RefreshCw className="ws-spin"/> Preparing…</>:<><Shield/> On-device</>}</button></div></div></form></section>
    {asList(tools).length>0&&<section className="ws-card ws-assistant-capabilities"><div><span>AVAILABLE DATA</span><h3>What the assistant can check</h3></div><div>{asList(tools).slice(0,6).map((tool,index)=><span key={tool.name||tool.id||index}><CheckCircle2/>{tool.name||tool.title||tool.description||"Workspace finance data"}</span>)}</div></section>}
  </div>;
}

function FinancialGuidancePage({ navigate, setQuestion }) {
  const ask = question => { setQuestion(question); navigate("/app/assistant"); };
  const lessons = [
    [CircleDollarSign, "Income and revenue", "The value of sales you record. An invoice can show a sale even before the customer pays."],
    [ChartNoAxesCombined, "Estimated profit", "Income minus the supplier bill costs recorded here. It is an estimate and may leave out costs you have not recorded, such as rent or salaries."],
    [Repeat, "Cash flow", "Money actually recorded as received minus money recorded as paid. A positive invoice balance is still owed money, not cash in your account."],
    [FileText, "Invoice and receipt", "An invoice asks a customer to pay. A receipt or payment record records a payment; keep them for different steps."],
    [WalletCards, "Record every business cost", "Save supplier bills and other business costs as they happen, including cash costs. Profit can look higher than it is when costs are missing."],
    [CalendarDays, "Plan for irregular income", "When sales change from month to month, plan using money already received and bills that are due. Treat unpaid invoices as uncertain until they arrive."],
    [Users, "Follow up unpaid invoices", "Check the due date, contact the customer politely, and keep a note of the follow-up. An overdue invoice is money owed, not money received."],
    [Building2, "Plan supplier obligations", "Keep supplier bill due dates up to date. Review what is due soon so you can plan payments before the deadline."],
    [CreditCard, "Understand payment fees", "Payment providers may deduct fees. Check the provider’s official fee information and compare the final settlement with your transaction records."],
    [Shield, "Build useful financial records", "Keep invoices, supplier bills, payment references and bank statements together. Reconcile statement lines carefully; a suggested match is not proof of payment."]
  ];
  return <div className="ws-report-page ws-financial-guidance">
    <section className="ws-report-hero"><div><span>FINANCIAL BASICS &amp; PAYMENT SAFETY</span><h2>Clear money guidance for everyday business</h2><p>Short explanations you can use when recording invoices, supplier costs and payments. These are general guides, not accounting or legal advice.</p></div><span className="ws-report-hero-icon"><Shield/></span></section>
    <section className="ws-health-grid ws-guidance-lessons">{lessons.map(([Icon,title,body])=><article className="ws-card" key={title}><span className="ws-guidance-icon"><Icon/></span><h3>{title}</h3><p>{body}</p><button className="ws-text-button" onClick={()=>ask(`Explain ${title.toLowerCase()} for a small business in simple words, using my recorded data only if needed.`)}>Ask Invoice AI about this <ArrowRight/></button></article>)}</section>
    <section className="ws-card ws-safety-card"><div className="ws-safety-heading"><span><Shield/></span><div><p>BEFORE YOU MARK A PAYMENT AS PAID</p><h3>Check that the money really arrived</h3><small>A screenshot or SMS can be edited or delayed. It is not proof on its own.</small></div></div><ol><li>Open your bank or payment provider using its official app or website.</li><li>Check the transaction status and amount in the account that received the money.</li><li>Keep the reference and record the payment in Invoice AI only after confirming it.</li><li>Never share your PIN, password, card security code or one-time verification code.</li></ol><div className="ws-safety-footer"><b>If it is not confirmed, leave it as pending.</b><button className="ws-button secondary" onClick={()=>ask("How can I check whether a customer payment really arrived? Give simple safety steps and do not claim you can detect every scam.")}>Ask Invoice AI about a payment <ArrowRight/></button></div></section>
    <section className="ws-card ws-guidance-tip"><CircleHelp/><div><b>Need help with a real example?</b><p>Ask Invoice AI to explain a term or help you understand recorded workspace figures. It will say when the records do not contain enough information.</p></div><button className="ws-button primary" onClick={()=>ask("Explain the difference between my recorded income, estimated profit and cash flow in simple words.")}>Ask Invoice AI <ArrowRight/></button></section>
  </div>;
}

function FinancialReportsPage({ data, extras, extrasLoading, extrasError, loading, error, onRetry, onRetryExtras }) {
  if (loading && !data) return <section className="ws-card ws-report-state"><RefreshCw/><h2>Loading your reports</h2><p>Your income, expenses and payment summaries are being gathered.</p></section>;
  if (!data?.period) return <section className="ws-card ws-report-state"><ChartNoAxesCombined/><h2>Your reports could not be loaded</h2><p>{error || "There is no report data to show yet. Try again."}</p><button className="ws-button primary" onClick={onRetry}><RefreshCw/> Try again</button></section>;
  const period = data.period;
  const agingCards = [
    ["Receivables aging", extras?.receivables, "customers", "Customer balances by due date"],
    ["Payables aging", extras?.payables, "suppliers", "Supplier bills by due date"]
  ];
  return <div className="ws-report-page">
    <section className="ws-report-hero"><div><span>FINANCIAL REPORTS</span><h2>Understand where your money stands</h2><p>Income and supplier costs recorded from {period.from} to {period.to}. Amounts use your workspace currency, {data.currencyCode}.</p></div><span className="ws-report-hero-icon"><ChartNoAxesCombined/></span></section>
    <section className="ws-report-metrics">
      {[["Income",period.income,"Sales invoices, excluding tax"],["Expenses",period.expenses,"Finalized supplier bills, excluding tax"],["Estimated profit",period.estimatedProfit,"Income minus recorded expenses"],["Cash received",period.cashReceived,"Payments received from customers"],["Cash paid out",period.cashPaidOut,"Payments made to suppliers"],["Net cash flow",period.netCashFlow,"Cash received minus cash paid"]].map(([label,value,note])=><article className="ws-report-metric" key={label}><span>{label}</span><b>{formatMoney(value,data.currencyCode)}</b><small>{note}</small></article>)}
    </section>
    <section className="ws-card ws-report-card"><div className="ws-report-card-heading"><div><span>MONTH BY MONTH</span><h3>Income and spending</h3><p>See how invoiced income and supplier costs changed during this period.</p></div><span className="ws-report-count">{period.invoiceCount} invoices · {period.billCount} bills</span></div><MonthlyIncomeExpenseChart rows={data.monthly} currencyCode={data.currencyCode}/><Table data={data.monthly} variant="financial-monthly" currencyCode={data.currencyCode} emptyMessage="No activity in this reporting period."/></section>
    <section className="ws-report-two-col">{agingCards.map(([title,report,detailKey,description])=><article className="ws-card ws-report-card" key={title}><div className="ws-report-card-heading"><div><span>OPEN BALANCES</span><h3>{title}</h3><p>{description}</p></div><b>{report ? formatMoney(report.totalOutstanding,report.currencyCode||data.currencyCode) : "—"}</b></div>{report ? <><div className="ws-report-mini-stats"><span>Overdue<b>{formatMoney(report.totalOverdue,report.currencyCode||data.currencyCode)}</b></span>{title.startsWith("Payables")&&<span>Due in 30 days<b>{formatMoney(report.dueWithin30Days,report.currencyCode||data.currencyCode)}</b></span>}</div><Table data={report.buckets} variant="aging-buckets" currencyCode={report.currencyCode||data.currencyCode} emptyMessage="No open balances."/><details className="ws-report-details"><summary>View by {detailKey === "customers" ? "customer" : "supplier"}</summary><Table data={report[detailKey]} variant="aging-entities" currencyCode={report.currencyCode||data.currencyCode} emptyMessage={`No open ${detailKey}.`}/></details></> : <div className="ws-report-inline-state">{extrasLoading ? "Loading this report…" : "This report could not be loaded."}</div>}</article>)}</section>
    <section className="ws-card ws-report-card"><div className="ws-report-card-heading"><div><span>SUPPLIER SPENDING</span><h3>Expense activity</h3><p>Bill amounts are grouped by bill date; payments are grouped by payment date.</p></div>{extras?.expenses&&<b>{formatMoney(extras.expenses.netExpenses,extras.expenses.currencyCode||data.currencyCode)}</b>}</div>{extras?.expenses ? <><div className="ws-report-mini-stats"><span>Tax on expenses<b>{formatMoney(extras.expenses.taxOnExpenses,extras.expenses.currencyCode||data.currencyCode)}</b></span><span>Paid to suppliers<b>{formatMoney(extras.expenses.cashPaid,extras.expenses.currencyCode||data.currencyCode)}</b></span><span>Supplier bills<b>{extras.expenses.billCount}</b></span></div><Table data={extras.expenses.monthly} variant="expense-monthly" currencyCode={extras.expenses.currencyCode||data.currencyCode} emptyMessage="No supplier expenses recorded for this period."/><details className="ws-report-details"><summary>Top suppliers</summary><Table data={extras.expenses.topSuppliers} variant="top-suppliers" currencyCode={extras.expenses.currencyCode||data.currencyCode} emptyMessage="No supplier spending to rank yet."/></details></> : <div className="ws-report-inline-state">{extrasLoading ? "Loading this report…" : "This report could not be loaded."}</div>}</section>
    {extrasError&&<div className="ws-report-warning" role="status"><span>{extrasError}</span><button className="ws-button secondary" onClick={onRetryExtras} disabled={extrasLoading}>{extrasLoading?"Retrying…":"Retry detailed reports"}</button></div>}
    <details className="ws-report-details ws-report-caveats"><summary>How to read these figures</summary>{data.caveats?.map((note,index)=><p key={index}>{note}</p>)}</details>
  </div>;
}

function YearInsightsPage({ data, loading, error, onRetry }) {
  if (loading && !data) return <section className="ws-card ws-report-state"><RefreshCw/><h2>Comparing your results</h2><p>Your current year is being compared with the same dates last year.</p></section>;
  if (!data?.current) return <section className="ws-card ws-report-state"><Sparkles/><h2>Your comparison could not be loaded</h2><p>{error || "Try again to load your year-to-date comparison."}</p><button className="ws-button primary" onClick={onRetry}><RefreshCw/> Try again</button></section>;
  const metrics = [["Income",data.income], ["Expenses",data.expenses], ["Estimated profit",data.estimatedProfit], ["Net cash flow",data.netCashFlow]];
  return <div className="ws-report-page">
    <section className="ws-report-hero insights"><div><span>YEAR OVER YEAR</span><h2>Your business, compared fairly</h2><p>We compare {data.year} so far with the same dates in {data.year-1}. This avoids comparing a partial year with a complete one.</p></div><span className="ws-report-hero-icon"><Sparkles/></span></section>
    <section className="ws-report-compare-grid">{metrics.map(([label,metric])=><article className="ws-card ws-report-compare" key={label}><span>{label}</span><b>{formatMoney(metric?.current,data.currencyCode)}</b><small>Same period last year: {formatMoney(metric?.previous,data.currencyCode)}</small><div className={`ws-report-change${Number(metric?.change)<0?" down":""}`}><span>{Number(metric?.change)>0?"▲":Number(metric?.change)<0?"▼":"•"} {formatMoney(Math.abs(Number(metric?.change)||0),data.currencyCode)}</span><b>{metric?.changePercent==null?"No previous figure":`${metric.changePercent>0?"+":""}${metric.changePercent}%`}</b><small>change over the same period</small></div></article>)}</section>
    <section className="ws-card ws-report-card"><div className="ws-report-card-heading"><div><span>PERIOD DETAILS</span><h3>What’s included</h3><p>Current period: {data.current.from} to {data.current.to} · Comparison period: {data.previousSamePeriod?.from} to {data.previousSamePeriod?.to}</p></div></div><div className="ws-report-metrics compact">{[["Invoices",data.current.invoiceCount],["Supplier bills",data.current.billCount],["Cash received",formatMoney(data.current.cashReceived,data.currencyCode)],["Cash paid out",formatMoney(data.current.cashPaidOut,data.currencyCode)]].map(([label,value])=><article className="ws-report-metric" key={label}><span>{label}</span><b>{value}</b></article>)}</div><details className="ws-report-details"><summary>Metric definitions and notes</summary>{data.caveats?.map((note,index)=><p key={index}>{note}</p>)}</details></section>
  </div>;
}

function SupplierInvoiceUpload({ busy, onUpload }) {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  function chooseFile(nextFile) {
    if (!nextFile) return;
    const allowed = ["application/pdf", "image/jpeg", "image/png"].includes(nextFile.type) || /\.(pdf|jpe?g|png)$/i.test(nextFile.name);
    if (!allowed) return;
    const transfer = new DataTransfer();
    transfer.items.add(nextFile);
    if (inputRef.current) inputRef.current.files = transfer.files;
    setFile(nextFile);
  }

  function clearFile(event) {
    event.stopPropagation();
    if (inputRef.current) inputRef.current.value = "";
    setFile(null);
  }

  const size = file ? file.size < 1024 * 1024 ? `${Math.max(1, Math.round(file.size / 1024))} KB` : `${(file.size / 1024 / 1024).toFixed(1)} MB` : "";
  return <div className="ws-upload-page">
    <section className="ws-upload-hero"><div className="ws-upload-hero-copy"><span className="ws-upload-kicker"><Sparkles/> YOUR WORKSPACE</span><h2>Upload a supplier <em>bill</em></h2><p>Let Invoice AI read the bill for you. You can review every detail before it is saved.</p><div className="ws-upload-hero-note"><Shield/><span>Your document stays in your workspace.</span></div></div><div className="ws-upload-hero-art" aria-hidden="true"><span className="upload-art-orbit"/><span className="upload-art-sheet"><FileText/><i/><i/><i/></span><span className="upload-art-spark"><Sparkles/></span></div></section>
    <section className="ws-card ws-upload-card"><div className="ws-upload-card-head"><span className="ws-upload-card-icon"><FileText/></span><div><h3>Choose a bill to read</h3><p>Upload a supplier invoice and we’ll fill in the details for you.</p></div></div>
      <form className="ws-upload-flow" onSubmit={onUpload}>
        <label className={`ws-upload-dropzone${dragging ? " is-dragging" : ""}${file ? " has-file" : ""}`} onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files?.[0]); }}>
          <input ref={inputRef} type="file" name="file" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" onChange={event => chooseFile(event.target.files?.[0])}/>
          <span className="ws-upload-drop-icon">{file ? <CheckCircle2/> : <Upload/>}</span>
          {file ? <span className="ws-upload-file-copy"><b>{file.name}</b><small>{size} · Ready to upload</small></span> : <span className="ws-upload-drop-copy"><b>Drag your invoice here</b><small>or <strong>browse files</strong> on your device</small><i>PDF, JPG or PNG</i></span>}
          {file && <button type="button" className="ws-upload-remove" onClick={clearFile} aria-label="Remove selected file">Remove</button>}
        </label>
        <div className="ws-upload-actions"><span><CheckCircle2/> You’ll check the extracted details before creating the bill.</span><button className="ws-button primary" disabled={busy || !file}>{busy ? "Reading your invoice…" : "Upload and read invoice"}<ArrowUpRight/></button></div>
      </form>
    </section>
    <section className="ws-upload-steps" aria-label="What happens next"><article><i>1</i><div><b>Upload the bill</b><small>Choose a PDF or image from your device.</small></div></article><article><i>2</i><div><b>Check what AI found</b><small>Review names, dates, items and totals.</small></div></article><article><i>3</i><div><b>Save your supplier bill</b><small>Confirm it when everything looks right.</small></div></article></section>
  </div>;
}

export default function Workspace({ path, navigate }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const tourChecked = useRef(false);
  useEffect(() => { setMobileNavOpen(false); }, [path]);
  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKeyDown = event => { if (event.key === "Escape") setMobileNavOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileNavOpen]);
  const notificationPrefsKey = `invoice-ai-notification-preferences:${sessionStorage.getItem("invoice-ai-organization") || "default"}`;
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  useEffect(() => { const update = () => setIsOnline(navigator.onLine); window.addEventListener("online", update); window.addEventListener("offline", update); return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); }; }, []);
  const [accountType, setAccountType] = useState(null);
  const [statementFile, setStatementFile] = useState(null);
  const [baseCurrencyCode, setBaseCurrencyCode] = useState("NGN");
  const [billCurrencyCode, setBillCurrencyCode] = useState("NGN");
  const [showArchived, setShowArchived] = useState(false);
  const [customerSummary, setCustomerSummary] = useState(null);
  const [reportExtras, setReportExtras] = useState(null);
  const [reportExtrasLoading, setReportExtrasLoading] = useState(false);
  const [reportExtrasError, setReportExtrasError] = useState("");
  const [healthPeriod, setHealthPeriod] = useState("month");
  const [recordsPeriod, setRecordsPeriod] = useState("year");
  const [forecast, setForecast] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState("");
  const [dashboardTrend, setDashboardTrend] = useState(null);
  const [dashboardTrendLoading, setDashboardTrendLoading] = useState(false);
  const [dashboardTrendError, setDashboardTrendError] = useState("");
  const [dashboardRecords, setDashboardRecords] = useState(null);
  const [dashboardRecordsLoading, setDashboardRecordsLoading] = useState(false);
  const [deviceAssistantBusy, setDeviceAssistantBusy] = useState(false);
  const [deviceAssistantProgress, setDeviceAssistantProgress] = useState(0);
  const modalRef = useRef(null);
  useEffect(() => { api("/api/organization").then(org => { setAccountType(org.accountType === 0 ? "Freelancer" : org.accountType || "Organization"); setBaseCurrencyCode(org.baseCurrencyCode || "NGN"); if (org.isOnboardingComplete === false && path !== "/app/onboarding") navigate("/app/onboarding"); }).catch(() => setAccountType("Organization")); }, []);
  useEffect(() => { if (accountType === "Freelancer" && ["/app/team", "/app/invitations"].includes(path)) navigate("/app"); }, [accountType, path, navigate]);
  const [data, setData] = useState(null), [error, setErrorState] = useState(""), [toast, setToast] = useState(null), [loading, setLoading] = useState(true), [showForm, setShowForm] = useState(false), [editingRecord, setEditingRecord] = useState(null), [question, setQuestion] = useState(""), [answer, setAnswer] = useState(""), [assistantResult, setAssistantResult] = useState(null), [assistantMessages, setAssistantMessages] = useState([]), [busy, setBusy] = useState(false), [query, setQuery] = useState(""), [invoiceId, setInvoiceId] = useState(""), [invoiceRecord, setInvoiceRecord] = useState(null), [invoicePayments,setInvoicePayments]=useState([]), [invoiceCreditNotes,setInvoiceCreditNotes]=useState([]), [billId,setBillId]=useState(""), [billRecord,setBillRecord]=useState(null), [billPayments,setBillPayments]=useState([]), [pdfUrl,setPdfUrl]=useState(""), [documentId, setDocumentId] = useState(""), [extraction, setExtraction] = useState(null), [batchId, setBatchId] = useState(()=>sessionStorage.getItem("invoice-ai-bank-batch") || ""), [batchDetails, setBatchDetails] = useState(null), [suggestions, setSuggestions] = useState({}), [notificationPrefs, setNotificationPrefs] = useState(()=>JSON.parse(localStorage.getItem(notificationPrefsKey)||"{\"overdue\":true,\"productUpdates\":false}"));
  const setError = useCallback(value => setErrorState(value ? friendlyErrorMessage(value) : ""), []);
  const startTour = useCallback(() => setTourOpen(true), []);
  const closeTour = useCallback((status = "completed") => {
    try { localStorage.setItem(TOUR_KEY, status); } catch { /* Storage can be unavailable in private browsing. */ }
    setTourOpen(false);
  }, []);
  useEffect(() => {
    if (path !== "/app" || !data || tourChecked.current) return undefined;
    tourChecked.current = true;
    let timer;
    const frame = requestAnimationFrame(() => {
      if (!document.querySelector(".ws-dashboard-hero")) return;
      let preference = null;
      try { preference = localStorage.getItem(TOUR_KEY); } catch { /* Continue without a saved preference. */ }
      if (preference == null) timer = window.setTimeout(() => setTourOpen(true), 650);
    });
    return () => { cancelAnimationFrame(frame); if (timer) window.clearTimeout(timer); };
  }, [path, data]);
  const info = pages[path] || pages["/app"];
   const refresh = useCallback(async () => { setLoading(true); setError(""); try { if(path==="/app/payments"){const [sales,bills]=await Promise.all([api("/api/payments"),api("/api/supplier-payments")]);setData({items:[...asList(sales).map(x=>({...x,paymentType:"Sales"})),...asList(bills).map(x=>({...x,paymentType:"Supplier bill"}))]});}else if(path==="/app/billing"){const [plans,subscription]=await Promise.all([api("/api/billing/plans"),api("/api/billing/subscription")]);setData({plans:asList(plans),subscription});}else if(path==="/app/billing-history"){try{setData(await api("/api/billing/history"))}catch{const current=await api("/api/billing/subscription");setData({subscription:{status:current.status||"Free",planCode:current.planCode,planName:current.plan?.name,currencyCode:current.currencyCode,amountMinor:current.amountMinor,currentPeriodStart:current.currentPeriodStart,currentPeriodEnd:current.currentPeriodEnd,canCancel:["Active","PastDue"].includes(current.status)},checkouts:[],historyUnavailable:true})}}else if(["/app/customers","/app/suppliers"].includes(path)){const base=path==="/app/customers"?"/api/customers":"/api/suppliers";setData(await api(`${base}?includeArchived=${showArchived}`));}else if(path==="/app/financial-health"){const range=periodBounds(healthPeriod);setData(await api(`/api/reports/financial-summary?from=${range.from}&to=${range.to}`));}else if(["/app/financial-records","/app/credit-readiness"].includes(path)){const range=periodBounds(recordsPeriod);setData(await api(`/api/reports/financial-records?from=${range.from}&to=${range.to}`));}else setData(info[1] ? await api(info[1]) : null); } catch (e) { setError(e.message); setData(null); } finally { setLoading(false); } }, [info[1],path,showArchived,healthPeriod,recordsPeriod]);
  const loadReportExtras = useCallback(async (from, to) => {
    setReportExtrasLoading(true); setReportExtrasError("");
    const names = ["receivables", "payables", "expenses"];
    const results = await Promise.allSettled(names.map(name => {
      const endpoint = name === "receivables" ? "receivables-aging" : name === "payables" ? "payables-aging" : "expenses";
      const range = name === "expenses" && from && to ? `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}` : "";
      return api(`/api/reports/${endpoint}${range}`);
    }));
    const next = {}; const failures = [];
    results.forEach((result, index) => {
      if (result.status === "fulfilled") next[names[index]] = result.value;
      else failures.push(`${names[index][0].toUpperCase()}${names[index].slice(1)}: ${result.reason?.message || "Could not load."}`);
    });
    setReportExtras(next); setReportExtrasError(failures.join(" ")); setReportExtrasLoading(false);
  }, []);
  const loadForecast = useCallback(async () => {
    setForecastLoading(true); setForecastError("");
    try { setForecast(await api("/api/reports/cash-flow-forecast")); }
    catch (e) { setForecastError(e.message || "The forecast could not be loaded."); }
    finally { setForecastLoading(false); }
  }, []);
  const loadDashboardTrend = useCallback(async () => {
    if (path !== "/app") return;
    setDashboardTrendLoading(true); setDashboardTrendError("");
    const today = new Date();
    const from = new Date(today.getFullYear(), today.getMonth() - 5, 1);
    const dateOnly = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    try {
      setDashboardTrend(await api(`/api/reports/financial-summary?from=${dateOnly(from)}&to=${dateOnly(today)}`));
    } catch (e) {
      setDashboardTrendError(e.message || "Payment activity could not be loaded.");
    } finally { setDashboardTrendLoading(false); }
  }, [path]);
  const loadDashboardRecords = useCallback(async () => {
    if (path !== "/app") return;
    setDashboardRecordsLoading(true);
    const requests = await Promise.allSettled([
      api("/api/invoices?page=1&pageSize=1"),
      api("/api/invoices?status=Paid&page=1&pageSize=1"),
      api("/api/invoices?status=Issued&page=1&pageSize=1"),
      api("/api/invoices?status=PartiallyPaid&page=1&pageSize=1"),
      api("/api/invoices?page=1&pageSize=8"),
      api("/api/payments?includeReversed=false&page=1&pageSize=8"),
      api("/api/supplier-payments?includeReversed=false&page=1&pageSize=8")
    ]);
    const value = index => requests[index].status === "fulfilled" ? requests[index].value : null;
    const totalOf = response => response == null ? null : Number(response.total ?? response.Total ?? asList(response).length);
    const invoiceRows = asList(value(4));
    const salesPayments = asList(value(5));
    const supplierPayments = asList(value(6));
    const read = (object, key) => object?.[key] ?? object?.[`${key[0].toUpperCase()}${key.slice(1)}`];
    const dateText = raw => {
      if (!raw) return "Date unavailable";
      const date = new Date(raw);
      return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
    };
    const activity = [
      ...salesPayments.filter(item => !read(item,"isReversed")).map(item => ({ kind:"received", id:read(item,"id"), title:`Payment received${read(item,"customerName") ? ` from ${read(item,"customerName")}` : ""}`, detail:read(item,"invoiceNumber") ? `Invoice ${read(item,"invoiceNumber")}` : (read(item,"method") || "Customer payment"), date:dateText(read(item,"paidOn")), sortAt:Date.parse(read(item,"paidOn")), amount:read(item,"amount"), currencyCode:read(item,"currencyCode") })),
      ...supplierPayments.filter(item => !read(item,"isReversed")).map(item => ({ kind:"paid", id:read(item,"id"), title:`Supplier payment${read(item,"supplierName") ? ` to ${read(item,"supplierName")}` : ""}`, detail:read(item,"billNumber") ? `Bill ${read(item,"billNumber")}` : "Supplier bill", date:dateText(read(item,"paidOn")), sortAt:Date.parse(read(item,"paidOn")), amount:read(item,"amount"), currencyCode:read(item,"currencyCode") })),
      ...invoiceRows.filter(item => ["Issued","PartiallyPaid","Paid"].includes(read(item,"status"))).map(item => ({ kind:"invoice", id:read(item,"id"), title:`Invoice ${read(item,"number") || "issued"}`, detail:read(item,"customerName") ? `For ${read(item,"customerName")}` : "Sales invoice", date:dateText(read(item,"issueDate")), sortAt:Date.parse(read(item,"issueDate")), amount:null, currencyCode:read(item,"currencyCode") }))
    ].sort((a,b) => (Number.isNaN(b.sortAt) ? 0 : b.sortAt) - (Number.isNaN(a.sortAt) ? 0 : a.sortAt));
    setDashboardRecords({ counts:{ total:totalOf(value(0)), paid:totalOf(value(1)), pending:[value(2),value(3)].some(item=>item==null)?null:(totalOf(value(2))||0)+(totalOf(value(3))||0) }, activity });
    setDashboardRecordsLoading(false);
  }, [path]);
  useEffect(() => { setShowForm(false); setEditingRecord(null); refresh(); }, [path, refresh]);
  useEffect(() => {
    if (path !== "/app/invoice-detail" || !invoiceRecord?.id) return;
    let active = true;
    setInvoicePayments([]);
    setInvoiceCreditNotes([]);
    api(`/api/invoices/${invoiceRecord.id}/payments`)
      .then(payments => { if (active) setInvoicePayments(asList(payments)); })
      .catch(error => { if (active) setError(error.message); });
    api(`/api/invoices/${invoiceRecord.id}/credit-notes`)
      .then(credits => { if (active) setInvoiceCreditNotes(asList(credits)); })
      .catch(() => {});
    return () => { active = false; };
  }, [invoiceRecord?.id, path, setError]);
  useEffect(() => { loadDashboardTrend(); }, [loadDashboardTrend]);
  useEffect(() => { loadDashboardRecords(); }, [loadDashboardRecords]);
  useEffect(() => {
    if (!showForm) return undefined;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = requestAnimationFrame(() => {
      const firstField = modalRef.current?.querySelector("input:not([type=hidden]), select, textarea, button");
      (firstField || modalRef.current)?.focus();
    });
    const manageDialogKeys = event => {
      if (event.key === "Escape") {
        setShowForm(false);
        setEditingRecord(null);
        return;
      }
      if (event.key !== "Tab" || !modalRef.current) return;
      const focusable = [...modalRef.current.querySelectorAll('a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) { event.preventDefault(); modalRef.current.focus(); return; }
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", manageDialogKeys);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", manageDialogKeys);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [showForm]);
  useEffect(() => { if(["/app/reports","/app/financial-health"].includes(path)) loadReportExtras(data?.period?.from,data?.period?.to); }, [path,data?.period?.from,data?.period?.to,loadReportExtras]);
  useEffect(() => { if(path === "/app/financial-health") loadForecast(); }, [path,loadForecast]);
  useEffect(() => { if(path==="/app/invoice-detail"&&invoiceId&&!invoiceRecord?.lines) api(`/api/invoices/${invoiceId}`).then(setInvoiceRecord).catch(e=>setError(e.message)); }, [path,invoiceId]);
  useEffect(() => { if(path==="/app/invoice-detail"&&invoiceRecord?.id) { api(`/api/invoices/${invoiceRecord.id}/payments`).then(r=>setInvoicePayments(asList(r))).catch(()=>setInvoicePayments([])); api(`/api/invoices/${invoiceRecord.id}/credit-notes`).then(r=>setInvoiceCreditNotes(asList(r))).catch(()=>setInvoiceCreditNotes([])); } }, [path,invoiceRecord?.id]);
  useEffect(() => { if(path==="/app/supplier-invoices"&&billId) {api(`/api/supplier-bills/${billId}`).then(setBillRecord).catch(e=>setError(e.message));api(`/api/supplier-bills/${billId}/payments`).then(r=>setBillPayments(asList(r))).catch(()=>setBillPayments([]));} }, [path,billId]);
  useEffect(() => { if(path==="/app/bank-reconciliation"&&batchId&&!batchDetails) api(`/api/bank-statements/${batchId}`).then(setBatchDetails).catch(e=>setError(e.message)); }, [path,batchId,batchDetails]);
  useEffect(() => { if(extraction?.data) setBillCurrencyCode((extraction.data.currencyCode || baseCurrencyCode).toUpperCase()); }, [extraction,baseCurrencyCode]);
  const list = useMemo(() => asList(data), [data]);
  const filtered = useMemo(() => query ? list.filter(row => JSON.stringify(row).toLowerCase().includes(query.toLowerCase())) : data, [data, list, query]);
  const addKind = path === "/app/customers" ? "customer" : path === "/app/suppliers" ? "supplier" : path === "/app/supplier-invoices" ? "bill" : path === "/app/invitations" ? "invite" : path === "/app/invoice-new" || (path === "/app/invoice-detail" && editingRecord?.id) ? "invoice" : "organization";
  const canCreate = ["/app/customers", "/app/suppliers", "/app/supplier-invoices", "/app/invitations", "/app/invoice-new", "/app/organization", "/app/organization-setup"].includes(path);
  const doAsk = async e => { e.preventDefault(); const asked = question.trim(); setBusy(true); setAssistantResult(null); try { const r = await askFirebaseAssistant(asked, assistantMessages); setAssistantMessages(previous => [...previous, { role: "user", text: asked }, { role: "model", text: r.answer }].slice(-20)); setAssistantResult(r); } catch (e2) { setAssistantResult({ answer: e2.message, sources: [] }); } finally { setBusy(false); } };
  const startNewAssistantChat = () => { setAssistantMessages([]); setAssistantResult(null); setQuestion(""); };
  const doAskOnDevice = async () => {
    if (!question.trim()) return;
    setDeviceAssistantBusy(true); setDeviceAssistantProgress(0); setAssistantResult(null);
    try {
      const answer = await askOnDevice(question, setDeviceAssistantProgress);
      setAssistantResult({ answer, sources: [], mode: "on-device", notice: "Generated locally on this device. This answer cannot see your saved financial records." });
    } catch (e) {
      const message = String(e?.message || "");
      const friendly = /firebase ai logic is not configured|app check enabled|site key|under 500 characters|type a question|use local help offline|secure connection|still preparing/i.test(message)
        ? message
        : /languagemodel|prompt api|not supported|on-device model.*available|not available.*device/i.test(message)
          ? "On-device AI needs desktop Chrome 139 or newer with Chrome’s Prompt API and model enabled. You can still use Ask Invoice AI for workspace questions."
          : !navigator.onLine
            ? "The local model is not ready in this page yet. Connect once, prepare it, and then use on-device help offline while this page stays open."
            : "The on-device model could not start. Check that Chrome’s on-device AI model is available, then try again.";
      setAssistantResult({ answer: friendly, sources: [], mode: "on-device", notice: "Your question was not sent to Invoice AI’s financial-record tools." });
    } finally { setDeviceAssistantBusy(false); }
  };
  const runFirebaseExtraction = async (id, selectedFile) => {
    const preparation = await api(`/api/supplier-documents/${id}/extract/firebase/prepare`, { method: "POST" });
    let file = selectedFile;
    if (!file) {
      const blob = await apiBlob(`/api/supplier-documents/${id}/download`);
      file = new File([blob], "supplier-invoice", { type: blob.type || "application/pdf" });
    }
    const result = await extractSupplierBillWithFirebase(file, preparation.model);
    return api(`/api/supplier-documents/${id}/extract/firebase`, {
      method: "POST",
      body: { data: result.data, raw: result.raw }
    });
  };
  const doUpload = async e => { e.preventDefault(); const file = e.currentTarget.elements.file.files[0]; if (!file) return; const form = new FormData(); form.append("file", file); setBusy(true); setError(""); try { const doc = await api("/api/supplier-documents", { method: "POST", body: form }); setDocumentId(doc.id); setExtraction(await runFirebaseExtraction(doc.id,file)); navigate("/app/extraction-review"); } catch (e2) { setError(e2.message); } finally { setBusy(false); } };
  const exportData = async format => { setBusy(true); setError(""); try { const kind = path === "/app/invoices" ? "invoices" : "customers"; const blob = await apiBlob(`/api/${kind}/export?format=${format}`); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `${kind}-${new Date().toISOString().slice(0,10)}.${format}`; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  const downloadFinancialRecords = async () => { setBusy(true); setError(""); try { const range = periodBounds(recordsPeriod); const blob = await apiBlob(`/api/reports/financial-records/pdf?from=${range.from}&to=${range.to}`); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `financial-records-${range.from}-${range.to}.pdf`; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  const shareFinancialRecords = async () => { setBusy(true); setError(""); try { const range = periodBounds(recordsPeriod); const blob = await apiBlob(`/api/reports/financial-records/pdf?from=${range.from}&to=${range.to}`); const file = new File([blob], `financial-records-${range.from}-${range.to}.pdf`, { type: "application/pdf" }); if (navigator.canShare && !navigator.canShare({ files: [file] })) throw new Error("Your device can’t share this PDF directly. Download it and choose where to share it yourself."); await navigator.share({ files: [file], title: "Invoice AI financial records", text: `Financial records for ${range.from} to ${range.to}.` }); } catch (e) { if (e.name !== "AbortError") setError(e.message); } finally { setBusy(false); } };
  const logOut = async () => { const refreshToken = sessionStorage.getItem("invoice-ai-refresh"); try { if (refreshToken) await api("/api/auth/logout", { method: "POST", body: { refreshToken } }); } catch {} clearSession(); navigate("/login"); };
  const visibleGroups = groups.filter(([group]) => !(accountType === "Freelancer" && group === "Business setup · optional")).map(([group, items]) => [group, accountType === "Freelancer" ? items.filter(([url]) => !["/app/team", "/app/invitations"].includes(url)) : items]);
  const currentGroup = visibleGroups.find(([, items]) => items.some(([url]) => url === path))?.[0];
  return <div className={`workspace${mobileNavOpen ? " ws-mobile-nav-open" : ""}`}>{mobileNavOpen && <button className="ws-sidebar-backdrop" type="button" aria-label="Close navigation menu" onClick={() => setMobileNavOpen(false)}/>}<aside className="ws-sidebar" id="workspace-navigation"><button className="ws-sidebar-close" type="button" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)}><X/></button><a className="ws-brand" href="/app" onClick={e => { e.preventDefault(); setMobileNavOpen(false); navigate("/app"); }}><span className="ws-brand-icon"><FileText/></span><span>Invoice <i>AI</i><small>Simple finance workspace</small></span></a><div className="ws-org"><span><LayoutDashboard/></span><div><b>Your workspace</b><small>{accountType === "Freelancer" ? "Freelancer account" : accountType === "Organization" ? "Organization account" : "Your invoices and finances"}</small></div></div><nav aria-label="Workspace pages"><button className={`ws-ai-sidebar-link${path === "/app/assistant" ? " active" : ""}`} aria-current={path === "/app/assistant" ? "page" : undefined} onClick={() => { setMobileNavOpen(false); navigate("/app/assistant"); }}><span className="ws-ai-sidebar-icon"><Sparkles/></span><span><b>Ask Invoice AI</b><small>Ask about your finances</small></span><ArrowRight/></button>{visibleGroups.map(([group, items]) => <details className="ws-nav-group" key={group} open={group === currentGroup}><summary className="ws-group-title">{group}<ChevronDown/></summary><div className="ws-nav-items">{items.map(([url, label, Icon]) => <button key={url} className={path === url ? "active" : ""} onClick={() => { setMobileNavOpen(false); navigate(url); }}><Icon/>{label}</button>)}</div></details>)}</nav><button className="ws-logout" onClick={logOut}><LogOut/> Sign out</button></aside><main className="ws-main"><header className="ws-topbar"><div className="ws-breadcrumb"><button className="ws-mobile-nav-toggle" type="button" aria-label="Open navigation" aria-controls="workspace-navigation" aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen(true)}><Menu/></button><span className="ws-breadcrumb-home"><Home/></span><span>Your workspace</span><b>›</b><strong>{info[0]}</strong></div><div><button className="ws-ai-top-link" onClick={() => { setMobileNavOpen(false); navigate("/app/assistant"); }}><Sparkles/><span>Ask Invoice AI</span></button><button className="ws-icon-btn" aria-label="Alerts" title="Alerts" onClick={() => navigate("/app/notifications")}><Bell/></button><span className="ws-avatar" aria-label="Invoice AI account">IA</span></div></header><section className="ws-content"><div className={`ws-heading${["/app","/app/payments","/app/recurring-invoices","/app/bank-import","/app/bank-reconciliation","/app/payment-account","/app/upload-supplier-invoice","/app/billing/return"].includes(path) ? " ws-heading-hidden" : ""}`}><div><p>YOUR WORKSPACE</p><h1>{info[0]}</h1><span>{pageDescriptions[path] || "Manage your business details and activity."}</span></div><div className="ws-actions">{["/app/customers","/app/suppliers"].includes(path) && <button className="ws-button secondary" onClick={()=>setShowArchived(!showArchived)}>{showArchived?"Hide archived":"Show archived"}</button>}{data !== null && <button className="ws-button secondary" onClick={()=>{refresh();if(path==="/app/reports")loadReportExtras(data?.period?.from,data?.period?.to)}}><RefreshCw/> Refresh</button>}{["/app/customers","/app/invoices"].includes(path) && <><button className="ws-button secondary" disabled={busy} onClick={() => exportData("csv")}>Export CSV</button><button className="ws-button secondary" disabled={busy} onClick={() => exportData("xlsx")}>Export Excel</button></>}{canCreate && <button className="ws-button primary" onClick={() => setShowForm(!showForm)}><Plus/> {path === "/app/invoice-new" ? "Create invoice" : path === "/app/supplier-invoices" ? "Add supplier bill" : path === "/app/invitations" ? "Invite a teammate" : path === "/app/organization" || path === "/app/organization-setup" ? "Edit business details" : `Add ${path === "/app/customers" ? "customer" : "supplier"}`}</button>}</div></div>
      {!isOnline && <div className="ws-connectivity-banner" role="status"><span aria-hidden="true"/><div><b>You’re offline</b><small>Some workspace features need internet. New invoices can be saved in this tab and submitted when you reconnect.</small></div></div>}
      {error && <Toast type="error" title="Something needs your attention" onClose={() => setError("")}>{error}</Toast>}
      {toast && <Toast type={toast.type} title={toast.title} onClose={() => setToast(null)}>{toast.message}</Toast>}
      {showForm && <div className="ws-modal-backdrop" onMouseDown={e => {if(e.target===e.currentTarget){setShowForm(false);setEditingRecord(null)}}}><section ref={modalRef} className="ws-modal" tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="ws-modal-title" aria-describedby="ws-modal-description"><div className="ws-modal-head"><span className="ws-modal-mark"><FileText size={19}/></span><div><h2 id="ws-modal-title">{editingRecord ? `Edit ${addKind}` : path === "/app/supplier-invoices" ? "Add a supplier bill" : path === "/app/invitations" ? "Invite a teammate" : path.includes("invoice") ? "Create an invoice" : path.includes("organization") ? "Business details" : `Add ${addKind}`}</h2><p id="ws-modal-description">{path.includes("organization") ? "Add the details you want to show on your invoices. You can leave this blank if you work as a freelancer." : "Add the information below, then save it to your workspace."}</p></div><button type="button" className="ws-modal-close" onClick={() => {setShowForm(false);setEditingRecord(null)}} aria-label="Close dialog"><X/></button></div><div className="ws-modal-body"><RecordForm kind={addKind} initial={editingRecord || data || {}} onCancel={() => {setShowForm(false);setEditingRecord(null)}} onDone={async () => { setShowForm(false);setEditingRecord(null); if(path==="/app/invoice-detail"&&invoiceId){try{setInvoiceRecord(await api(`/api/invoices/${invoiceId}`))}catch(e){setError(e.message)}} refresh(); setToast({type:"success",title:"Saved successfully",message:`${addKind[0].toUpperCase()+addKind.slice(1)} details have been saved.`}); }} /></div></section></div>}
      {path === "/app/payments" && <section className="ws-money-page">
        {(() => {
          const incoming = list.filter(payment => payment.paymentType === "Sales" && !payment.isReversed);
          const outgoing = list.filter(payment => payment.paymentType !== "Sales" && !payment.isReversed);
          return <>
            <section className="ws-money-flow-hero">
              <div className="ws-money-banner-head"><div><span className="ws-money-eyebrow">YOUR WORKSPACE</span><h2>Money received &amp; paid</h2><p>Review money received from customers and paid to suppliers.</p></div><button className="ws-money-refresh" onClick={refresh} disabled={loading}><RefreshCw/>{loading ? "Refreshing…" : "Refresh"}</button></div>
              <div className="ws-money-activity-strip"><span className="money-activity-icon"><WalletCards/></span><div><span className="ws-money-eyebrow">CASH FLOW ACTIVITY</span><h3>See what came in and what went out</h3><p>Payments stay linked to the invoices and bills they belong to.</p></div><div className="ws-money-flow-art" aria-hidden="true"><span className="flow-orbit orbit-a"/><span className="flow-orbit orbit-b"/><span className="flow-coin"><CircleDollarSign/></span><i className="flow-arrow in"><ArrowUpRight/></i><i className="flow-arrow out"><ArrowUpRight/></i></div></div>
            </section>
            <div className="ws-money-flow-grid">
              <article className="ws-card ws-flow-card activity"><span className="ws-flow-icon"><CreditCard/></span><div><small>All recorded payments</small><b>{list.length}</b><span>Customer and supplier transactions</span></div></article>
              <article className="ws-card ws-flow-card received"><span className="ws-flow-icon"><ArrowDownLeft/></span><div><small>Money received</small><b>{incoming.length}</b><span>Payments from customers</span></div></article>
              <article className="ws-card ws-flow-card spent"><span className="ws-flow-icon"><ArrowUpRight/></span><div><small>Money paid out</small><b>{outgoing.length}</b><span>Payments to suppliers</span></div></article>
            </div>
            <section className="ws-money-next"><div className="ws-money-shortcuts"><button onClick={()=>navigate("/app/invoices")}><span className="money-action-icon blue"><FileText/></span><span><b>Record customer payment</b><small>Open an invoice and add a payment.</small></span><ArrowUpRight/></button><button onClick={()=>navigate("/app/supplier-invoices")}><span className="money-action-icon amber"><CreditCard/></span><span><b>Record supplier payment</b><small>Open a bill and add a payment.</small></span><ArrowUpRight/></button><button onClick={()=>navigate("/app/bank-import")}><span className="money-action-icon teal"><Upload/></span><span><b>Match with your bank</b><small>Upload a statement to reconcile.</small></span><ArrowUpRight/></button></div></section>
          </>;
        })()}
      </section>}
      {path === "/app/assistant" && <FinancialAssistantPage tools={data} question={question} setQuestion={setQuestion} result={assistantResult} busy={busy} onAsk={doAsk} onNewChat={startNewAssistantChat} messages={assistantMessages} deviceBusy={deviceAssistantBusy} deviceProgress={deviceAssistantProgress} onAskOnDevice={doAskOnDevice} deviceConfigured={firebaseOnDeviceConfigured()}/>}
      {path === "/app/upload-supplier-invoice" ? <SupplierInvoiceUpload busy={busy} onUpload={doUpload}/> : null}
      {path === "/app/bank-import" && <section className="ws-money-page">
        <div className="ws-card ws-money-hero compact"><div className="ws-money-hero-icon"><Upload/></div><div className="ws-money-hero-copy"><span className="ws-money-eyebrow">BANK STATEMENTS</span><h2>Bring your bank activity into Invoice AI</h2><p>Upload a statement file and we’ll help match its deposits and withdrawals to the payments you recorded.</p></div></div>
        <section className="ws-card ws-bank-import-card"><div className="ws-bank-step-list"><div className="ws-bank-step active"><i>1</i><span><b>Choose a statement</b><small>CSV or Excel file</small></span></div><div className="ws-bank-step"><i>2</i><span><b>Review transactions</b><small>Check the imported lines</small></span></div><div className="ws-bank-step"><i>3</i><span><b>Match payments</b><small>Connect bank lines to records</small></span></div></div>
          <div className="ws-bank-upload-area"><div className="ws-bank-upload-icon"><FileText/></div><h3>Select your bank statement</h3><p>Choose a CSV or Excel file downloaded from your bank. We’ll check it before saving the transactions.</p><form className="ws-bank-upload-form" onSubmit={async e => {
            e.preventDefault(); const target = e.currentTarget; const file = target.elements.file.files[0]; if (!file) return; const form = new FormData(); form.append("file", file); setBusy(true); setError("");
            try {
              const result = await api("/api/bank-statements/import", { method: "POST", body: form });
              if (!result.batchId) { setAnswer(`We checked ${result.rowsRead} rows but couldn’t import any transactions. Review the file and try again.`); return; }
              setBatchId(result.batchId); sessionStorage.setItem("invoice-ai-bank-batch", result.batchId);
              const details = await api(`/api/bank-statements/${result.batchId}`); setBatchDetails(details);
              setAnswer(`Imported ${result.imported} transactions. Review them and match the ones you recognize.`);
              setStatementFile(null); target.reset();
              navigate("/app/bank-reconciliation");
            } catch (x) { setError(x.message); }
            finally { setBusy(false); }
          }}><label className={`ws-bank-file-picker${statementFile ? " selected" : ""}`}><input className="ws-bank-file-input" name="file" type="file" accept=".csv,.xlsx" required onChange={e=>setStatementFile(e.target.files?.[0]||null)}/><span className="ws-bank-file-copy"><b>{statementFile?.name||"Choose a bank statement"}</b><small>{statementFile ? `${(statementFile.size/1024).toFixed(0)} KB · Ready to import` : "CSV or Excel file · up to 5 MB"}</small></span><span className="ws-bank-browse"><Upload/>Browse files</span></label><button className="ws-button primary" disabled={busy||!statementFile}>{busy ? "Checking your statement…" : "Import statement"}</button></form><small className="ws-bank-file-note">Your file is checked before transactions are imported. Your original statement stays with your bank.</small></div>
          <details className="ws-bank-format"><summary>What if my bank file looks different?</summary><p>We can read a simple CSV with these columns: <b>TransactionDate, Description, Amount, CurrencyCode</b>. Add <b>Reference</b> if your bank provides one. For money received, enter a positive amount; for money leaving your account, enter a negative amount.</p><div className="ws-bank-format-actions"><button className="ws-button secondary" type="button" onClick={()=>{const file=new Blob(["TransactionDate,Description,Amount,CurrencyCode,Reference\r\n"],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(file);const link=document.createElement("a");link.href=url;link.download="invoice-ai-bank-statement-template.csv";link.click();URL.revokeObjectURL(url)}}><FileText/> Download a blank CSV template</button><button className="ws-text-button" type="button" onClick={()=>navigate("/app/help")}>Get help preparing a statement</button></div></details>
          {answer&&<div className="ws-money-inline-success" role="status"><CheckCircle2/>{answer}</div>}
        </section>
      </section>}
      {path === "/app/invoice-detail" && <section className="ws-card"><h2>Choose an invoice</h2><p className="ws-muted">Select an invoice from the list below, or enter its invoice ID to open it directly.</p><form className="ws-ask ws-invoice-lookup" onSubmit={async e=>{e.preventDefault();setBusy(true);setError("");try{setInvoiceRecord(await api(`/api/invoices/${invoiceId.trim()}`))}catch(x){setError(x.message);setInvoiceRecord(null)}finally{setBusy(false)}}}><input aria-label="Invoice ID" value={invoiceId} onChange={e=>setInvoiceId(e.target.value)} placeholder="Enter invoice ID" required/><button className="ws-button primary" disabled={busy}>{busy?"Loading invoice…":"Open invoice"}</button></form>{invoiceRecord&&<div className="ws-detail"><div className="ws-invoice-summary"><div><span>INVOICE</span><h3>{invoiceRecord.number||"Invoice"}</h3><p>Billed to {invoiceRecord.customerName||"Customer"}</p></div><div className="ws-invoice-summary-total"><span>Amount due</span><strong>{formatMoney(invoiceRecord.balance ?? invoiceRecord.total, invoiceRecord.currencyCode)}</strong><small>Total {formatMoney(invoiceRecord.total, invoiceRecord.currencyCode)} · Due {invoiceRecord.dueDate?new Date(invoiceRecord.dueDate).toLocaleDateString():"No due date"}</small></div></div><div className="ws-invoice-lines-section"><div className="ws-invoice-section-heading"><div><h4>Items and services</h4><p>Details included on this invoice.</p></div><button className="ws-button secondary" onClick={()=>navigate("/app/invoice-preview")}>View invoice PDF</button></div><Table data={invoiceRecord.lines} variant="invoice-lines" currencyCode={invoiceRecord.currencyCode}/></div><InvoiceActions invoice={invoiceRecord} onUpdate={setInvoiceRecord} onError={setError} onEdit={async()=>{try{const customers=await api("/api/customers");setEditingRecord({...invoiceRecord,customers});setShowForm(true)}catch(e){setError(e.message)}}}/>{Number(invoiceRecord.balance)>0&&<form className="ws-payment-form" onSubmit={async e=>{e.preventDefault();const target=e.currentTarget;const f=new FormData(target);setBusy(true);setError("");try{await api(`/api/invoices/${invoiceRecord.id}/payments`,{method:"POST",body:{amount:Number(f.get("amount")),paidOn:f.get("paidOn")||null,method:f.get("method"),reference:f.get("reference")||null,notes:null,exchangeRateToBase:f.has("exchangeRateToBase")?Number(f.get("exchangeRateToBase")):null}});setInvoiceRecord(await api(`/api/invoices/${invoiceRecord.id}`));setInvoicePayments(asList(await api(`/api/invoices/${invoiceRecord.id}/payments`)));target.reset()}catch(x){setError(x.message)}finally{setBusy(false)}}}><h3>Record a payment</h3><div className="ws-form-grid"><label>Amount<input name="amount" type="number" min="0.01" step="0.01" max={invoiceRecord.balance} required/></label><label>Payment date<input name="paidOn" type="date" defaultValue={new Date().toISOString().slice(0,10)}/></label><label>Method<select name="method"><option value="BankTransfer">Bank transfer</option><option value="Cash">Cash</option><option value="Card">Card</option><option value="Cheque">Cheque</option><option value="MobileMoney">Mobile money</option><option value="Other">Other</option></select></label><label>Reference<input name="reference" defaultValue={invoiceRecord.number || ""} placeholder="Invoice number or bank transaction ID"/><small>Prefilled with this invoice number. Replace it with the bank or transaction reference if available.</small></label>{invoiceRecord.currencyCode!==invoiceRecord.baseCurrencyCode&&<label>Exchange rate to {invoiceRecord.baseCurrencyCode}<input name="exchangeRateToBase" type="number" min="0.00000001" step="0.00000001" required/><small>Enter the rate for this payment date.</small></label>}</div><button className="ws-button primary" disabled={busy}>{busy?"Saving payment…":"Record payment"}</button></form>}{invoicePayments.length>0&&<><h3>Payments received</h3><Table data={invoicePayments} variant="invoice-payments" currencyCode={invoiceRecord.currencyCode}/></>}<form className="ws-payment-form" onSubmit={async e=>{e.preventDefault();const target=e.currentTarget;const f=new FormData(target);setBusy(true);setError("");try{await api(`/api/invoices/${invoiceRecord.id}/credit-notes`,{method:"POST",body:{amount:Number(f.get("amount")),reason:String(f.get("reason"))}});setInvoiceRecord(await api(`/api/invoices/${invoiceRecord.id}`));setInvoiceCreditNotes(asList(await api(`/api/invoices/${invoiceRecord.id}/credit-notes`)));target.reset()}catch(x){setError(x.message)}finally{setBusy(false)}}}><h3>Issue a credit note</h3><p className="ws-muted">Credits reduce what the customer owes. Any refund of money already received must be handled separately.</p><div className="ws-form-grid"><label>Amount ({invoiceRecord.currencyCode})<input name="amount" type="number" min="0.01" step="0.01" max={invoiceRecord.total} required/></label><label>Reason<input name="reason" maxLength="500" required placeholder="For example, returned item"/></label></div><button className="ws-button secondary" disabled={busy||invoiceRecord.status==="Draft"||invoiceRecord.status==="Void"}>{busy?"Issuing…":"Issue credit note"}</button></form>{invoiceCreditNotes.length>0&&<><h3>Credit notes</h3><div className="ws-credit-notes">{invoiceCreditNotes.map(note=><CreditNoteCard key={note.id} note={note} invoice={invoiceRecord} payments={invoicePayments} onError={setError}/>)}</div></>}</div>}</section>}
      {path === "/app/supplier-invoices" && billRecord && <section className="ws-card"><div className="ws-card-title"><div><h2>{billRecord.number} · {billRecord.supplierName}</h2><p className="ws-muted">{billRecord.status} · {billRecord.currencyCode} {Number(billRecord.total||0).toLocaleString()} · Balance {Number(billRecord.balance||0).toLocaleString()}{billRecord.currencyCode!==billRecord.baseCurrencyCode&&<> · Reporting value {billRecord.baseCurrencyCode} {(Number(billRecord.total||0)*Number(billRecord.exchangeRateToBase||1)).toLocaleString()}</>}</p></div><button className="ws-button secondary" onClick={()=>{setBillId("");setBillRecord(null)}}>Close details</button></div><Table data={billRecord.lines}/><DraftBillCorrection bill={billRecord} setBusy={setBusy} onError={setError} onSaved={setBillRecord}/>{billRecord.status==="Draft"&&<button className="ws-button primary" onClick={async()=>{setBusy(true);setError("");try{setBillRecord(await api(`/api/supplier-bills/${billRecord.id}/finalize`,{method:"POST",body:{confirmPossibleDuplicates:false}}));refresh()}catch(x){setError(x.message)}finally{setBusy(false)}}}>Finalize bill</button>}{Number(billRecord.balance)>0&&billRecord.status!=="Draft"&&<form className="ws-payment-form" onSubmit={async e=>{e.preventDefault();const target=e.currentTarget;const f=new FormData(target);setBusy(true);setError("");try{await api(`/api/supplier-bills/${billRecord.id}/payments`,{method:"POST",body:{amount:Number(f.get("amount")),paidOn:f.get("paidOn")||null,method:f.get("method"),reference:f.get("reference")||null,notes:null,exchangeRateToBase:billRecord.currencyCode===billRecord.baseCurrencyCode?1:Number(f.get("exchangeRateToBase"))}});setBillRecord(await api(`/api/supplier-bills/${billRecord.id}`));setBillPayments(asList(await api(`/api/supplier-bills/${billRecord.id}/payments`)));target.reset()}catch(x){setError(x.message)}finally{setBusy(false)}}}><h3>Record a supplier payment</h3><div className="ws-form-grid"><label>Amount ({billRecord.currencyCode})<input name="amount" type="number" min="0.01" step="0.01" max={billRecord.balance} required/></label><label>Payment date<input name="paidOn" type="date" defaultValue={new Date().toISOString().slice(0,10)}/></label><label>Method<select name="method"><option value="BankTransfer">Bank transfer</option><option>Cash</option><option>Card</option><option>Cheque</option><option>MobileMoney</option><option>Other</option></select></label><label>Reference<input name="reference"/></label>{billRecord.currencyCode!==billRecord.baseCurrencyCode&&<label>Payment exchange rate to {billRecord.baseCurrencyCode}<input name="exchangeRateToBase" type="number" min="0.00000001" step="0.00000001" required/><small>Enter the rate on the date you paid.</small></label>}</div><button className="ws-button primary" disabled={busy}>{busy?"Saving payment…":"Record payment"}</button></form>}{billPayments.length>0&&<><h3>Payments</h3><Table data={billPayments}/></>}</section>}
      {path === "/app/invoice-preview" && <InvoicePdfPreview invoices={list} loading={loading} loadError={error} onRetry={refresh} initialInvoiceId={invoiceId} navigate={navigate}/>}
      {path === "/app/recurring-invoices" && <RecurringInvoices schedules={data} onRefresh={refresh} onError={setError}/>}
      {path === "/app/extraction-review" && <section className="ws-card ws-extraction-panel"><h2>Review supplier invoice extraction</h2><p className="ws-muted">Enter the document ID from the upload result, then run or load its AI extraction.</p><form className="ws-ask ws-extraction-load" onSubmit={async e=>{e.preventDefault();setBusy(true);setError("");try{const r=await api(`/api/supplier-documents/${documentId.trim()}/extraction`);setExtraction(r)}catch(x){setError(x.message);setExtraction(null)}finally{setBusy(false)}}}><input value={documentId} onChange={e=>setDocumentId(e.target.value)} placeholder="Supplier document ID" required/><div><button className="ws-button secondary" disabled={busy}>Load extraction</button><button type="button" className="ws-button primary" disabled={busy||!documentId} onClick={async()=>{setBusy(true);setError("");try{setExtraction(await runFirebaseExtraction(documentId.trim()))}catch(x){setError(x.message)}finally{setBusy(false)}}}>Run AI extraction with Firebase</button></div></form>{extraction&&<div className="ws-detail"><h3>Extracted values · {extraction.confidence} confidence</h3><p>{extraction.data?.supplierName||"Supplier / recipient not detected"} · Reference {extraction.data?.invoiceNumber||extraction.data?.reference||"not detected"}</p><p>Invoice date: {extraction.data?.invoiceDate||"—"} · Due: {extraction.data?.dueDate||"—"}</p><p>Total: {extraction.data?.currencyCode||""} {extraction.data?.total??"—"}</p>{extraction.issues?.length>0&&<ul>{extraction.issues.map((issue,i)=><li key={i}>{issue.severity}: {issue.message}</li>)}</ul>}<ExtractionApproval extraction={extraction} documentId={documentId} baseCurrencyCode={baseCurrencyCode} setBusy={setBusy} onError={setError} onSuccess={()=>setAnswer("Draft supplier bill created. You can finalize it in Supplier bills.")}/>{answer&&<p className="ws-muted">{answer}</p>}</div>}</section>}
      {path === "/app/bank-reconciliation" && <section className="ws-money-page">
        <div className="ws-card ws-money-hero compact"><div className="ws-money-hero-icon"><RefreshCw/></div><div className="ws-money-hero-copy"><span className="ws-money-eyebrow">BANK RECONCILIATION</span><h2>Make sure your records match your bank</h2><p>Match bank deposits to customer payments in Invoice AI. Review withdrawals and leave them noted for later.</p></div></div>
        {!batchDetails ? <section className="ws-card ws-reconcile-start"><div className="ws-money-section-heading"><div><span className="ws-money-step">START HERE</span><h3>Choose a statement to review</h3><p>Upload a statement first, or open one you already imported.</p></div></div><button className="ws-button primary" onClick={()=>navigate("/app/bank-import")}><Upload/> Upload a statement</button>{batchId&&<form className="ws-reconcile-load-form" onSubmit={async e=>{e.preventDefault();setBusy(true);setError("");try{const details=await api(`/api/bank-statements/${batchId.trim()}`);setBatchDetails(details);sessionStorage.setItem("invoice-ai-bank-batch",batchId.trim());setSuggestions({})}catch(x){setError(x.message);setBatchDetails(null)}finally{setBusy(false)}}}><label>Or enter a statement reference<input value={batchId} onChange={e=>setBatchId(e.target.value)} placeholder="Paste the reference from a previous import" required/></label><button className="ws-button secondary" disabled={busy}>{busy?"Opening…":"Open statement"}</button></form>}</section> : <section className="ws-card ws-reconcile-results">
          <div className="ws-money-section-heading"><div><span className="ws-money-step">STATEMENT REVIEW</span><h3>{batchDetails.batch?.fileName || "Imported statement"}</h3><p>Review the transactions below and match the ones you recognize.</p></div><button className="ws-button secondary" onClick={()=>navigate("/app/bank-import")}><Upload/> Import another</button></div>
          <div className="ws-reconcile-stats"><span><b>{batchDetails.lines?.length || 0}</b> transactions</span><span><b>{batchDetails.lines?.filter(line=>line.status==="Matched").length || 0}</b> matched</span><span><b>{batchDetails.lines?.filter(line=>line.status==="Unmatched").length || 0}</b> to review</span><span><b>{batchDetails.lines?.filter(line=>line.status==="Ignored").length || 0}</b> marked reviewed</span></div>
          <div className="ws-reconcile-lines">{batchDetails.lines?.map(line=>{
            const isMatched=line.status==="Matched", isReviewed=line.status==="Ignored", isDeposit=Number(line.amount)>0;
            return <article className={`ws-reconcile-line ${isMatched?"matched":""}`} key={line.id}>
              <div className="ws-reconcile-line-main"><span className="ws-reconcile-date">{new Date(line.transactionDate).toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"})}</span><div className="ws-reconcile-description"><b>{line.description}</b><small>{line.reference ? `Reference: ${line.reference}` : "No bank reference provided"}</small></div><strong>{line.currencyCode} {Number(line.amount).toLocaleString()}</strong><span className={`ws-reconcile-badge ${isMatched?"matched":isReviewed?"reviewed":"review"}`}>{isMatched?"Matched":isReviewed?"Reviewed":"Needs review"}</span></div>
              {!isMatched&&!isReviewed&&<div className="ws-reconcile-line-actions">{isDeposit?<><button className="ws-row-action" onClick={async()=>{try{const result=await api(`/api/bank-statements/lines/${line.id}/suggestions`);setSuggestions(s=>({...s,[line.id]:result}))}catch(x){setError(x.message)}}}>{suggestions[line.id]?"Refresh suggestions":"Find matching customer payment"}</button>{suggestions[line.id]?.payments?.length===0&&<small>No matching customer payment found. You can leave it for later.</small>}</>:<><span className="ws-reconcile-outgoing-note">Money went out. Supplier payment matching isn’t available here yet.</span><button className="ws-row-action" onClick={async()=>{setBusy(true);setError("");try{await api(`/api/bank-statements/lines/${line.id}/ignore`,{method:"POST",body:{reason:"Reviewed; no customer payment to match."}});setBatchDetails(await api(`/api/bank-statements/${batchId.trim()}`))}catch(x){setError(x.message)}finally{setBusy(false)}}}>Mark as reviewed</button></>}</div>}
              {isMatched&&<div className="ws-reconcile-line-actions"><span className="ws-reconcile-outgoing-note">Matched to a recorded customer payment.</span></div>}
              {suggestions[line.id]?.payments?.length>0&&!isMatched&&!isReviewed&&<div className="ws-match-options"><span>Possible matches</span>{suggestions[line.id].payments.map(payment=><button key={payment.paymentId} onClick={async()=>{setBusy(true);setError("");try{await api(`/api/bank-statements/lines/${line.id}/match`,{method:"POST",body:{paymentId:payment.paymentId}});setBatchDetails(await api(`/api/bank-statements/${batchId.trim()}`));setSuggestions(s=>({...s,[line.id]:null}))}catch(x){setError(x.message)}finally{setBusy(false)}}}><span><b>{payment.invoiceNumber ? `Invoice ${payment.invoiceNumber}` : `Payment from ${payment.customerName}`}</b><small>{payment.currencyCode} {Number(payment.amount).toLocaleString()} · {new Date(payment.paidOn).toLocaleDateString()}</small></span><i>{payment.referenceMatches?"Reference matches":"Match payment"}</i></button>)}</div>}
            </article>;
          })}</div>
        </section>}
      </section>}
      {path === "/app/organization" && data && <OrganizationProfile organization={data}/>}
      {path === "/app/security" && <section className="ws-card ws-task-card"><span className="ws-task-icon"><Shield/></span><h2>Change your password</h2><p className="ws-muted">Choose a password with at least 8 characters. You’ll stay signed in after it changes.</p><form className="ws-form" onSubmit={async e => { e.preventDefault(); const target = e.currentTarget; const f = new FormData(target); setBusy(true); setError(""); try { const r = await api("/api/profile/change-password", { method: "POST", body: { currentPassword: f.get("currentPassword"), newPassword: f.get("newPassword") } }); if (r?.token) { sessionStorage.setItem("invoice-ai-token", r.token); sessionStorage.setItem("invoice-ai-refresh", r.refreshToken); } target.reset(); setAnswer("Your password has been changed."); } catch (x) { setError(x.message); } finally { setBusy(false); } }}><div className="ws-form-grid"><label>Current password<input name="currentPassword" type="password" autoComplete="current-password" required /></label><label>New password<input name="newPassword" type="password" autoComplete="new-password" minLength="8" required /></label></div>{error&&<p className="ws-error">{error}</p>}{answer&&<p className="ws-success-note">{answer}</p>}<div className="ws-form-actions"><button className="ws-button primary" disabled={busy}>{busy?"Updating password…":"Save new password"}</button></div></form></section>}
      {path === "/app/preferences" && <section className="ws-card"><h2>Notification preferences</h2><p className="ws-muted">Choose which reminders this workspace highlights. Preferences are saved in this browser.</p>{[["overdue","Overdue invoice reminders"],["productUpdates","Product updates"]].map(([key,label])=><label className="ws-pref" key={key}><span><b>{label}</b><small>{key==="overdue"?"Show unpaid invoices past their due date":"Show announcements and release updates"}</small></span><input type="checkbox" checked={!!notificationPrefs[key]} onChange={e=>{const next={...notificationPrefs,[key]:e.target.checked};setNotificationPrefs(next);localStorage.setItem(notificationPrefsKey,JSON.stringify(next))}}/></label>)}</section>}
      {path === "/app/notifications" && <section className="ws-card"><h2>Notifications</h2><p className="ws-muted">Overdue invoice reminders from your current workspace.</p>{notificationPrefs.overdue===false?<div className="ws-empty">Overdue reminders are turned off in Notification Preferences.</div>:asList(data).length?asList(data).map((inv,i)=><article className="ws-notice" key={inv.id||i}><span className="ws-notice-dot"/><div><b>{inv.number||"Invoice"} · {inv.customerName}</b><p>{inv.daysOverdue||0} days overdue · Balance {inv.currencyCode} {Number(inv.balance||0).toLocaleString()}</p></div><button className="ws-text-button" onClick={()=>{setInvoiceId(inv.id);setInvoiceRecord(inv);navigate("/app/invoice-detail")}}>View invoice</button></article>):<div className="ws-empty">No overdue invoices. You’re all caught up.</div>}</section>}
      {info[1] && tablePages.includes(path) && !showForm && <section className="ws-card ws-record-list">
        <div className="ws-card-title">
          <div><h2>{path === "/app/invoice-detail" ? "Your invoices" : path === "/app/invoice-new" ? "Customers you can invoice" : path === "/app/extraction-review" ? "Uploaded supplier documents" : path === "/app/payments" ? "Payment history" : info[0]}</h2><p className="ws-muted">{path === "/app/invoice-detail" ? "Choose an invoice to review its items, balance and payment history." : path === "/app/invoice-new" ? "Your saved customers are ready to use when creating an invoice." : path === "/app/extraction-review" ? "Choose an uploaded document to review its extracted details." : path === "/app/payments" ? "A clear record of payments customers sent and payments you made to suppliers." : pageDescriptions[path] || "Your saved records appear here."}</p></div>
          <label className="ws-search"><Search/><input aria-label={`Search ${info[0].toLowerCase()}`} value={query} onChange={e => setQuery(e.target.value)} placeholder={`Search ${path === "/app/invoices" ? "invoices" : path === "/app/customers" ? "customers" : path === "/app/suppliers" ? "suppliers" : path === "/app/supplier-invoices" ? "supplier bills" : path === "/app/payments" ? "payments" : "records"}`}/></label>
        </div>
        {loading ? <div className="ws-list-state" role="status"><RefreshCw/><span>Loading {info[0].toLowerCase()}…</span></div>
          : error && !data ? <div className="ws-list-state error" role="alert"><span>{error}</span><button className="ws-button secondary" onClick={refresh}><RefreshCw/> Try again</button></div>
            : <Table data={filtered} variant={path === "/app/customers" ? "customers" : path === "/app/payments" ? "payments" : undefined}
              emptyMessage={query ? "No matching records found." : `No ${path === "/app/invoices" ? "invoices" : path === "/app/customers" ? "customers" : path === "/app/suppliers" ? "suppliers" : path === "/app/supplier-invoices" ? "supplier bills" : path === "/app/payments" ? "payments" : path === "/app/extraction-review" ? "uploaded documents" : "records"} yet.`}
              onEdit={["/app/customers", "/app/suppliers"].includes(path) ? row => { setEditingRecord(row); setShowForm(true); } : null}
              onView={path === "/app/customers" ? async row => { try { setCustomerSummary(await api(`/api/customers/${row.id}/summary`)); } catch (e) { setError(e.message); } }
                : path === "/app/invoices" || path === "/app/invoice-detail" ? row => { setInvoiceId(row.id); setInvoiceRecord(row); navigate("/app/invoice-detail"); }
                  : path === "/app/supplier-invoices" ? row => { setBillId(row.id); setBillRecord(row); }
                    : path === "/app/extraction-review" ? row => setDocumentId(row.id) : null}
              onArchive={["/app/customers", "/app/suppliers"].includes(path) ? async row => { try { await api(`/api/${path === "/app/customers" ? "customers" : "suppliers"}/${row.id}/${row.isArchived ? "restore" : "archive"}`, { method: "POST" }); refresh(); } catch (e) { setError(e.message); } } : null}
              onViewLabel={path === "/app/customers" ? "View balances" : path === "/app/supplier-invoices" ? "Open bill" : path === "/app/invoice-detail" || path === "/app/invoices" ? "Open invoice" : path === "/app/extraction-review" ? "Use document" : "View details"}/>
        }
      </section>}
      {path === "/app/profile" && data && <section className="ws-card"><div className="ws-card-title"><div><h2>Profile details</h2><p className="ws-muted">Manage your personal account name.</p></div><button className="ws-button secondary" onClick={() => setShowForm(!showForm)}>Edit profile</button></div>{showForm?<RecordForm kind="profile" onCancel={()=>setShowForm(false)} onDone={()=>{setShowForm(false);refresh()}}/>:<><p><b>{data.fullName}</b></p><p>{data.email}</p></>}</section>}
      {path === "/app/help" && <section className="ws-help-grid"><article className="ws-card"><span className="ws-task-icon"><CircleHelp/></span><h2>How can we help?</h2><p className="ws-muted">For quick answers, start with the page you’re working on. Each section explains what to do next.</p><div className="ws-help-links"><button onClick={() => navigate("/app/invoices")}>Creating and tracking invoices <ArrowUpRight/></button><button onClick={() => navigate("/app/upload-supplier-invoice")}>Uploading a supplier bill <ArrowUpRight/></button><button onClick={() => navigate("/app/bank-import")}>Importing a bank statement <ArrowUpRight/></button><button onClick={() => navigate("/app/billing")}>Plans and billing <ArrowUpRight/></button></div></article><article className="ws-card ws-contact-card"><h2>Need a hand?</h2><p className="ws-muted">Contact the Invoice AI team and include a short description of what you were trying to do.</p><a className="ws-button primary" href="mailto:hello@invoiceai.com?subject=Invoice%20AI%20support">Email support <ArrowUpRight/></a><small>We usually reply within one business day.</small></article></section>}
      {path === "/app/team" && data && <section className="ws-card"><div className="ws-card-title"><div><h2>People with access to your workspace</h2><p className="ws-muted">You can use Invoice AI on your own. Add teammates only if you need them.</p></div></div><TeamMembers members={data} onRefresh={refresh}/></section>}
      {path === "/app/invitations" && data && !showForm && <section className="ws-card"><div className="ws-card-title"><div><h2>Pending invitations</h2><p className="ws-muted">Invite teammates and revoke invitations that are no longer needed.</p></div></div><InvitationsList invitations={data} onRefresh={refresh}/></section>}
      {path === "/app/billing" && data && <section className="ws-card"><div className="ws-card-title"><div><h2>Choose a plan</h2><p className="ws-muted">Compare monthly prices and limits. You can start with a plan for one person and add teammates later.</p></div></div>{(data.subscription?.planCode || data.subscription?.plan?.code) && <div className="ws-current-plan"><div><small>YOUR CURRENT PLAN</small><b>{data.subscription.plan?.name || data.subscription.planCode}</b></div><span>{data.subscription.status === "NonRenewing" ? "Active until the end of this period" : data.subscription.status || "Active"}</span><button className="ws-text-button" onClick={() => navigate("/app/billing-history")}>Billing details <ArrowRight/></button></div>}<div className="ws-plan-grid">{asList(data.plans).map(plan => {const isCurrent = (data.subscription?.planCode === plan.code && ["Active","PastDue","NonRenewing"].includes(data.subscription?.status)) || (plan.isFree && !data.subscription?.planCode && data.subscription?.status === "Free"); return <article key={plan.code} className={isCurrent ? "is-current" : ""}>{isCurrent && <span className="ws-current-plan-tag">CURRENT PLAN</span>}<b>{plan.name}</b><h3>{plan.isFree ? "Free" : `${plan.currencyCode} ${(plan.amountMinor / 100).toLocaleString()}`}<small> / month</small></h3><p>{plan.description}</p><span>{plan.invoiceLimit} invoices / month</span><span>{plan.memberLimit} team members</span><span>{plan.aiExtractionLimit} AI invoice readings / month</span><button disabled={isCurrent||!plan.canCheckout||busy} className="ws-button primary" onClick={async () => { setBusy(true); setError(""); try { const r = await api("/api/billing/checkout", { method: "POST", body: { planCode: plan.code } }); if (!r.authorizationUrl) throw new Error("The payment provider did not return a checkout link."); location.assign(r.authorizationUrl); } catch (x) { setError(x.message); setBusy(false); } }}>{busy ? "Opening secure checkout…" : isCurrent ? "Current plan" : plan.canCheckout ? "Choose plan" : plan.isFree ? "Free plan" : "Not available yet"}</button></article>})}</div></section>}
      {path === "/app/billing/return" && <SubscriptionPaymentReturn navigate={navigate}/>}
      {path === "/app/billing-history" && data && <BillingHistoryPanel data={data} onRefresh={refresh} onError={setError}/>}
      {path === "/app/payment-account" && data && <PaymentAccountPanel data={data} setData={setData} onError={setError} busy={busy} setBusy={setBusy}/>}
      {path === "/app" && data && <DashboardOverview data={data} trend={dashboardTrend} trendLoading={dashboardTrendLoading} trendError={dashboardTrendError} records={dashboardRecords} recordsLoading={dashboardRecordsLoading} onRetryTrend={loadDashboardTrend} navigate={navigate} refresh={refresh} onStartTour={startTour} onPaymentSetup={()=>{closeTour("completed");navigate("/app/payment-account")}} setQuestion={setQuestion}/>}
      {path === "/app/onboarding" && data && <section className="ws-card ws-onboarding"><div className="ws-onboarding-intro"><span className="ws-task-icon"><Building2/></span><p className="ws-eyebrow">{accountType === "Freelancer" ? "FREELANCER SETUP" : "ORGANIZATION SETUP"}</p><h2>Set up your workspace</h2><p className="ws-muted">Your account is ready. Add the contact details you want printed on your invoices, then choose the reminders you’d like to see.</p></div><RecordForm kind="organization" initial={data} onCancel={()=>{}} onDone={async()=>{try{await api("/api/organization/onboarding-complete",{method:"POST"});navigate("/app");}catch(e){setError(e.message);}}}/><div className="ws-onboarding-preferences"><h3>Workspace preferences</h3><p className="ws-muted">You can change these any time in Notification settings.</p>{[["overdue","Show overdue invoice reminders"],["productUpdates","Show product updates"]].map(([key,label])=><label className="ws-pref" key={key}><span><b>{label}</b><small>{key==="overdue"?"Keep unpaid invoices past their due date visible in Notifications.":"See announcements and new Invoice AI features."}</small></span><input type="checkbox" checked={!!notificationPrefs[key]} onChange={e=>{const next={...notificationPrefs,[key]:e.target.checked};setNotificationPrefs(next);localStorage.setItem(notificationPrefsKey,JSON.stringify(next));}}/></label>)}</div></section>}
      {path === "/app" && !loading && !data && <section className="ws-card ws-dashboard-unavailable"><span className="ws-task-icon"><ChartNoAxesCombined/></span><h2>Your financial summary isn’t available right now</h2><p className="ws-muted">Try loading it again. Your invoices and other workspace pages are still available from the menu.</p><button className="ws-button primary" onClick={refresh}><RefreshCw/> Try again</button></section>}
      {path === "/app/financial-health" && <FinancialHealthPage data={data} extras={reportExtras} forecast={forecast} forecastLoading={forecastLoading} forecastError={forecastError} onRetryForecast={loadForecast} loading={loading} error={error} extrasLoading={reportExtrasLoading} extrasError={reportExtrasError} periodChoice={healthPeriod} onPeriodChange={setHealthPeriod} onRetry={refresh} onRetryExtras={()=>loadReportExtras(data?.period?.from,data?.period?.to)} navigate={navigate}/>}
      {path === "/app/credit-readiness" && <CreditReadinessPage data={data} loading={loading} error={error} onRetry={refresh} navigate={navigate}/>}
      {path === "/app/financial-records" && <FinancialRecordsPage data={data} loading={loading} error={error} periodChoice={recordsPeriod} onPeriodChange={setRecordsPeriod} onRetry={refresh} onDownload={downloadFinancialRecords} onShare={shareFinancialRecords} busy={busy}/>}
      {path === "/app/financial-guidance" && <FinancialGuidancePage navigate={navigate} setQuestion={setQuestion}/>}
      {path === "/app/reports" && <FinancialReportsPage data={data} extras={reportExtras} extrasLoading={reportExtrasLoading} extrasError={reportExtrasError} loading={loading} error={error} onRetry={refresh} onRetryExtras={()=>loadReportExtras(data?.period?.from,data?.period?.to)}/>}
      {path === "/app/insights" && <YearInsightsPage data={data} loading={loading} error={error} onRetry={refresh}/>}
      {path === "/app/customers" && customerSummary && <section className="ws-card"><div className="ws-card-title"><div><h2>{customerSummary.customerName} · account summary</h2><p className="ws-muted">Invoice and payment totals for this customer.</p></div><button className="ws-button secondary" onClick={async()=>{try{const file=await apiBlob(`/api/customers/${customerSummary.customerId}/statement/pdf`);const url=URL.createObjectURL(file);const a=document.createElement("a");a.href=url;a.download=`${customerSummary.customerName}-statement.pdf`;a.click();URL.revokeObjectURL(url)}catch(e){setError(e.message)}}}>Download statement</button></div><div className="ws-billing-summary"><span>Total invoiced <b>{formatMoney(customerSummary.totalInvoiced,customerSummary.currencyCode)}</b></span><span>Paid <b>{formatMoney(customerSummary.totalPaid,customerSummary.currencyCode)}</b></span><span>Outstanding <b>{formatMoney(customerSummary.outstanding,customerSummary.currencyCode)}</b></span><span>Overdue <b>{formatMoney(customerSummary.overdue,customerSummary.currencyCode)}</b></span></div><p className="ws-muted">{customerSummary.openInvoices} open invoices · {customerSummary.overdueInvoices} overdue</p></section>}
      {!info[1] && !["/app/upload-supplier-invoice", "/app/bank-import", "/app/bank-reconciliation", "/app/invoice-detail", "/app/invoice-preview", "/app/security", "/app/preferences", "/app/notifications", "/app/help", "/app/billing/return", "/app/financial-records", "/app/credit-readiness", "/app/financial-guidance"].includes(path) && <section className="ws-card ws-empty-card"><h2>{info[0]}</h2><p>This part of Invoice AI is not ready yet. You can continue using the other workspace tools from the menu.</p></section>}
      <footer className="ws-footer">Invoice AI · Smart. Simple. Powerful.</footer></section></main><WorkspaceTour open={tourOpen} onClose={closeTour} onPaymentSetup={()=>{closeTour("completed");navigate("/app/payment-account")}}/></div>;
}
