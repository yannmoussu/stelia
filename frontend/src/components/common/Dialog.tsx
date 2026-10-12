import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';

const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]';
function focusableElements(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(focusableSelector)].filter((element) => element.tabIndex >= 0 && !element.closest('[hidden], [aria-hidden="true"]'));
}
interface DialogProps {
  children: ReactNode;
  labelledBy: string;
  onEscape?: () => void;
}

/** Keep keyboard navigation inside the dialog and restore the invoking control. */
export function Dialog({ children, labelledBy, onEscape }: DialogProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const container = containerRef.current;
    const initialFocus = container?.querySelector<HTMLElement>('[data-dialog-initial-focus]') || (container ? focusableElements(container)[0] : null);
    (initialFocus || container)?.focus();
    return () => { if (previousFocus?.isConnected) previousFocus.focus(); };
  }, []);

  const keyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && onEscape) { event.preventDefault(); event.stopPropagation(); onEscape(); return; }
    if (event.key !== 'Tab') return;
    const elements = focusableElements(event.currentTarget);
    const first = elements[0]; const last = elements.at(-1);
    if (!first || !last) { event.preventDefault(); event.currentTarget.focus(); return; }
    const active = document.activeElement;
    if (!event.currentTarget.contains(active) || active === event.currentTarget) {
      event.preventDefault(); (event.shiftKey ? last : first).focus();
    } else if (event.shiftKey && active === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault(); first.focus();
    }
  };

  return <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6"><div ref={containerRef} role="dialog" aria-modal="true" aria-labelledby={labelledBy} tabIndex={-1} onKeyDown={keyDown} className="bg-white rounded-xl p-6 max-w-lg w-full outline-none">{children}</div></div>;
}
