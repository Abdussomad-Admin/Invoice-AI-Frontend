import { useEffect, useRef, useState } from "react";
import { CircleCheck, CircleX, Info, X } from "lucide-react";

const durationFor = (type) => type === "error" ? 8000 : type === "success" ? 5000 : 6500;

export default function Toast({ type = "info", title, children, onClose, duration }) {
  const Icon = type === "success" ? CircleCheck : type === "error" ? CircleX : Info;
  const lifetime = duration ?? durationFor(type);
  const [paused, setPaused] = useState(false);
  const closeRef = useRef(onClose);
  const remaining = useRef(lifetime);
  const startedAt = useRef(0);
  closeRef.current = onClose;

  useEffect(() => {
    remaining.current = lifetime;
    setPaused(false);
  }, [lifetime, title, children]);

  useEffect(() => {
    if (!closeRef.current || paused) return undefined;
    startedAt.current = performance.now();
    const timer = window.setTimeout(() => closeRef.current?.(), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (performance.now() - startedAt.current));
    };
  }, [paused, lifetime]);

  return <div
    className={`ia-toast ia-toast-${type}${paused ? " is-paused" : ""}`}
    style={{ "--toast-duration": `${lifetime}ms` }}
    role={type === "error" ? "alert" : "status"}
    aria-live={type === "error" ? "assertive" : "polite"}
    onPointerEnter={() => setPaused(true)}
    onPointerLeave={() => setPaused(false)}
    onFocusCapture={() => setPaused(true)}
    onBlurCapture={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
    }}
  >
    <span className="ia-toast-icon"><Icon size={19} aria-hidden="true" /></span>
    <span className="ia-toast-copy">{title && <b>{title}</b>}<span>{children}</span></span>
    {onClose && <button className="ia-toast-close" type="button" aria-label="Dismiss notification" onClick={onClose}><X size={16} /></button>}
    {onClose && <span className="ia-toast-progress" aria-hidden="true"><i /></span>}
  </div>;
}
