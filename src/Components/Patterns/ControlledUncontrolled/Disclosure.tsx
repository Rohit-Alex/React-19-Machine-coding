import { useId, type ReactNode } from "react";
import { useControllableState } from "./useControllableState";

interface DisclosureProps {
  title: string;
  children: ReactNode;
  open?: boolean; // Controlled.
  defaultOpen?: boolean; // Uncontrolled.
  onOpenChange?: (open: boolean) => void;
}

export const Disclosure = ({ title, children, open, defaultOpen = false, onOpenChange }: DisclosureProps) => {
  const [isOpen, setIsOpen] = useControllableState(open, defaultOpen, onOpenChange);
  const id = useId();
  return (
    <div style={{ borderBottom: "1px solid var(--border)", padding: "4px 0" }}>
      <button aria-expanded={isOpen} aria-controls={id} onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? "▾" : "▸"} {title}
      </button>
      <div id={id} hidden={!isOpen} style={{ padding: "4px 18px", fontSize: 14 }}>
        {children}
      </div>
    </div>
  );
};
