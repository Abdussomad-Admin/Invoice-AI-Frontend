import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownLeft, ArrowLeft, ArrowRight, ArrowUpRight, Bell, Bot, Building2, CalendarDays, ChartNoAxesCombined, CheckCircle2, ChevronDown, CircleDollarSign, CircleHelp, CreditCard, FileText, Home, Landmark, LayoutDashboard, LogOut, Menu, Plus, RefreshCw, Repeat, Search, Settings, Shield, Sparkles, Upload, Users, WalletCards, X } from "lucide-react";
import { api, apiBlob, clearSession } from "./api";
import Toast from "./Toast";
import RecurringInvoices from "./RecurringInvoices";
import "./workspace.css";
import "./dashboard-overrides.css";
import "./modal.css";

const groups = [
  ["Home", [["/app", "Dashboard", LayoutDashboard]]],
  ["Sales", [["/app/invoices", "Invoices", FileText], ["/app/invoice-new", "Create invoice", Plus], ["/app/recurring-invoices", "Recurring invoices", Repeat], ["/app/invoice-detail", "Find an invoice", FileText], ["/app/invoice-preview", "View invoice PDF", FileText], ["/app/customers", "Customers", Users]]],
  ["Bills & expenses", [["/app/supplier-invoices", "Supplier bills", FileText], ["/app/upload-supplier-invoice", "Upload a bill", Upload], ["/app/suppliers", "Suppliers", Building2], ["/app/extraction-review", "Review scanned bill", Bot]]],
  ["Payments & bank", [["/app/payments", "Money received & paid", CreditCard], ["/app/payment-account", "Get paid online", WalletCards], ["/app/bank-import", "Upload bank statement", Upload], ["/app/bank-reconciliation", "Match bank transactions", RefreshCw]]],
  ["Reports", [["/app/reports", "Reports", ChartNoAxesCombined], ["/app/insights", "Compare results", Sparkles], ["/app/assistant", "Ask the AI assistant", Bot]]],
  ["Business setup · optional", [["/app/organization", "Business details", Building2], ["/app/organization-setup", "Set up business details", Building2], ["/app/team", "Team access · optional", Users], ["/app/invitations", "Invite a teammate · optional", Plus]]],
  ["Account", [["/app/billing", "Plans & subscription", CreditCard], ["/app/billing-history", "Billing details", CreditCard], ["/app/notifications", "Notifications", Bell], ["/app/profile", "My profile", Users], ["/app/security", "Password & security", Shield], ["/app/preferences", "Notification settings", Settings], ["/app/help", "Help & support", CircleHelp]]]
];
const pages = {
  "/app": ["Dashboard", "/api/reports/financial-summary"], "/app/onboarding": ["Set up your workspace", "/api/organization"], "/app/invoices": ["Invoices", "/api/invoices"],
  "/app/customers": ["Customers", "/api/customers"], "/app/suppliers": ["Suppliers", "/api/suppliers"],
  "/app/supplier-invoices": ["Supplier invoice records", "/api/supplier-bills"], "/app/payments": ["Payments", "/api/payments"],
  "/app/reports": ["Financial reports", "/api/reports/financial-summary"], "/app/assistant": ["AI financial assistant", "/api/assistant/tools"],
  "/app/insights": ["Business insights", "/api/reports/year-comparison"], "/app/organization": ["Business details", "/api/organization"],
  "/app/team": ["Team members", "/api/members"], "/app/invitations": ["Invitations", "/api/invitations"],
  "/app/billing": ["Plans", "/api/billing/plans"], "/app/notifications": ["Alerts", "/api/invoices?overdue=true&pageSize=100"],
  "/app/profile": ["My profile", "/api/profile"], "/app/security": ["Account & security", null],
  "/app/preferences": ["Notification preferences", null], "/app/help": ["Help & support", null],
  "/app/bank-reconciliation": ["Match bank transactions", null], "/app/bank-import": ["Upload a bank statement", null],
  "/app/invoice-new": ["Create invoice", "/api/customers"], "/app/invoice-detail": ["Invoice details", "/api/invoices"],
  "/app/invoice-preview": ["Invoice PDF preview", "/api/invoices"], "/app/upload-supplier-invoice": ["Upload supplier invoice", null],
  "/app/recurring-invoices": ["Recurring invoices", "/api/recurring-invoices"],
  "/app/extraction-review": ["AI extraction review", "/api/supplier-documents"], "/app/billing-history": ["Billing history", "/api/billing/history"],
  "/app/organization-setup": ["Set up your business", "/api/organization"], "/app/payment-account": ["Get paid online", "/api/payment-accounts/paystack"], "/app/payments": ["Money received & paid", "/api/payments"]
};
const pageDescriptions = {
  "/app/onboarding": "Add the business details you want to use on invoices, then choose your workspace preferences.",
  "/app": "See your income, expenses and payments in one place.",
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
  const keys = variant === "invoice-lines" ? ["position", "description", "quantity", "unitPrice", "discountPercent", "taxRatePercent", "lineSubtotal"] : variant === "customers"
    ? ["name", "email", "phone", "createdAt"]
    : variant === "payments"
      ? ["paidOn", "paymentType", "reference", "amount", "method", "isReversed"]
    : Object.keys(rows[0]).filter(k => !["lines", "notes", "addressLine1", "addressLine2", "taxIdentificationNumber", "postalCode", "countryCode", "region", "city"].includes(k)).slice(0, 7);
  const display = (row, key) => {
    if (variant === "invoice-lines") {
      if (key === "position") return row.position ?? row.lineNumber ?? "—";
      if (["unitPrice", "lineSubtotal"].includes(key)) return formatMoney(row[key], currencyCode);
      if (["discountPercent", "taxRatePercent"].includes(key)) return `${Number(row[key] || 0)}%`;
      return pretty(row[key]);
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
  return <div className={`ws-table-wrap${variant ? ` ws-table-${variant}` : ""}`}><table><thead><tr>{keys.map(k => <th key={k}>{variant === "invoice-lines" ? invoiceLineTitles[k] : variant === "payments" ? ({paidOn:"Date",paymentType:"Payment",reference:"Reference",amount:"Amount",currencyCode:"Currency",method:"Method",isReversed:"Status"}[k]) : titles[k] || k.replace(/[A-Z]/g, m => ` ${m}`).replace(/^./, m => m.toUpperCase())}</th>)}{(onEdit||onView||onArchive)&&<th>Actions</th>}</tr></thead><tbody>{rows.map((row, i) => <tr key={row.id || i}>{keys.map(k => <td key={k}>{k === "email" && row[k] ? <a className="ws-table-email" href={`mailto:${row[k]}`}>{display(row,k)}</a> : display(row,k)}</td>)}{(onEdit||onView||onArchive)&&<td><div className="ws-row-actions">{onView&&<button className="ws-row-action" onClick={()=>onView(row)}>{onViewLabel}</button>}{onEdit&&<button className="ws-row-action" onClick={()=>onEdit(row)}>Edit</button>}{onArchive&&<button className="ws-row-action subtle" onClick={()=>onArchive(row)}>{row.isArchived?"Restore":"Archive"}</button>}</div></td>}</tr>)}</tbody></table></div>;
}
function RecordForm({ kind, onDone, onCancel, initial = {} }) {
  const customer = kind === "customer", supplier = kind === "supplier", invite = kind === "invite", invoice = kind === "invoice", bill = kind === "bill";
  const [invoiceCurrency, setInvoiceCurrency] = useState(initial.currencyCode || "NGN");
  const [baseCurrency, setBaseCurrency] = useState(initial.baseCurrencyCode || "NGN");
  const [suppliers, setSuppliers] = useState([]);
  const [countryCode, setCountryCode] = useState(() => {
    const value = String(initial.countryCode || "").trim();
    return value.toUpperCase() === "NIGERIA" ? "NG" : value.slice(0, 2).toUpperCase();
  });
  useEffect(() => { if (invoice || bill) api("/api/organization").then(o => { const code = o.baseCurrencyCode || "NGN"; setBaseCurrency(code); if (!initial.id) setInvoiceCurrency(code); }).catch(() => {}); if (bill) api("/api/suppliers").then(r => setSuppliers(asList(r).filter(s => !s.isArchived))).catch(() => {}); }, [invoice, bill, initial.id]);
  const fields = customer || supplier ? [["name", "Name", "text", true], ["email", "Email", "email"], ["phone", "Phone", "tel"], ["taxIdentificationNumber", "Tax ID"], ["addressLine1", "Address line 1"], ["addressLine2", "Address line 2"], ["city", "City"], ["region", "State / region"], ["postalCode", "Postal code"], ["countryCode", "Country code"], ["notes", "Notes"]] : invite ? [["email", "Email", "email", true], ["role", "Role", "select", true]] : invoice ? [["customerId", "Customer", "select", true], ["paymentTermsDays", "Payment terms (days)", "number"]] : bill ? [["supplierId", "Supplier", "select", true], ["number", "Bill number", "text", true], ["billDate", "Bill date", "date", true], ["dueDate", "Due date", "date"], ["notes", "Notes"]] : kind === "profile" ? [["fullName", "Full name", "text", true]] : [["name", "Business name", "text", true], ["email", "Contact email", "email"], ["phone", "Phone", "tel"], ["taxIdentificationNumber", "Tax ID"], ["addressLine1", "Address line 1"], ["addressLine2", "Address line 2"], ["city", "City"], ["region", "State / region"], ["postalCode", "Postal code"], ["defaultPaymentTermsDays", "Default payment terms (days)", "number"]];
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError(""); const f = new FormData(e.currentTarget); const body = Object.fromEntries(f.entries());
    try {
      if (customer) await api(initial.id ? `/api/customers/${initial.id}` : "/api/customers", { method: initial.id ? "PUT" : "POST", body: { ...body, countryCode: countryCode || null, taxIdentificationNumber: body.taxIdentificationNumber || null, addressLine2: body.addressLine2 || null, region: body.region || null, postalCode: body.postalCode || null, notes: body.notes || null } });
      else if (supplier) await api(initial.id ? `/api/suppliers/${initial.id}` : "/api/suppliers", { method: initial.id ? "PUT" : "POST", body: { ...body, countryCode: countryCode || null, taxIdentificationNumber: body.taxIdentificationNumber || null, addressLine2: body.addressLine2 || null, region: body.region || null, postalCode: body.postalCode || null, notes: body.notes || null, defaultPaymentTermsDays: Number(body.defaultPaymentTermsDays) || initial.defaultPaymentTermsDays || 30 } });
      else if (invite) await api("/api/invitations", { method: "POST", body: { email: body.email, role: body.role } });
      else if (invoice) await api(initial.id ? `/api/invoices/${initial.id}` : "/api/invoices", { method: initial.id ? "PUT" : "POST", body: { customerId: body.customerId, paymentTermsDays: Number(body.paymentTermsDays) || 30, notes: body.notes || null, currencyCode: body.currencyCode, exchangeRateToBase: body.currencyCode === baseCurrency ? 1 : Number(body.exchangeRateToBase), lines: [{ description: body.description || "Services", quantity: Number(body.quantity) || 1, unitPrice: Number(body.unitPrice) || 0, discountPercent: Number(body.discountPercent) || 0, taxRatePercent: Number(body.taxRatePercent) || 0 }] } });
      else if (bill) await api("/api/supplier-bills", { method: "POST", body: { supplierId: body.supplierId, number: body.number, billDate: body.billDate, dueDate: body.dueDate || null, notes: body.notes || null, currencyCode: body.currencyCode, exchangeRateToBase: body.currencyCode === baseCurrency ? 1 : Number(body.exchangeRateToBase), lines: [{ description: body.description, quantity: Number(body.quantity) || 1, unitPrice: Number(body.unitPrice) || 0, discountPercent: Number(body.discountPercent) || 0, taxRatePercent: Number(body.taxRatePercent) || 0 }] } });
      else if (kind === "profile") await api("/api/profile", { method: "PUT", body: { fullName: body.fullName } });
      else await api("/api/organization", { method: "PUT", body: { ...initial, ...body, defaultPaymentTermsDays: Number(body.defaultPaymentTermsDays) || 30 } });
      onDone();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <form className="ws-form" onSubmit={submit}><div className="ws-form-grid">{fields.map(([key, label, type = "text", required]) => <label key={key}>{label}{type === "select" && invite ? <select name={key} required={required}><option value="">Select role</option><option value="Staff">Staff</option><option value="Accountant">Accountant</option><option value="Admin">Admin</option></select> : bill && key === "supplierId" ? <select name={key} required defaultValue={initial.supplierId || ""}><option value="">Choose a supplier</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select> : invoice && key === "customerId" ? <select name={key} required defaultValue={initial.customerId || ""}><option value="">Choose a customer</option>{asList(initial.customers || initial).map(customer=><option key={customer.id} value={customer.id}>{customer.name} · {customer.email||"no email"}</option>)}</select> : (customer || supplier) && key === "countryCode" ? <><input name={key} value={countryCode} onChange={e=>setCountryCode(e.target.value.replace(/[^a-z]/gi, "").slice(0, 2).toUpperCase())} placeholder="NG" autoComplete="country" maxLength={2} aria-describedby="country-code-help"/><small id="country-code-help">Enter the 2-letter country code (Nigeria is NG).</small></> : <input name={key} type={type} required={required} defaultValue={initial[key] ?? (bill && key === "billDate" ? new Date().toISOString().slice(0,10) : "")} />}</label>)}{(invoice || bill) && <><label>{bill ? "Bill currency" : "Invoice currency"}<input name="currencyCode" value={invoiceCurrency} onChange={e=>setInvoiceCurrency(e.target.value.toUpperCase())} maxLength="3" required/><small>Workspace reporting currency: {baseCurrency}</small></label>{invoiceCurrency !== baseCurrency && <label>Exchange rate to {baseCurrency}<input name="exchangeRateToBase" type="number" min="0.00000001" step="0.00000001" defaultValue={initial.exchangeRateToBase ?? ""} required/><small>For each 1 {invoiceCurrency}, enter its value in {baseCurrency}. Saved with the record.</small></label>}<label>Description<input name="description" defaultValue={initial.lines?.[0]?.description || ""} required /></label><label>Quantity<input name="quantity" type="number" min="0.01" step="0.01" defaultValue={initial.lines?.[0]?.quantity ?? "1"} required /></label><label>Unit price ({invoiceCurrency})<input name="unitPrice" type="number" min="0.01" step="0.01" defaultValue={initial.lines?.[0]?.unitPrice ?? ""} required /></label><label>Discount (%)<input name="discountPercent" type="number" min="0" max="100" step="0.01" defaultValue={initial.lines?.[0]?.discountPercent ?? "0"}/></label><label>Tax rate (%)<input name="taxRatePercent" type="number" min="0" max="100" step="0.01" defaultValue={initial.lines?.[0]?.taxRatePercent ?? "0"}/></label></>}</div>{error && <p className="ws-error">{error}</p>}<div className="ws-form-actions"><button type="button" className="ws-button secondary" onClick={onCancel}>Cancel</button><button className="ws-button primary" disabled={busy}>{busy ? "Saving…" : "Save"}</button></div></form>;
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
  const [currencyCode, setCurrencyCode] = useState(extraction.data?.currencyCode || baseCurrencyCode);
  const [exchangeRate, setExchangeRate] = useState("");
  useEffect(() => { setCurrencyCode(extraction.data?.currencyCode || baseCurrencyCode); setExchangeRate(""); }, [extraction, baseCurrencyCode]);
  const bill = extraction.data;
  const canApprove = bill?.invoiceDate && bill?.invoiceNumber && bill?.lines?.length;
  return <><div className="ws-form-grid"><label>Bill currency<input value={currencyCode} maxLength={3} onChange={e=>setCurrencyCode(e.target.value.toUpperCase())} required/><small>Detected from the uploaded bill. Workspace reporting currency: {baseCurrencyCode}.</small></label>{currencyCode!==baseCurrencyCode&&<label>Exchange rate to {baseCurrencyCode}<input type="number" min="0.00000001" step="0.00000001" value={exchangeRate} onChange={e=>setExchangeRate(e.target.value)} required/><small>For each 1 {currencyCode}, enter its value in {baseCurrencyCode}.</small></label>}</div><button className="ws-button primary" disabled={!canApprove||!currencyCode||(currencyCode!==baseCurrencyCode&&!exchangeRate)} onClick={async()=>{setBusy(true);onError("");try{await api(`/api/supplier-documents/${documentId.trim()}/approve`,{method:"POST",body:{supplierId:extraction.matchedSupplierId||null,newSupplier:extraction.matchedSupplierId?null:{name:bill.supplierName||"Supplier",taxIdentificationNumber:bill.supplierTaxId||null,email:null,phone:null,defaultPaymentTermsDays:30},number:bill.invoiceNumber,billDate:bill.invoiceDate,dueDate:bill.dueDate||null,notes:"Created from AI reviewed supplier invoice",lines:bill.lines.map(line=>({description:line.description||"Item",quantity:line.quantity||1,unitPrice:line.unitPrice||0,discountPercent:line.discountPercent||0,taxRatePercent:line.taxRatePercent||0})),printedTotal:bill.total??null,confirmCurrencyIsBase:false,currencyCode,exchangeRateToBase:currencyCode===baseCurrencyCode?1:Number(exchangeRate)}});onSuccess();}catch(e){onError(e.message)}finally{setBusy(false)}}}>Create draft bill from reviewed data</button></>;
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
    e.preventDefault(); const form = new FormData(e.currentTarget); setBusy(true); onError("");
    try {
      await api(`/api/invoices/${invoice.id}/credit-notes/${note.id}/refunds`, { method: "POST", body: {
        paymentId: form.get("paymentId"), amount: Number(form.get("amount")), reason: form.get("reason"),
        channel: canPaystack && channel === "Paystack" ? "Paystack" : "External", reference: form.get("reference") || null
      }});
      await refresh(); e.currentTarget.reset();
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

  async function connect(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true); onError("");
    try {
      await api("/api/payment-accounts/paystack", { method: "POST", body: {
        bankCode: String(form.get("bankCode")).trim(), accountNumber: String(form.get("accountNumber")).trim()
      }});
      setData(await api("/api/payment-accounts/paystack"));
      e.currentTarget.reset();
    } catch (error) { onError(error.message); }
    finally { setBusy(false); }
  }

  const ready = data.isActive && (data.isVerified || data.isTestMode);
  return <div className="ws-money-page">
    <section className="ws-card ws-money-hero">
      <div className="ws-money-hero-icon"><WalletCards/></div>
      <div className="ws-money-hero-copy"><span className="ws-money-eyebrow">ONLINE PAYMENTS</span><h2>Get paid through your invoices</h2><p>Connect the bank account where you want to receive customer payments. When a customer pays an invoice online, Paystack sends the money to this account.</p></div>
      <div className={`ws-money-status ${ready ? "ready" : "pending"}`}><i/>{ready ? "Ready to receive payments" : data.status || "Setup needed"}</div>
    </section>

    <section className="ws-money-status-grid" aria-label="Payment account status">
      <article className="ws-card ws-money-status-card"><span>Settlement account</span><b>{data.status === "Not set up" ? "Not connected" : "Connected"}</b><small>The bank account Paystack will pay into</small></article>
      <article className="ws-card ws-money-status-card"><span>Verification</span><b>{data.isVerified ? "Verified" : data.isTestMode ? "Test mode" : data.status === "Not set up" ? "Not started" : "In progress"}</b><small>{data.isTestMode ? "Verification is not required for test payments" : "Paystack confirms the account details"}</small></article>
      <article className="ws-card ws-money-status-card"><span>Payment currency</span><b>{data.currencyCode || baseCurrencyCodeFallback(data)}</b><small>Set by your business workspace</small></article>
    </section>

    {data.status === "Not set up" ? <section className="ws-card ws-payment-setup">
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
    </section> : <section className="ws-card ws-connected-account">
      <div className="ws-money-section-heading"><div><span className="ws-money-step">ACCOUNT</span><h3>Your payment account</h3><p>{ready ? "Customers can pay your invoices online." : "Paystack is still checking the account. You can refresh the status here."}</p></div><button className="ws-button secondary" disabled={busy} onClick={refreshStatus}><RefreshCw/>{busy ? "Checking…" : "Refresh status"}</button></div>
      <div className="ws-connected-account-note"><CheckCircle2/><div><b>{ready ? "Account connected" : "Verification pending"}</b><span>{ready ? "New online invoice payments will be settled to your selected bank account." : "Online payments become available after Paystack verifies your details."}</span></div></div>
    </section>}
    <p className="ws-money-footnote"><Shield size={14}/> Card details are entered on Paystack’s secure checkout page. Invoice AI never handles or stores card details.</p>
  </div>;
}

function baseCurrencyCodeFallback(data) { return data.currencyCode || "Workspace currency"; }

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

function InvoiceActions({ invoice, onUpdate, onError, onEdit }) {
 const [busy,setBusy]=useState(false),[reason,setReason]=useState(""),[dueDate,setDueDate]=useState(invoice.dueDate||"");
 async function run(suffix,body){setBusy(true);onError("");try{onUpdate(await api(`/api/invoices/${invoice.id}/${suffix}`,{method:"POST",body}))}catch(e){onError(e.message)}finally{setBusy(false)}}
 return <section className="ws-invoice-actions"><div className="ws-invoice-actions-heading"><div><h4>Invoice actions</h4><p>Update the status or manage this invoice.</p></div><span className={`ws-invoice-status ${String(invoice.status||"").toLowerCase()}`}>{String(invoice.status||"Unknown").replace(/([a-z])([A-Z])/g,"$1 $2")}</span></div><div className="ws-record-actions">{invoice.status==="Draft"&&<><button className="ws-button secondary" onClick={onEdit}>Edit draft</button><label>Due date<input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}/></label><button className="ws-button primary" disabled={busy} onClick={()=>run("issue",{dueDate:dueDate||null})}>{busy?"Working…":"Issue invoice"}</button></>}{["Issued","PartiallyPaid"].includes(invoice.status)&&<button className="ws-button secondary" disabled={busy} onClick={()=>run("send",{message:null})}>Send invoice email</button>}{!["Paid","Void"].includes(invoice.status)&&<form onSubmit={e=>{e.preventDefault();if(reason.trim())run("void",{reason:reason.trim()})}}><input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Reason to void" required/><button className="ws-button secondary" disabled={busy}>Void invoice</button></form>}</div></section>;
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
    {pdfUrl&&<div className="ws-pdf-preview-result"><div><b>Invoice PDF</b><a className="ws-button secondary" href={pdfUrl} download="invoice.pdf">Download PDF</a></div><iframe title="Invoice PDF preview" className="ws-pdf-frame" src={pdfUrl}/></div>}
  </section>;
}

function formatMoney(value, currencyCode = "NGN") {
  try {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency: currencyCode, maximumFractionDigits: 0 }).format(Number(value) || 0);
  } catch {
    return `${currencyCode} ${(Number(value) || 0).toLocaleString()}`;
  }
}

function DashboardOverview({ data, navigate, refresh }) {
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
  const isNew = Number(periodValues.invoiceCount) === 0 && values.every(value => value === 0);
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
        </div>
      </div>
      <div className="ws-dashboard-art" aria-hidden="true"><div className="ws-art-orbit orbit-one"/><div className="ws-art-orbit orbit-two"/><span className="ws-art-icon"><ChartNoAxesCombined/></span><span className="ws-art-chip"><CheckCircle2/> Clear financial picture</span></div>
    </section>

    <div className="ws-section-heading"><div><h2>Financial overview</h2><p>Key figures for your current reporting period</p></div><span className="ws-period-chip"><CalendarDays/>{dateLabel}</span></div>
    <section className="ws-metrics">{metrics.map(([label,value,Icon,tone,description])=><article className={`ws-metric ${tone}`} key={label}><div className="ws-metric-top"><span>{label}</span><i><Icon/></i></div><b>{formatMoney(value, read(summary, "currencyCode") || "NGN")}</b><small>{description}</small></article>)}</section>

    <div className="ws-section-heading ws-actions-heading"><div><h2>{isNew ? "Get started" : "Quick actions"}</h2><p>{isNew ? "A few simple steps will make this dashboard more useful." : "Common tasks, ready when you are."}</p></div></div>
    <section className="ws-action-grid">{actions.map(([href,title,description,Icon],index)=><button className={`ws-action-card action-${index+1}`} key={href} onClick={() => navigate(href)}><span><Icon/></span><span className="ws-action-copy"><b>{title}</b><small>{description}</small></span><ArrowUpRight className="ws-action-arrow"/></button>)}</section>
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
  const notificationPrefsKey = `invoice-ai-notification-preferences:${sessionStorage.getItem("invoice-ai-organization") || "default"}`;
  const [accountType, setAccountType] = useState(null);
  const [baseCurrencyCode, setBaseCurrencyCode] = useState("NGN");
  const [billCurrencyCode, setBillCurrencyCode] = useState("NGN");
  const [showArchived, setShowArchived] = useState(false);
  const [customerSummary, setCustomerSummary] = useState(null);
  useEffect(() => { api("/api/organization").then(org => { setAccountType(org.accountType === 0 ? "Freelancer" : org.accountType || "Organization"); setBaseCurrencyCode(org.baseCurrencyCode || "NGN"); if (org.isOnboardingComplete === false && path !== "/app/onboarding") navigate("/app/onboarding"); }).catch(() => setAccountType("Organization")); }, []);
  useEffect(() => { if (accountType === "Freelancer" && ["/app/team", "/app/invitations"].includes(path)) navigate("/app"); }, [accountType, path, navigate]);
  const [data, setData] = useState(null), [error, setError] = useState(""), [toast, setToast] = useState(null), [loading, setLoading] = useState(true), [showForm, setShowForm] = useState(false), [editingRecord, setEditingRecord] = useState(null), [question, setQuestion] = useState(""), [answer, setAnswer] = useState(""), [busy, setBusy] = useState(false), [query, setQuery] = useState(""), [invoiceId, setInvoiceId] = useState(""), [invoiceRecord, setInvoiceRecord] = useState(null), [invoicePayments,setInvoicePayments]=useState([]), [invoiceCreditNotes,setInvoiceCreditNotes]=useState([]), [billId,setBillId]=useState(""), [billRecord,setBillRecord]=useState(null), [billPayments,setBillPayments]=useState([]), [pdfUrl,setPdfUrl]=useState(""), [documentId, setDocumentId] = useState(""), [extraction, setExtraction] = useState(null), [batchId, setBatchId] = useState(()=>sessionStorage.getItem("invoice-ai-bank-batch") || ""), [batchDetails, setBatchDetails] = useState(null), [suggestions, setSuggestions] = useState({}), [reportExtras,setReportExtras]=useState(null), [notificationPrefs, setNotificationPrefs] = useState(()=>JSON.parse(localStorage.getItem(notificationPrefsKey)||"{\"overdue\":true,\"productUpdates\":false}"));
  const info = pages[path] || pages["/app"];
  const refresh = useCallback(async () => { setLoading(true); setError(""); try { if(path==="/app/payments"){const [sales,bills]=await Promise.all([api("/api/payments"),api("/api/supplier-payments")]);setData({items:[...asList(sales).map(x=>({...x,paymentType:"Sales"})),...asList(bills).map(x=>({...x,paymentType:"Supplier bill"}))]});}else if(path==="/app/billing-history"){try{setData(await api("/api/billing/history"))}catch{const current=await api("/api/billing/subscription");setData({subscription:{status:current.status||"Free",planCode:current.planCode,planName:current.plan?.name,currencyCode:current.currencyCode,amountMinor:current.amountMinor,currentPeriodStart:current.currentPeriodStart,currentPeriodEnd:current.currentPeriodEnd,canCancel:["Active","PastDue"].includes(current.status)},checkouts:[],historyUnavailable:true})}}else if(["/app/customers","/app/suppliers"].includes(path)){const base=path==="/app/customers"?"/api/customers":"/api/suppliers";setData(await api(`${base}?includeArchived=${showArchived}`));}else setData(info[1] ? await api(info[1]) : null); } catch (e) { setError(e.message); setData(null); } finally { setLoading(false); } }, [info[1],path,showArchived]);
  useEffect(() => { setShowForm(false); setEditingRecord(null); refresh(); }, [path, refresh]);
  useEffect(() => { if(!showForm) return; const closeOnEscape = e => { if(e.key === "Escape") { setShowForm(false); setEditingRecord(null); } }; document.addEventListener("keydown",closeOnEscape); document.body.style.overflow="hidden"; return () => { document.removeEventListener("keydown",closeOnEscape); document.body.style.overflow=""; }; }, [showForm]);
  useEffect(() => { if(path==="/app/invoice-detail"&&invoiceId&&!invoiceRecord?.lines) api(`/api/invoices/${invoiceId}`).then(setInvoiceRecord).catch(e=>setError(e.message)); }, [path,invoiceId]);
  useEffect(() => { if(path==="/app/invoice-detail"&&invoiceRecord?.id) { api(`/api/invoices/${invoiceRecord.id}/payments`).then(r=>setInvoicePayments(asList(r))).catch(()=>setInvoicePayments([])); api(`/api/invoices/${invoiceRecord.id}/credit-notes`).then(r=>setInvoiceCreditNotes(asList(r))).catch(()=>setInvoiceCreditNotes([])); } }, [path,invoiceRecord?.id]);
  useEffect(() => { if(path==="/app/supplier-invoices"&&billId) {api(`/api/supplier-bills/${billId}`).then(setBillRecord).catch(e=>setError(e.message));api(`/api/supplier-bills/${billId}/payments`).then(r=>setBillPayments(asList(r))).catch(()=>setBillPayments([]));} }, [path,billId]);
  useEffect(() => { if(path==="/app/bank-reconciliation"&&batchId&&!batchDetails) api(`/api/bank-statements/${batchId}`).then(setBatchDetails).catch(e=>setError(e.message)); }, [path,batchId,batchDetails]);
  useEffect(() => { if(extraction?.data) setBillCurrencyCode((extraction.data.currencyCode || baseCurrencyCode).toUpperCase()); }, [extraction,baseCurrencyCode]);
  useEffect(() => { if(path==="/app/reports") Promise.all([api("/api/reports/receivables-aging"),api("/api/reports/payables-aging"),api("/api/reports/expenses")]).then(([receivables,payables,expenses])=>setReportExtras({receivables,payables,expenses})).catch(()=>setReportExtras(null)); }, [path]);
  const list = useMemo(() => asList(data), [data]);
  const filtered = useMemo(() => query ? list.filter(row => JSON.stringify(row).toLowerCase().includes(query.toLowerCase())) : data, [data, list, query]);
  const addKind = path === "/app/customers" ? "customer" : path === "/app/suppliers" ? "supplier" : path === "/app/supplier-invoices" ? "bill" : path === "/app/invitations" ? "invite" : path === "/app/invoice-new" || (path === "/app/invoice-detail" && editingRecord?.id) ? "invoice" : "organization";
  const canCreate = ["/app/customers", "/app/suppliers", "/app/supplier-invoices", "/app/invitations", "/app/invoice-new", "/app/organization", "/app/organization-setup"].includes(path);
  const doAsk = async e => { e.preventDefault(); setBusy(true); setAnswer(""); try { const r = await api("/api/assistant/ask", { method: "POST", body: { question } }); setAnswer(r.answer || JSON.stringify(r)); } catch (e2) { setAnswer(e2.message); } finally { setBusy(false); } };
  const doUpload = async e => { e.preventDefault(); const file = e.currentTarget.elements.file.files[0]; if (!file) return; const form = new FormData(); form.append("file", file); setBusy(true); try { const doc = await api("/api/supplier-documents", { method: "POST", body: form }); setDocumentId(doc.id); setExtraction(await api(`/api/supplier-documents/${doc.id}/extract`,{method:"POST"})); navigate("/app/extraction-review"); } catch (e2) { setError(e2.message); } finally { setBusy(false); } };
  const exportData = async format => { setBusy(true); setError(""); try { const kind = path === "/app/invoices" ? "invoices" : "customers"; const blob = await apiBlob(`/api/${kind}/export?format=${format}`); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `${kind}-${new Date().toISOString().slice(0,10)}.${format}`; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  const logOut = async () => { const refreshToken = sessionStorage.getItem("invoice-ai-refresh"); try { if (refreshToken) await api("/api/auth/logout", { method: "POST", body: { refreshToken } }); } catch {} clearSession(); navigate("/login"); };
  const visibleGroups = groups.filter(([group]) => !(accountType === "Freelancer" && group === "Business setup · optional")).map(([group, items]) => [group, accountType === "Freelancer" ? items.filter(([url]) => !["/app/team", "/app/invitations"].includes(url)) : items]);
  const currentGroup = visibleGroups.find(([, items]) => items.some(([url]) => url === path))?.[0];
  return <div className="workspace"><aside className="ws-sidebar"><a className="ws-brand" href="/app" onClick={e => { e.preventDefault(); navigate("/app"); }}><span className="ws-brand-icon"><FileText/></span><span>Invoice <i>AI</i><small>Simple finance workspace</small></span></a><div className="ws-org"><span><LayoutDashboard/></span><div><b>Your workspace</b><small>{accountType === "Freelancer" ? "Freelancer account" : accountType === "Organization" ? "Organization account" : "Your invoices and finances"}</small></div></div><nav aria-label="Workspace pages">{visibleGroups.map(([group, items]) => <details className="ws-nav-group" key={group} open={group === currentGroup}><summary className="ws-group-title">{group}<ChevronDown/></summary><div className="ws-nav-items">{items.map(([url, label, Icon]) => <button key={url} className={path === url ? "active" : ""} onClick={() => navigate(url)}><Icon/>{label}</button>)}</div></details>)}</nav><button className="ws-logout" onClick={logOut}><LogOut/> Sign out</button></aside><main className="ws-main"><header className="ws-topbar"><div className="ws-breadcrumb"><span className="ws-breadcrumb-home"><Home/></span><span>Your workspace</span><b>›</b><strong>{info[0]}</strong></div><div><button className="ws-icon-btn" aria-label="Alerts" title="Alerts" onClick={() => navigate("/app/notifications")}><Bell/></button><span className="ws-avatar" aria-label="Invoice AI account">IA</span></div></header><section className="ws-content"><div className={`ws-heading${["/app","/app/payments","/app/recurring-invoices","/app/bank-import","/app/bank-reconciliation","/app/payment-account","/app/upload-supplier-invoice"].includes(path) ? " ws-heading-hidden" : ""}`}><div><p>YOUR WORKSPACE</p><h1>{info[0]}</h1><span>{pageDescriptions[path] || "Manage your business details and activity."}</span></div><div className="ws-actions">{["/app/customers","/app/suppliers"].includes(path) && <button className="ws-button secondary" onClick={()=>setShowArchived(!showArchived)}>{showArchived?"Hide archived":"Show archived"}</button>}{data !== null && <button className="ws-button secondary" onClick={refresh}><RefreshCw/> Refresh</button>}{["/app/customers","/app/invoices"].includes(path) && <><button className="ws-button secondary" disabled={busy} onClick={() => exportData("csv")}>Export CSV</button><button className="ws-button secondary" disabled={busy} onClick={() => exportData("xlsx")}>Export Excel</button></>}{canCreate && <button className="ws-button primary" onClick={() => setShowForm(!showForm)}><Plus/> {path === "/app/invoice-new" ? "Create invoice" : path === "/app/supplier-invoices" ? "Add supplier bill" : path === "/app/invitations" ? "Invite a teammate" : path === "/app/organization" || path === "/app/organization-setup" ? "Edit business details" : `Add ${path === "/app/customers" ? "customer" : "supplier"}`}</button>}</div></div>
      {error && <Toast type="error" title="Something needs your attention" onClose={() => setError("")}>{error}</Toast>}
      {toast && <Toast type={toast.type} title={toast.title} onClose={() => setToast(null)}>{toast.message}</Toast>}
      {showForm && <div className="ws-modal-backdrop" onMouseDown={e => {if(e.target===e.currentTarget){setShowForm(false);setEditingRecord(null)}}}><section className="ws-modal" role="dialog" aria-modal="true" aria-labelledby="ws-modal-title"><div className="ws-modal-head"><span className="ws-modal-mark"><FileText size={19}/></span><div><h2 id="ws-modal-title">{editingRecord ? `Edit ${addKind}` : path === "/app/supplier-invoices" ? "Add a supplier bill" : path === "/app/invitations" ? "Invite a teammate" : path.includes("invoice") ? "Create an invoice" : path.includes("organization") ? "Business details" : `Add ${addKind}`}</h2><p>{path.includes("organization") ? "Add the details you want to show on your invoices. You can leave this blank if you work as a freelancer." : "Add the information below, then save it to your workspace."}</p></div><button type="button" className="ws-modal-close" onClick={() => {setShowForm(false);setEditingRecord(null)}} aria-label="Close dialog"><X/></button></div><div className="ws-modal-body"><RecordForm kind={addKind} initial={editingRecord || data || {}} onCancel={() => {setShowForm(false);setEditingRecord(null)}} onDone={async () => { setShowForm(false);setEditingRecord(null); if(path==="/app/invoice-detail"&&invoiceId){try{setInvoiceRecord(await api(`/api/invoices/${invoiceId}`))}catch(e){setError(e.message)}} refresh(); setToast({type:"success",title:"Saved successfully",message:`${addKind[0].toUpperCase()+addKind.slice(1)} details have been saved.`}); }} /></div></section></div>}
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
      {path === "/app/assistant" ? <section className="ws-card"><h2>Ask about your business finances</h2><p className="ws-muted">The assistant answers using the financial data available to your organization.</p><form className="ws-ask" onSubmit={doAsk}><textarea value={question} onChange={e => setQuestion(e.target.value)} placeholder="For example: Which invoices are overdue?" required/><button className="ws-button primary" disabled={busy}>{busy ? "Thinking…" : "Ask assistant"}</button></form>{answer && <div className="ws-answer">{answer}</div>}</section> : null}
      {path === "/app/upload-supplier-invoice" ? <SupplierInvoiceUpload busy={busy} onUpload={doUpload}/> : null}
      {path === "/app/bank-import" && <section className="ws-money-page">
        <div className="ws-card ws-money-hero compact"><div className="ws-money-hero-icon"><Upload/></div><div className="ws-money-hero-copy"><span className="ws-money-eyebrow">BANK STATEMENTS</span><h2>Bring your bank activity into Invoice AI</h2><p>Upload a statement file and we’ll help match its deposits and withdrawals to the payments you recorded.</p></div></div>
        <section className="ws-card ws-bank-import-card"><div className="ws-bank-step-list"><div className="ws-bank-step active"><i>1</i><span><b>Choose a statement</b><small>CSV or Excel file</small></span></div><div className="ws-bank-step"><i>2</i><span><b>Review transactions</b><small>Check the imported lines</small></span></div><div className="ws-bank-step"><i>3</i><span><b>Match payments</b><small>Connect bank lines to records</small></span></div></div>
          <div className="ws-bank-upload-area"><div className="ws-bank-upload-icon"><FileText/></div><h3>Select your bank statement</h3><p>Choose a CSV or Excel file downloaded from your bank. We’ll check it before saving the transactions.</p><form className="ws-bank-upload-form" onSubmit={async e => {
            e.preventDefault(); const form = new FormData(); form.append("file", e.currentTarget.elements.file.files[0]); setBusy(true); setError("");
            try {
              const result = await api("/api/bank-statements/import", { method: "POST", body: form });
              if (!result.batchId) { setAnswer(`We checked ${result.rowsRead} rows but couldn’t import any transactions. Review the file and try again.`); return; }
              setBatchId(result.batchId); sessionStorage.setItem("invoice-ai-bank-batch", result.batchId);
              const details = await api(`/api/bank-statements/${result.batchId}`); setBatchDetails(details);
              setAnswer(`Imported ${result.imported} transactions. Review them and match the ones you recognize.`);
              navigate("/app/bank-reconciliation");
            } catch (x) { setError(x.message); }
            finally { setBusy(false); }
          }}><label className="ws-file-picker">Choose statement file<input name="file" type="file" accept=".csv,.xlsx" required/></label><button className="ws-button primary" disabled={busy}>{busy ? "Checking your statement…" : "Import statement"}</button></form><small className="ws-bank-file-note">You can upload a CSV or Excel file, up to 5 MB. Your bank keeps the original statement.</small></div>
          <details className="ws-bank-format"><summary>What if my bank file looks different?</summary><p>We can read a simple CSV with these columns: <b>TransactionDate, Description, Amount, CurrencyCode</b>. Add <b>Reference</b> if your bank provides one. For money received, enter a positive amount; for money leaving your account, enter a negative amount.</p><div className="ws-bank-format-actions"><button className="ws-button secondary" type="button" onClick={()=>{const file=new Blob(["TransactionDate,Description,Amount,CurrencyCode,Reference\r\n"],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(file);const link=document.createElement("a");link.href=url;link.download="invoice-ai-bank-statement-template.csv";link.click();URL.revokeObjectURL(url)}}><FileText/> Download a blank CSV template</button><button className="ws-text-button" type="button" onClick={()=>navigate("/app/help")}>Get help preparing a statement</button></div></details>
          {answer&&<div className="ws-money-inline-success" role="status"><CheckCircle2/>{answer}</div>}
        </section>
      </section>}
      {path === "/app/invoice-detail" && <section className="ws-card"><h2>Choose an invoice</h2><p className="ws-muted">Select an invoice from the list below, or enter its invoice ID to open it directly.</p><form className="ws-ask ws-invoice-lookup" onSubmit={async e=>{e.preventDefault();setBusy(true);setError("");try{setInvoiceRecord(await api(`/api/invoices/${invoiceId.trim()}`))}catch(x){setError(x.message);setInvoiceRecord(null)}finally{setBusy(false)}}}><input aria-label="Invoice ID" value={invoiceId} onChange={e=>setInvoiceId(e.target.value)} placeholder="Enter invoice ID" required/><button className="ws-button primary" disabled={busy}>{busy?"Loading invoice…":"Open invoice"}</button></form>{invoiceRecord&&<div className="ws-detail"><div className="ws-invoice-summary"><div><span>INVOICE</span><h3>{invoiceRecord.number||"Invoice"}</h3><p>Billed to {invoiceRecord.customerName||"Customer"}</p></div><div className="ws-invoice-summary-total"><span>Amount due</span><strong>{formatMoney(invoiceRecord.balance ?? invoiceRecord.total, invoiceRecord.currencyCode)}</strong><small>Total {formatMoney(invoiceRecord.total, invoiceRecord.currencyCode)} · Due {invoiceRecord.dueDate?new Date(invoiceRecord.dueDate).toLocaleDateString():"No due date"}</small></div></div><div className="ws-invoice-lines-section"><div className="ws-invoice-section-heading"><div><h4>Items and services</h4><p>Details included on this invoice.</p></div><button className="ws-button secondary" onClick={()=>navigate("/app/invoice-preview")}>View invoice PDF</button></div><Table data={invoiceRecord.lines} variant="invoice-lines" currencyCode={invoiceRecord.currencyCode}/></div><InvoiceActions invoice={invoiceRecord} onUpdate={setInvoiceRecord} onError={setError} onEdit={async()=>{try{const customers=await api("/api/customers");setEditingRecord({...invoiceRecord,customers});setShowForm(true)}catch(e){setError(e.message)}}}/>{Number(invoiceRecord.balance)>0&&<form className="ws-payment-form" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);setBusy(true);setError("");try{await api(`/api/invoices/${invoiceRecord.id}/payments`,{method:"POST",body:{amount:Number(f.get("amount")),paidOn:f.get("paidOn")||null,method:f.get("method"),reference:f.get("reference")||null,notes:null,exchangeRateToBase:f.has("exchangeRateToBase")?Number(f.get("exchangeRateToBase")):null}});setInvoiceRecord(await api(`/api/invoices/${invoiceRecord.id}`));setInvoicePayments(asList(await api(`/api/invoices/${invoiceRecord.id}/payments`)));e.currentTarget.reset()}catch(x){setError(x.message)}finally{setBusy(false)}}}><h3>Record a payment</h3><div className="ws-form-grid"><label>Amount<input name="amount" type="number" min="0.01" step="0.01" max={invoiceRecord.balance} required/></label><label>Payment date<input name="paidOn" type="date" defaultValue={new Date().toISOString().slice(0,10)}/></label><label>Method<select name="method"><option value="BankTransfer">Bank transfer</option><option value="Cash">Cash</option><option value="Card">Card</option><option value="Cheque">Cheque</option><option value="MobileMoney">Mobile money</option><option value="Other">Other</option></select></label><label>Reference<input name="reference"/></label>{invoiceRecord.currencyCode!==invoiceRecord.baseCurrencyCode&&<label>Exchange rate to {invoiceRecord.baseCurrencyCode}<input name="exchangeRateToBase" type="number" min="0.00000001" step="0.00000001" required/><small>Enter the rate for this payment date.</small></label>}</div><button className="ws-button primary" disabled={busy}>{busy?"Saving payment…":"Record payment"}</button></form>}{invoicePayments.length>0&&<><h3>Payments received</h3><Table data={invoicePayments}/></>}<form className="ws-payment-form" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);setBusy(true);setError("");try{await api(`/api/invoices/${invoiceRecord.id}/credit-notes`,{method:"POST",body:{amount:Number(f.get("amount")),reason:String(f.get("reason"))}});setInvoiceRecord(await api(`/api/invoices/${invoiceRecord.id}`));setInvoiceCreditNotes(asList(await api(`/api/invoices/${invoiceRecord.id}/credit-notes`)));e.currentTarget.reset()}catch(x){setError(x.message)}finally{setBusy(false)}}}><h3>Issue a credit note</h3><p className="ws-muted">Credits reduce what the customer owes. Any refund of money already received must be handled separately.</p><div className="ws-form-grid"><label>Amount ({invoiceRecord.currencyCode})<input name="amount" type="number" min="0.01" step="0.01" max={invoiceRecord.total} required/></label><label>Reason<input name="reason" maxLength="500" required placeholder="For example, returned item"/></label></div><button className="ws-button secondary" disabled={busy||invoiceRecord.status==="Draft"||invoiceRecord.status==="Void"}>{busy?"Issuing…":"Issue credit note"}</button></form>{invoiceCreditNotes.length>0&&<><h3>Credit notes</h3><div className="ws-credit-notes">{invoiceCreditNotes.map(note=><CreditNoteCard key={note.id} note={note} invoice={invoiceRecord} payments={invoicePayments} onError={setError}/>)}</div></>}</div>}</section>}
      {path === "/app/supplier-invoices" && billRecord && <section className="ws-card"><div className="ws-card-title"><div><h2>{billRecord.number} · {billRecord.supplierName}</h2><p className="ws-muted">{billRecord.status} · {billRecord.currencyCode} {Number(billRecord.total||0).toLocaleString()} · Balance {Number(billRecord.balance||0).toLocaleString()}{billRecord.currencyCode!==billRecord.baseCurrencyCode&&<> · Reporting value {billRecord.baseCurrencyCode} {(Number(billRecord.total||0)*Number(billRecord.exchangeRateToBase||1)).toLocaleString()}</>}</p></div><button className="ws-button secondary" onClick={()=>{setBillId("");setBillRecord(null)}}>Close details</button></div><Table data={billRecord.lines}/>{billRecord.status==="Draft"&&<button className="ws-button primary" onClick={async()=>{setBusy(true);setError("");try{setBillRecord(await api(`/api/supplier-bills/${billRecord.id}/finalize`,{method:"POST",body:{confirmPossibleDuplicates:false}}));refresh()}catch(x){setError(x.message)}finally{setBusy(false)}}}>Finalize bill</button>}{Number(billRecord.balance)>0&&billRecord.status!=="Draft"&&<form className="ws-payment-form" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);setBusy(true);setError("");try{await api(`/api/supplier-bills/${billRecord.id}/payments`,{method:"POST",body:{amount:Number(f.get("amount")),paidOn:f.get("paidOn")||null,method:f.get("method"),reference:f.get("reference")||null,notes:null,exchangeRateToBase:billRecord.currencyCode===billRecord.baseCurrencyCode?1:Number(f.get("exchangeRateToBase"))}});setBillRecord(await api(`/api/supplier-bills/${billRecord.id}`));setBillPayments(asList(await api(`/api/supplier-bills/${billRecord.id}/payments`)));e.currentTarget.reset()}catch(x){setError(x.message)}finally{setBusy(false)}}}><h3>Record a supplier payment</h3><div className="ws-form-grid"><label>Amount ({billRecord.currencyCode})<input name="amount" type="number" min="0.01" step="0.01" max={billRecord.balance} required/></label><label>Payment date<input name="paidOn" type="date" defaultValue={new Date().toISOString().slice(0,10)}/></label><label>Method<select name="method"><option value="BankTransfer">Bank transfer</option><option>Cash</option><option>Card</option><option>Cheque</option><option>MobileMoney</option><option>Other</option></select></label><label>Reference<input name="reference"/></label>{billRecord.currencyCode!==billRecord.baseCurrencyCode&&<label>Payment exchange rate to {billRecord.baseCurrencyCode}<input name="exchangeRateToBase" type="number" min="0.00000001" step="0.00000001" required/><small>Enter the rate on the date you paid.</small></label>}</div><button className="ws-button primary" disabled={busy}>{busy?"Saving payment…":"Record payment"}</button></form>}{billPayments.length>0&&<><h3>Payments</h3><Table data={billPayments}/></>}</section>}
      {path === "/app/invoice-preview" && <InvoicePdfPreview invoices={list} loading={loading} loadError={error} onRetry={refresh} initialInvoiceId={invoiceId} navigate={navigate}/>}
      {path === "/app/recurring-invoices" && <RecurringInvoices schedules={data} onRefresh={refresh} onError={setError}/>}
      {path === "/app/extraction-review" && <section className="ws-card"><h2>Review supplier invoice extraction</h2><p className="ws-muted">Enter the document ID from the upload result, then run or load its AI extraction.</p><form className="ws-ask" onSubmit={async e=>{e.preventDefault();setBusy(true);setError("");try{const r=await api(`/api/supplier-documents/${documentId.trim()}/extraction`);setExtraction(r)}catch(x){setError(x.message);setExtraction(null)}finally{setBusy(false)}}}><input value={documentId} onChange={e=>setDocumentId(e.target.value)} placeholder="Supplier document ID" required/><div><button className="ws-button secondary" disabled={busy}>Load extraction</button><button type="button" className="ws-button primary" disabled={busy||!documentId} onClick={async()=>{setBusy(true);setError("");try{setExtraction(await api(`/api/supplier-documents/${documentId.trim()}/extract`,{method:"POST"}))}catch(x){setError(x.message)}finally{setBusy(false)}}}>Run AI extraction</button></div></form>{extraction&&<div className="ws-detail"><h3>Extracted values · {extraction.confidence} confidence</h3><p>{extraction.data?.supplierName||"Supplier not detected"} · Invoice {extraction.data?.invoiceNumber||"number not detected"}</p><p>Invoice date: {extraction.data?.invoiceDate||"—"} · Due: {extraction.data?.dueDate||"—"}</p><p>Total: {extraction.data?.currencyCode||""} {extraction.data?.total??"—"}</p><Table data={extraction.data?.lines||[]}/>{extraction.issues?.length>0&&<ul>{extraction.issues.map((issue,i)=><li key={i}>{issue.severity}: {issue.message}</li>)}</ul>}<ExtractionApproval extraction={extraction} documentId={documentId} baseCurrencyCode={baseCurrencyCode} setBusy={setBusy} onError={setError} onSuccess={()=>setAnswer("Draft supplier bill created. You can finalize it in Supplier bills.")}/>{answer&&<p className="ws-muted">{answer}</p>}</div>}</section>}
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
      {path === "/app/security" && <section className="ws-card ws-task-card"><span className="ws-task-icon"><Shield/></span><h2>Change your password</h2><p className="ws-muted">Choose a password with at least 8 characters. You’ll stay signed in after it changes.</p><form className="ws-form" onSubmit={async e => { e.preventDefault(); const f = new FormData(e.currentTarget); setBusy(true); setError(""); try { const r = await api("/api/profile/change-password", { method: "POST", body: { currentPassword: f.get("currentPassword"), newPassword: f.get("newPassword") } }); if (r?.token) { sessionStorage.setItem("invoice-ai-token", r.token); sessionStorage.setItem("invoice-ai-refresh", r.refreshToken); } e.currentTarget.reset(); setAnswer("Your password has been changed."); } catch (x) { setError(x.message); } finally { setBusy(false); } }}><div className="ws-form-grid"><label>Current password<input name="currentPassword" type="password" autoComplete="current-password" required /></label><label>New password<input name="newPassword" type="password" autoComplete="new-password" minLength="8" required /></label></div>{error&&<p className="ws-error">{error}</p>}{answer&&<p className="ws-success-note">{answer}</p>}<div className="ws-form-actions"><button className="ws-button primary" disabled={busy}>{busy?"Updating password…":"Save new password"}</button></div></form></section>}
      {path === "/app/preferences" && <section className="ws-card"><h2>Notification preferences</h2><p className="ws-muted">Choose which reminders this workspace highlights. Preferences are saved in this browser.</p>{[["overdue","Overdue invoice reminders"],["productUpdates","Product updates"]].map(([key,label])=><label className="ws-pref" key={key}><span><b>{label}</b><small>{key==="overdue"?"Show unpaid invoices past their due date":"Show announcements and release updates"}</small></span><input type="checkbox" checked={!!notificationPrefs[key]} onChange={e=>{const next={...notificationPrefs,[key]:e.target.checked};setNotificationPrefs(next);localStorage.setItem(notificationPrefsKey,JSON.stringify(next))}}/></label>)}</section>}
      {path === "/app/notifications" && <section className="ws-card"><h2>Notifications</h2><p className="ws-muted">Overdue invoice reminders from your current workspace.</p>{notificationPrefs.overdue===false?<div className="ws-empty">Overdue reminders are turned off in Notification Preferences.</div>:asList(data).length?asList(data).map((inv,i)=><article className="ws-notice" key={inv.id||i}><span className="ws-notice-dot"/><div><b>{inv.number||"Invoice"} · {inv.customerName}</b><p>{inv.daysOverdue||0} days overdue · Balance {inv.currencyCode} {Number(inv.balance||0).toLocaleString()}</p></div><button className="ws-text-button" onClick={()=>{setInvoiceId(inv.id);setInvoiceRecord(inv);navigate("/app/invoice-detail")}}>View invoice</button></article>):<div className="ws-empty">No overdue invoices. You’re all caught up.</div>}</section>}
      {path === "/app/profile" && data && <section className="ws-card"><div className="ws-card-title"><div><h2>Profile details</h2><p className="ws-muted">Manage your personal account name.</p></div><button className="ws-button secondary" onClick={() => setShowForm(!showForm)}>Edit profile</button></div>{showForm?<RecordForm kind="profile" onCancel={()=>setShowForm(false)} onDone={()=>{setShowForm(false);refresh()}}/>:<><p><b>{data.fullName}</b></p><p>{data.email}</p></>}</section>}
      {path === "/app/help" && <section className="ws-help-grid"><article className="ws-card"><span className="ws-task-icon"><CircleHelp/></span><h2>How can we help?</h2><p className="ws-muted">For quick answers, start with the page you’re working on. Each section explains what to do next.</p><div className="ws-help-links"><button onClick={() => navigate("/app/invoices")}>Creating and tracking invoices <ArrowUpRight/></button><button onClick={() => navigate("/app/upload-supplier-invoice")}>Uploading a supplier bill <ArrowUpRight/></button><button onClick={() => navigate("/app/bank-import")}>Importing a bank statement <ArrowUpRight/></button><button onClick={() => navigate("/app/billing")}>Plans and billing <ArrowUpRight/></button></div></article><article className="ws-card ws-contact-card"><h2>Need a hand?</h2><p className="ws-muted">Contact the Invoice AI team and include a short description of what you were trying to do.</p><a className="ws-button primary" href="mailto:hello@invoiceai.com?subject=Invoice%20AI%20support">Email support <ArrowUpRight/></a><small>We usually reply within one business day.</small></article></section>}
      {path === "/app/team" && data && <section className="ws-card"><div className="ws-card-title"><div><h2>People with access to your workspace</h2><p className="ws-muted">You can use Invoice AI on your own. Add teammates only if you need them.</p></div></div><TeamMembers members={data} onRefresh={refresh}/></section>}
      {path === "/app/invitations" && data && !showForm && <section className="ws-card"><div className="ws-card-title"><div><h2>Pending invitations</h2><p className="ws-muted">Invite teammates and revoke invitations that are no longer needed.</p></div></div><InvitationsList invitations={data} onRefresh={refresh}/></section>}
      {path === "/app/billing" && data && <section className="ws-card"><div className="ws-card-title"><div><h2>Choose a plan</h2><p className="ws-muted">Compare monthly prices and limits. You can start with a plan for one person and add teammates later.</p></div></div><div className="ws-plan-grid">{asList(data).map(plan => <article key={plan.code}><b>{plan.name}</b><h3>{plan.isFree ? "Free" : `${plan.currencyCode} ${(plan.amountMinor / 100).toLocaleString()}`}<small> / month</small></h3><p>{plan.description}</p><span>{plan.invoiceLimit} invoices / month</span><span>{plan.memberLimit} team members</span><span>{plan.aiExtractionLimit} AI invoice readings / month</span><button disabled={!plan.canCheckout||busy} className="ws-button primary" onClick={async () => { setBusy(true); setError(""); try { const r = await api("/api/billing/checkout", { method: "POST", body: { planCode: plan.code } }); if (!r.authorizationUrl) throw new Error("The payment provider did not return a checkout link."); location.assign(r.authorizationUrl); } catch (x) { setError(x.message); setBusy(false); } }}>{busy ? "Opening secure checkout…" : plan.canCheckout ? "Choose plan" : plan.isFree ? "Current plan" : "Not available yet"}</button></article>)}</div></section>}
      {path === "/app/billing-history" && data && <BillingHistoryPanel data={data} onRefresh={refresh} onError={setError}/>}
      {path === "/app/payment-account" && data && <PaymentAccountPanel data={data} setData={setData} onError={setError} busy={busy} setBusy={setBusy}/>}
      {path === "/app" && data && <DashboardOverview data={data} navigate={navigate} refresh={refresh}/>}
      {path === "/app/onboarding" && data && <section className="ws-card ws-onboarding"><div className="ws-onboarding-intro"><span className="ws-task-icon"><Building2/></span><p className="ws-eyebrow">{accountType === "Freelancer" ? "FREELANCER SETUP" : "ORGANIZATION SETUP"}</p><h2>Set up your workspace</h2><p className="ws-muted">Your account is ready. Add the contact details you want printed on your invoices, then choose the reminders you’d like to see.</p></div><RecordForm kind="organization" initial={data} onCancel={()=>{}} onDone={async()=>{try{await api("/api/organization/onboarding-complete",{method:"POST"});navigate("/app");}catch(e){setError(e.message);}}}/><div className="ws-onboarding-preferences"><h3>Workspace preferences</h3><p className="ws-muted">You can change these any time in Notification settings.</p>{[["overdue","Show overdue invoice reminders"],["productUpdates","Show product updates"]].map(([key,label])=><label className="ws-pref" key={key}><span><b>{label}</b><small>{key==="overdue"?"Keep unpaid invoices past their due date visible in Notifications.":"See announcements and new Invoice AI features."}</small></span><input type="checkbox" checked={!!notificationPrefs[key]} onChange={e=>{const next={...notificationPrefs,[key]:e.target.checked};setNotificationPrefs(next);localStorage.setItem(notificationPrefsKey,JSON.stringify(next));}}/></label>)}</div></section>}
      {path === "/app" && !loading && !data && <section className="ws-card ws-dashboard-unavailable"><span className="ws-task-icon"><ChartNoAxesCombined/></span><h2>Your financial summary isn’t available right now</h2><p className="ws-muted">Try loading it again. Your invoices and other workspace pages are still available from the menu.</p><button className="ws-button primary" onClick={refresh}><RefreshCw/> Try again</button></section>}
      {path === "/app/reports" && data?.period && <section className="ws-card"><h2>Financial summary · {data.currencyCode}</h2><div className="ws-billing-summary"><span>Invoices <b>{data.period.invoiceCount}</b></span><span>Income <b>{Number(data.period.income||0).toLocaleString()}</b></span><span>Expenses <b>{Number(data.period.expenses||0).toLocaleString()}</b></span><span>Net cash flow <b>{Number(data.period.netCashFlow||0).toLocaleString()}</b></span></div><div className="ws-table-wrap"><Table data={data.monthly}/></div>{data.caveats?.map((c,i)=><p className="ws-muted" key={i}>{c}</p>)}{reportExtras&&<div className="ws-report-extras"><article><h3>Receivables aging</h3><Table data={reportExtras.receivables?.buckets||reportExtras.receivables?.customers}/></article><article><h3>Payables aging</h3><Table data={reportExtras.payables?.buckets||reportExtras.payables?.suppliers}/></article><article><h3>Expenses</h3><Table data={reportExtras.expenses?.monthly||reportExtras.expenses?.items}/></article></div>}</section>}
      {path === "/app/insights" && data?.current && <section className="ws-card"><h2>{data.year} financial comparison · {data.currencyCode}</h2><div className="ws-billing-summary">{[["Income",data.income], ["Expenses",data.expenses], ["Estimated profit",data.estimatedProfit], ["Net cash flow",data.netCashFlow]].map(([label,m])=><span key={label}>{label}<b>{Number(m?.current||0).toLocaleString()} ({m?.changePercent==null?"—":`${m.changePercent>0?"+":""}${m.changePercent}%`})</b></span>)}</div>{data.caveats?.map((c,i)=><p className="ws-muted" key={i}>{c}</p>)}</section>}
      {loading ? <div className="ws-card ws-loading" role="status">Loading {info[0].toLowerCase()}…</div> : info[1] && !["/app","/app/billing","/app/billing-history","/app/payment-account","/app/profile","/app/team","/app/invitations","/app/assistant","/app/reports","/app/insights","/app/notifications","/app/invoice-preview"].includes(path) && !showForm ? <section className="ws-card"><div className="ws-card-title"><div><h2>{path==="/app/invoice-detail"?"Select from your invoices":path==="/app/invoice-preview"?"Your invoices":path==="/app/payments"?"Payment history":info[0]}</h2><p className="ws-muted">{path==="/app/payments"?"A clear record of payments customers sent and payments you made to suppliers.":pageDescriptions[path] || "Your saved records appear here."}</p></div><label className="ws-search"><Search/><input aria-label={`Search ${info[0].toLowerCase()}`} value={query} onChange={e => setQuery(e.target.value)} placeholder={`Search ${path==="/app/invoices"?"invoices":path==="/app/customers"?"customers":path==="/app/suppliers"?"suppliers":path==="/app/payments"?"payments":"records"}`}/></label></div><Table data={filtered} variant={path==="/app/customers"?"customers":path==="/app/payments"?"payments":undefined} emptyMessage={query?"No matching records found.":`No ${path==="/app/invoices"?"invoices":path==="/app/customers"?"customers":path==="/app/suppliers"?"suppliers":path==="/app/supplier-invoices"?"supplier bills":path==="/app/payments"?"payments":"records"} yet.`} onEdit={["/app/customers","/app/suppliers"].includes(path)?row=>{setEditingRecord(row);setShowForm(true)}:null} onView={path==="/app/customers"?async row=>{try{setCustomerSummary(await api(`/api/customers/${row.id}/summary`))}catch(e){setError(e.message)}}:path==="/app/invoices"?row=>{setInvoiceId(row.id);setInvoiceRecord(row);navigate("/app/invoice-detail")}:path==="/app/supplier-invoices"?row=>{setBillId(row.id);setBillRecord(row)}:path==="/app/invoice-detail"?row=>{setInvoiceId(row.id);setInvoiceRecord(row)}:path==="/app/invoice-preview"?row=>{setInvoiceId(row.id)}:path==="/app/extraction-review"?row=>{setDocumentId(row.id)}:null} onArchive={["/app/customers","/app/suppliers"].includes(path)?async row=>{try{await api(`/api/${path==="/app/customers"?"customers":"suppliers"}/${row.id}/${row.isArchived?"restore":"archive"}`,{method:"POST"});refresh()}catch(e){setError(e.message)}}:null} onViewLabel={path==="/app/customers"?"View balances":path==="/app/supplier-invoices"?"Open bill":path==="/app/invoice-detail"?"Open invoice":path==="/app/invoice-preview"?"Choose invoice":path==="/app/extraction-review"?"Use document":"View details"}/></section> : null}
      {path === "/app/customers" && customerSummary && <section className="ws-card"><div className="ws-card-title"><div><h2>{customerSummary.customerName} · account summary</h2><p className="ws-muted">Invoice and payment totals for this customer.</p></div><button className="ws-button secondary" onClick={async()=>{try{const file=await apiBlob(`/api/customers/${customerSummary.customerId}/statement/pdf`);const url=URL.createObjectURL(file);const a=document.createElement("a");a.href=url;a.download=`${customerSummary.customerName}-statement.pdf`;a.click();URL.revokeObjectURL(url)}catch(e){setError(e.message)}}}>Download statement</button></div><div className="ws-billing-summary"><span>Total invoiced <b>{formatMoney(customerSummary.totalInvoiced,customerSummary.currencyCode)}</b></span><span>Paid <b>{formatMoney(customerSummary.totalPaid,customerSummary.currencyCode)}</b></span><span>Outstanding <b>{formatMoney(customerSummary.outstanding,customerSummary.currencyCode)}</b></span><span>Overdue <b>{formatMoney(customerSummary.overdue,customerSummary.currencyCode)}</b></span></div><p className="ws-muted">{customerSummary.openInvoices} open invoices · {customerSummary.overdueInvoices} overdue</p></section>}
      {!info[1] && !["/app/upload-supplier-invoice", "/app/bank-import", "/app/bank-reconciliation", "/app/invoice-detail", "/app/invoice-preview", "/app/security", "/app/preferences", "/app/notifications", "/app/help"].includes(path) && <section className="ws-card ws-empty-card"><h2>{info[0]}</h2><p>This part of Invoice AI is not ready yet. You can continue using the other workspace tools from the menu.</p></section>}
      <footer className="ws-footer">Invoice AI · Smart. Simple. Powerful.</footer></section></main></div>;
}




