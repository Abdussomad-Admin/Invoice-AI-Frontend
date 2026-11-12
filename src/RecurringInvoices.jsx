import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { CalendarDays, CheckCircle2, Clock3, FileText, Pause, Play, Plus, Repeat, Search, Sparkles } from "lucide-react";

const asList = value => Array.isArray(value) ? value : value?.items || [];
const currencies = ["NGN", "GHS", "KES", "ZAR", "GBP", "USD"];

function dateLabel(value) {
  if (!value) return "Not scheduled";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

function ScheduleForm({ customers, baseCurrency, currency, setCurrency, busy, onCancel, onSubmit }) {
  const options = [...new Set([baseCurrency, ...currencies])];
  return <form className="ws-form ws-recurring-form" onSubmit={onSubmit}>
    <div className="ws-recurring-form-intro"><span className="ws-recurring-form-icon"><CalendarDays/></span><div><b>Schedule a regular invoice</b><small>Invoice AI creates a draft on each date. You review and send it yourself.</small></div></div>
    <div className="ws-form-grid">
      <label>Customer<select name="customerId" required defaultValue=""><option value="" disabled>Choose a customer</option>{customers.filter(customer => !customer.isArchived).map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
      <label>What is this schedule for?<input name="description" required maxLength="200" placeholder="Monthly design retainer"/></label>
      <label>How often?<select name="frequency" defaultValue="Monthly"><option>Weekly</option><option>Monthly</option><option>Quarterly</option><option>Yearly</option></select></label>
      <label>First draft date<input name="firstRunOn" type="date" min={new Date().toISOString().slice(0,10)} required/></label>
      <label>Invoice currency<select name="currencyCode" value={currency} onChange={event => setCurrency(event.target.value)} required>{options.map(code => <option key={code} value={code}>{code}</option>)}</select></label>
      {currency !== baseCurrency && <label>Exchange rate to {baseCurrency}<input name="exchangeRateToBase" type="number" min="0.00000001" step="0.00000001" required/><small>How much 1 {currency} is worth in {baseCurrency}.</small></label>}
      <label>Payment due after (days)<input name="paymentTermsDays" type="number" min="0" max="365" defaultValue="30" required/></label>
      <label>Invoice item<input name="lineDescription" required placeholder="Monthly service"/></label>
      <label>Quantity<input name="quantity" type="number" min="0.0001" step="0.01" defaultValue="1" required/></label>
      <label>Price per item<input name="unitPrice" type="number" min="0.01" step="0.01" required/></label>
    </div>
    <div className="ws-recurring-safety"><CheckCircle2/><span>Each scheduled invoice is saved as a draft. It is <b>never sent or charged automatically.</b></span></div>
    <div className="ws-form-actions"><button className="ws-button secondary" type="button" onClick={onCancel}>Cancel</button><button className="ws-button primary" disabled={busy}>{busy ? "Saving schedule…" : "Save schedule"}</button></div>
  </form>;
}

export default function RecurringInvoices({ schedules, onRefresh, onError }) {
  const [customers, setCustomers] = useState([]);
  const [baseCurrency, setBaseCurrency] = useState("NGN");
  const [currency, setCurrency] = useState("NGN");
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const items = asList(schedules);
  const filtered = useMemo(() => items.filter(item => `${item.description || ""} ${item.customerName || ""} ${item.frequency || ""}`.toLowerCase().includes(query.toLowerCase())), [items, query]);
  const activeCount = items.filter(item => item.isActive).length;

  useEffect(() => {
    Promise.all([api("/api/customers"), api("/api/organization")])
      .then(([customerResponse, organization]) => {
        setCustomers(asList(customerResponse));
        const code = organization.baseCurrencyCode || "NGN";
        setBaseCurrency(code);
        setCurrency(code);
      })
      .catch(error => onError(error.message));
  }, [onError]);

  async function create(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await api("/api/recurring-invoices", { method: "POST", body: {
        customerId: form.get("customerId"), description: form.get("description"), currencyCode: form.get("currencyCode"),
        exchangeRateToBase: currency === baseCurrency ? 1 : Number(form.get("exchangeRateToBase")),
        paymentTermsDays: Number(form.get("paymentTermsDays")), frequency: form.get("frequency"), firstRunOn: form.get("firstRunOn"),
        lines: [{ description: form.get("lineDescription"), quantity: Number(form.get("quantity")), unitPrice: Number(form.get("unitPrice")) }]
      }});
      event.currentTarget.reset();
      setCreating(false);
      await onRefresh();
    } catch (error) { onError(error.message); }
    finally { setBusy(false); }
  }

  async function toggle(schedule) {
    setBusy(true);
    try {
      await api(`/api/recurring-invoices/${schedule.id}/${schedule.isActive ? "pause" : "resume"}`, { method: "POST" });
      await onRefresh();
    } catch (error) { onError(error.message); }
    finally { setBusy(false); }
  }

  return <div className="ws-recurring-page">
    <section className="ws-recurring-hero">
      <div className="ws-recurring-hero-copy"><span className="ws-recurring-kicker"><Sparkles/> YOUR WORKSPACE</span><h2>Recurring <em>invoices</em></h2><p>Set up regular invoices. Invoice AI prepares a draft on each scheduled date for you to review and send.</p><div className="ws-recurring-hero-note"><CalendarDays/><span>Stay on top of regular work without rebuilding the same invoice.</span></div></div>
      <div className="ws-recurring-art" aria-hidden="true"><span className="recurring-art-glow"/><span className="recurring-calendar"><b>INVOICE SCHEDULE</b><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></span><span className="recurring-document"><FileText/><b>Draft</b></span><span className="recurring-check"><CheckCircle2/></span></div>
    </section>

    <section className="ws-card ws-recurring-card">
      <div className="ws-recurring-card-head"><div className="ws-recurring-heading-icon"><Repeat/></div><div className="ws-recurring-heading-copy"><h3>Your schedules</h3><p>Create recurring invoices and check what is active or paused.</p></div><div className="ws-recurring-head-actions">{items.length > 0 && <span className="ws-recurring-count"><b>{activeCount}</b> active <i/> {items.length - activeCount} paused</span>}<button className="ws-button primary" onClick={() => setCreating(value => !value)}><Plus/>{creating ? "Close form" : "Create schedule"}</button></div></div>
      {creating && <ScheduleForm customers={customers} baseCurrency={baseCurrency} currency={currency} setCurrency={setCurrency} busy={busy} onCancel={() => setCreating(false)} onSubmit={create}/>}
      {items.length > 0 && <label className="ws-recurring-search"><Search/><input aria-label="Search recurring schedules" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search schedules by name or customer"/></label>}
      {filtered.length > 0 ? <div className="ws-recurring-list">{filtered.map(schedule => <article className="ws-recurring-row" key={schedule.id}><span className="ws-recurring-row-icon"><CalendarDays/></span><div className="ws-recurring-row-main"><b>{schedule.description || "Recurring invoice"}</b><small>{schedule.customerName || "Customer"} · {schedule.frequency}</small></div><div className="ws-recurring-next"><small>Next draft</small><b>{dateLabel(schedule.nextRunOn)}</b></div><span className={`ws-recurring-status ${schedule.isActive ? "active" : "paused"}`}><i/>{schedule.isActive ? "Active" : "Paused"}</span><button className="ws-recurring-toggle" disabled={busy} onClick={() => toggle(schedule)}>{schedule.isActive ? <><Pause/> Pause</> : <><Play/> Resume</>}</button></article>)}</div> : items.length > 0 ? <div className="ws-recurring-empty compact"><Search/><b>No schedules match that search</b><span>Try a different customer or schedule name.</span></div> : <div className="ws-recurring-empty"><span className="ws-recurring-empty-icon"><CalendarDays/><i><Plus/></i></span><b>No recurring schedules yet</b><span>Set one up and Invoice AI will create regular invoice drafts for you to review.</span>{!creating && <button className="ws-button primary" onClick={() => setCreating(true)}><Plus/> Create your first schedule</button>}</div>}
      <p className="ws-recurring-footnote"><Clock3/> Drafts are created for you to check. Invoice AI does not send invoices or collect payments automatically.</p>
    </section>
  </div>;
}
