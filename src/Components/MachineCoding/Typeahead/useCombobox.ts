import {
  useCallback,
  useEffect,
  useId,
  useState,
  type KeyboardEvent,
} from "react";

interface UseComboboxOptions<T> {
  items: T[];
  onSelect: (item: T) => void;
  /** Second Escape press, when the list is already closed. */
  onClear: () => void;
  /** Multi-select keeps the list open so several options can be picked. */
  closeOnSelect?: boolean;
}

export function useCombobox<T>({
  items,
  onSelect,
  onClear,
  closeOnSelect = true,
}: UseComboboxOptions<T>) {
  const listboxId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const optionId = useCallback(
    (index: number) => `${listboxId}-option-${index}`,
    [listboxId],
  );

  // A new result set makes the old highlight meaningless — index 3 of the
  // previous list is not index 3 of this one.
  useEffect(() => {
    setActiveIndex(-1);
  }, [items]);

  // block: "nearest" scrolls the listbox without yanking the whole page.
  useEffect(() => {
    if (activeIndex < 0) return;
    document
      .getElementById(optionId(activeIndex))
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, optionId]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => {
    setIsOpen(false);
    setActiveIndex(-1);
  }, []);

  const move = (delta: number) => {
    if (items.length === 0) return;
    setActiveIndex((prev) => {
      const next = prev + delta;
      if (next < 0) return items.length - 1;
      if (next >= items.length) return 0;
      return next;
    });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // While an IME candidate window is open, Enter commits the word being
    // composed. Treating it as "pick the highlighted option" steals the
    // keystroke from anyone typing Japanese, Chinese or Korean.
    if (event.nativeEvent.isComposing) return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!isOpen) setIsOpen(true);
        else move(1);
        return;

      case "ArrowUp":
        event.preventDefault();
        if (!isOpen) setIsOpen(true);
        else move(-1);
        return;

      case "Home":
        if (!isOpen || items.length === 0) return;
        event.preventDefault();
        setActiveIndex(0);
        return;

      case "End":
        if (!isOpen || items.length === 0) return;
        event.preventDefault();
        setActiveIndex(items.length - 1);
        return;

      case "Enter": {
        // Nothing highlighted: let the keystroke through so a surrounding
        // form can still submit.
        if (!isOpen || activeIndex < 0) return;
        const item = items[activeIndex];
        if (!item) return;
        event.preventDefault();
        onSelect(item);
        if (closeOnSelect) close();
        return;
      }

      case "Escape":
        event.preventDefault();
        if (isOpen) close();
        else onClear();
        return;

      case "Tab":
        // Never trap focus. Tab leaves; the list just closes behind it.
        close();
        return;
    }
  };

  return {
    listboxId,
    optionId,
    isOpen,
    activeIndex,
    setActiveIndex,
    open,
    close,
    onKeyDown,
  };
}
