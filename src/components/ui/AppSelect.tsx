import { Check, ChevronDown } from "lucide-react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";

export type AppSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type AppSelectProps = {
  value: string;
  options: AppSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  ariaLabel: string;
};

type SelectPosition = {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
  placement: "top" | "bottom";
};

export function nextEnabledOption(
  options: AppSelectOption[],
  current: number,
  direction: 1 | -1,
) {
  if (!options.length) return -1;
  for (let step = 1; step <= options.length; step += 1) {
    const index = (current + direction * step + options.length) % options.length;
    if (!options[index]?.disabled) return index;
  }
  return -1;
}

export function selectMenuPosition(
  rect: Pick<DOMRect, "left" | "top" | "bottom" | "width">,
  viewportWidth: number,
  viewportHeight: number,
  optionCount: number,
  viewportLeft = 0,
  viewportTop = 0,
): SelectPosition {
  const gutter = 8;
  const gap = 6;
  const width = Math.min(Math.max(rect.width + 6, 180), viewportWidth - gutter * 2);
  const desiredHeight = Math.min(Math.max(optionCount * 44 + 12, 56), 280);
  const spaceBelow = viewportTop + viewportHeight - rect.bottom - gutter;
  const spaceAbove = rect.top - viewportTop - gutter;
  const placement = spaceBelow < desiredHeight && spaceAbove > spaceBelow ? "top" : "bottom";
  const available = Math.max(44, placement === "top" ? spaceAbove - gap : spaceBelow - gap);
  const maxHeight = Math.min(desiredHeight, available, Math.max(0, viewportHeight - gutter * 2));
  const left = Math.min(Math.max(viewportLeft + gutter, rect.left), viewportLeft + viewportWidth - width - gutter);
  const top = placement === "top"
    ? Math.max(viewportTop + gutter, rect.top - maxHeight - gap)
    : Math.max(viewportTop + gutter, Math.min(viewportTop + viewportHeight - maxHeight - gutter, rect.bottom + gap));
  return { left, top, width, maxHeight, placement };
}

export function AppSelect({
  value,
  options,
  onChange,
  placeholder = "Sélectionner",
  disabled = false,
  className = "",
  ariaLabel,
}: AppSelectProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [position, setPosition] = useState<SelectPosition | null>(null);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const prepareOpen = (preferredIndex = selectedIndex) => {
    const fallback = nextEnabledOption(options, -1, 1);
    setActiveIndex(
      preferredIndex >= 0 && !options[preferredIndex]?.disabled
        ? preferredIndex
        : fallback,
    );
    setOpen(true);
  };

  const close = (restoreFocus = false) => {
    setOpen(false);
    setPosition(null);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const choose = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    if (option.value !== value) onChange(option.value);
    close(true);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        event.stopPropagation();
        close();
      }
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!open) prepareOpen();
      else if (activeIndex >= 0) choose(activeIndex);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      if (!open) {
        const origin = selectedIndex >= 0 ? selectedIndex - direction : -1;
        prepareOpen(nextEnabledOption(options, origin, direction));
      } else {
        setActiveIndex((current) => nextEnabledOption(options, current, direction));
      }
      return;
    }
    if (open && (event.key === "Home" || event.key === "End")) {
      event.preventDefault();
      const origin = event.key === "Home" ? -1 : 0;
      const direction = event.key === "Home" ? 1 : -1;
      setActiveIndex(nextEnabledOption(options, origin, direction));
    }
    if (open && event.key === "Tab") close();
  };

  useEffect(() => {
    if (disabled && open) close();
  }, [disabled, open]);

  useLayoutEffect(() => {
    if (!open) return;
    const viewport = window.visualViewport;
    let frame = 0;
    const updatePosition = () => {
      frame = 0;
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPosition(
        selectMenuPosition(rect, viewport?.width ?? window.innerWidth, viewport?.height ?? window.innerHeight, options.length, viewport?.offsetLeft, viewport?.offsetTop),
      );
    };
    const schedulePosition = (event?: Event) => {
      if (event?.target instanceof Node && menuRef.current?.contains(event.target)) return;
      if (!frame) frame = requestAnimationFrame(updatePosition);
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) close();
    };
    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close(true);
      }
    };
    updatePosition();
    const animationFrame = requestAnimationFrame(updatePosition);
    const settleTimer = window.setTimeout(updatePosition, 220);
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onEscape);
    window.addEventListener("resize", schedulePosition);
    window.addEventListener("scroll", schedulePosition, true);
    viewport?.addEventListener("resize", schedulePosition);
    viewport?.addEventListener("scroll", schedulePosition);
    return () => {
      cancelAnimationFrame(animationFrame);
      cancelAnimationFrame(frame);
      window.clearTimeout(settleTimer);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onEscape);
      window.removeEventListener("resize", schedulePosition);
      window.removeEventListener("scroll", schedulePosition, true);
      viewport?.removeEventListener("resize", schedulePosition);
      viewport?.removeEventListener("scroll", schedulePosition);
    };
  }, [open, options.length]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    document.getElementById(`${listboxId}-option-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, listboxId, open]);

  const menuStyle: CSSProperties | undefined = position
    ? {
        left: position.left,
        top: position.top,
        width: position.width,
        maxHeight: position.maxHeight,
      }
    : undefined;

  return (
    <div className={`app-select ${open ? "open" : ""} ${className}`.trim()}>
      <button
        ref={triggerRef}
        type="button"
        className="app-select-trigger"
        disabled={disabled}
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={open && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
        onClick={() => (open ? close() : prepareOpen())}
        onKeyDown={onKeyDown}
      >
        <span className={selected ? "" : "placeholder"}>{selected?.label ?? placeholder}</span>
        <ChevronDown className="app-select-chevron" size={16} aria-hidden="true" />
      </button>
      {open && position
        ? createPortal(
            <div
              ref={menuRef}
              id={listboxId}
              className={`app-select-menu ${position.placement}`}
              role="listbox"
              aria-label={ariaLabel}
              style={menuStyle}
            >
              {options.map((option, index) => (
                <button
                  type="button"
                  role="option"
                  id={`${listboxId}-option-${index}`}
                  className={`app-select-option ${index === activeIndex ? "active" : ""}`}
                  aria-selected={option.value === value}
                  disabled={option.disabled}
                  key={option.value}
                  onMouseEnter={() => !option.disabled && setActiveIndex(index)}
                  onClick={() => choose(index)}
                >
                  <span>{option.label}</span>
                  {option.value === value ? <Check size={15} aria-hidden="true" /> : null}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
