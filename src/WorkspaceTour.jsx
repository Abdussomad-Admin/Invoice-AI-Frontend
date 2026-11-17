import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CircleHelp, X } from "lucide-react";
import "./workspace-tour.css";

const TOUR_KEY = "invoice-ai-workspace-tour-v1";

const STEPS = [
  {
    selector: ".ws-dashboard-hero",
    title: "Welcome to your workspace",
    body: "This dashboard is your starting point. You can create an invoice or add a customer from here, and come back any time to see your business activity."
  },
  {
    selector: ".ws-dashboard-payment-setup",
    title: "Connect where online payments should go",
    body: "If you want customers to pay invoices online, set up the bank account where Paystack should send the money. You can do this now or continue the tour and return later.",
    actionLabel: "Open payment setup"
  },
  {
    selector: ".ws-metrics",
    title: "Know what each number means",
    body: "Income and expenses come from invoices and supplier bills you record. Cash received means customer payments recorded in Invoice AI; it can include bank or online payments, not just physical cash."
  },
  {
    selector: ".ws-dashboard-chart",
    title: "Follow money in and out",
    body: "This chart compares customer payments received with supplier payments made month by month. It only shows payments recorded in this workspace."
  },
  {
    selector: ".ws-action-grid",
    title: "Start with a simple task",
    body: "Use these shortcuts to create an invoice, save a customer, upload a supplier bill, or open your reports. You can use Invoice AI on your own as a freelancer."
  },
  {
    selector: ".ws-topbar .ws-ai-top-link",
    title: "Ask Invoice AI when you need help",
    body: "Ask questions in everyday language. Answers are based on the financial records saved in your workspace, and Invoice AI will tell you when it does not have enough information."
  }
];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function useTourTarget(stepIndex, active) {
  const [geometry, setGeometry] = useState(null);

  useEffect(() => {
    if (!active) return undefined;
    let frame = 0;
    let secondFrame = 0;
    const target = document.querySelector(STEPS[stepIndex]?.selector);
    if (!target) {
      setGeometry(null);
      return undefined;
    }
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
    const update = () => {
      cancelAnimationFrame(secondFrame);
      secondFrame = requestAnimationFrame(() => {
        const rect = target.getBoundingClientRect();
        const pad = 8;
        const x = clamp(rect.left - pad, 8, Math.max(8, window.innerWidth - 24));
        const y = clamp(rect.top - pad, 8, Math.max(8, window.innerHeight - 24));
        const width = Math.max(24, Math.min(rect.width + pad * 2, window.innerWidth - x - 8));
        const height = Math.max(24, Math.min(rect.height + pad * 2, window.innerHeight - y - 8));
        setGeometry({ x, y, width, height, radius: Math.min(18, Math.max(9, height / 5)) });
      });
    };
    frame = requestAnimationFrame(update);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(secondFrame);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [stepIndex, active]);

  return geometry;
}

export default function WorkspaceTour({ open, onClose, onPaymentSetup }) {
  const [stepIndex, setStepIndex] = useState(0);
  const dialogRef = useRef(null);
  const nextRef = useRef(null);
  const geometry = useTourTarget(stepIndex, open);
  const step = STEPS[stepIndex];

  useEffect(() => {
    if (!open) return undefined;
    setStepIndex(0);
    const previousFocus = document.activeElement;
    requestAnimationFrame(() => (nextRef.current || dialogRef.current)?.focus());
    const onKeyDown = event => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose("completed");
      } else if (event.key === "Tab" && dialogRef.current) {
        const focusable = [...dialogRef.current.querySelectorAll("button:not(:disabled)")];
        if (!focusable.length) return;
        if (event.shiftKey && document.activeElement === focusable[0]) {
          event.preventDefault();
          focusable.at(-1).focus();
        } else if (!event.shiftKey && document.activeElement === focusable.at(-1)) {
          event.preventDefault();
          focusable[0].focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) requestAnimationFrame(() => nextRef.current?.focus());
  }, [open, stepIndex]);

  if (!open) return null;

  const cardWidth = Math.min(370, window.innerWidth - 32);
  const cardHeight = 340;
  const cardLeft = geometry
    ? clamp(geometry.x + geometry.width / 2 - cardWidth / 2, 16, window.innerWidth - cardWidth - 16)
    : Math.max(16, (window.innerWidth - cardWidth) / 2);
  const below = !geometry || geometry.y + geometry.height + cardHeight + 22 < window.innerHeight;
  const cardTop = geometry
    ? below
      ? clamp(geometry.y + geometry.height + 18, 16, window.innerHeight - cardHeight - 16)
      : clamp(geometry.y - cardHeight - 18, 16, window.innerHeight - cardHeight - 16)
    : clamp((window.innerHeight - cardHeight) / 2, 16, window.innerHeight - cardHeight - 16);
  const close = value => onClose(value);

  return <div className="ws-tour-layer">
    <svg className="ws-tour-dimmer" aria-hidden="true" viewBox={`0 0 ${window.innerWidth} ${window.innerHeight}`} preserveAspectRatio="none">
      <defs><mask id="ws-tour-mask"><rect width="100%" height="100%" fill="white"/>{geometry && <rect x={geometry.x} y={geometry.y} width={geometry.width} height={geometry.height} rx={geometry.radius} fill="black"/>}</mask></defs>
      <rect width="100%" height="100%" fill="rgba(15, 10, 38, .70)" mask="url(#ws-tour-mask)"/>
      {geometry && <rect className="ws-tour-outline" x={geometry.x} y={geometry.y} width={geometry.width} height={geometry.height} rx={geometry.radius} fill="none"/>}
    </svg>
    {geometry && <span className="ws-tour-beacon" style={{ left: geometry.x + geometry.width - 2, top: geometry.y - 5 }} aria-hidden="true"><i/></span>}
    <section className="ws-tour-card" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="ws-tour-title" aria-describedby="ws-tour-description" style={{ left: cardLeft, top: cardTop }}>
      <div className="ws-tour-card-top"><span className="ws-tour-mark"><CircleHelp/></span><span className="ws-tour-count">STEP {stepIndex + 1} OF {STEPS.length}</span><button className="ws-tour-close" type="button" onClick={() => close("completed")} aria-label="Close guide"><X/></button></div>
      <div className="ws-tour-progress" aria-hidden="true">{STEPS.map((_, index) => <i key={index} className={index <= stepIndex ? "is-active" : ""}/>)}</div>
      <h2 id="ws-tour-title">{step.title}</h2><p id="ws-tour-description" aria-live="polite">{step.body}</p>
      {step.actionLabel && <button type="button" className="ws-tour-action" onClick={onPaymentSetup}>{step.actionLabel}<ArrowRight/></button>}
      <div className="ws-tour-footer"><button type="button" className="ws-tour-skip" onClick={() => close("completed")}>{stepIndex === 0 ? "Skip tour" : "Exit tour"}</button><div>{stepIndex > 0 && <button type="button" className="ws-tour-back" onClick={() => setStepIndex(index => index - 1)}><ArrowLeft/> Back</button>}{stepIndex === STEPS.length - 1 ? <button ref={nextRef} type="button" className="ws-tour-next" onClick={() => close("completed")}>Finish <Check/></button> : <button ref={nextRef} type="button" className="ws-tour-next" onClick={() => setStepIndex(index => index + 1)}>Next <ArrowRight/></button>}</div></div>
      <button type="button" className="ws-tour-never" onClick={() => close("disabled")}>Don’t show this automatically again</button>
    </section>
  </div>;
}

export { TOUR_KEY };
