/**
 * Put `text`'s digits into the boxes, starting at `start`. Covers typing one
 * digit, pasting, and phone autofill (which drops the whole code into one
 * box). Non-digits are ignored ("123-456" pastes as 123456). A full-length
 * code always starts at the first box, wherever the cursor was.
 *
 * Returns the new digits and which box to focus next, or null if there was
 * nothing usable (e.g. a letter was typed).
 */
export function fillDigits(digits: string[], start: number, text: string) {
  const incoming = text.replace(/\D/g, "").split("");
  if (incoming.length === 0) return null;

  const from = incoming.length >= digits.length ? 0 : start;
  const fits = incoming.slice(0, digits.length - from);
  const next = [...digits];
  fits.forEach((d, k) => (next[from + k] = d));

  // The box after the last one filled; stay on the last box at the end.
  return { digits: next, focus: Math.min(from + fits.length, digits.length - 1) };
}
