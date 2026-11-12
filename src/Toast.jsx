import { CircleCheck, CircleX, Info, X } from "lucide-react";

export default function Toast({ type = "info", title, children, onClose }) {
  const Icon = type === "success" ? CircleCheck : type === "error" ? CircleX : Info;
  return <div className={`ia-toast ia-toast-${type}`} role={type === "error" ? "alert" : "status"} aria-live={type === "error" ? "assertive" : "polite"}>
    <span className="ia-toast-icon"><Icon size={19}/></span>
    <span className="ia-toast-copy">{title && <b>{title}</b>}<span>{children}</span></span>
    {onClose && <button className="ia-toast-close" type="button" aria-label="Dismiss notification" onClick={onClose}><X size={16}/></button>}
  </div>;
}
