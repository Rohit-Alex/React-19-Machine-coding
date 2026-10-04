import type { ComponentPropsWithRef, CSSProperties, ElementType } from "react";

/**
 * Props for a component that renders as `C`:
 *   our own props, plus `as`, plus every prop `C` accepts (including `ref`,
 *   which is a normal prop in React 19) — minus any names we define ourselves.
 */
export type PolymorphicProps<C extends ElementType, Own = object> = Own & { as?: C } & Omit<ComponentPropsWithRef<C>, keyof Own | "as">;

const SIZES = { sm: 13, md: 16, lg: 22 } as const;

interface TextOwnProps {
  size?: keyof typeof SIZES;
  tone?: "default" | "muted" | "danger";
}

export function Text<C extends ElementType = "span">({ as, size = "md", tone = "default", style, ...rest }: PolymorphicProps<C, TextOwnProps>) {
  // Widened to ElementType: TypeScript can't check props against a generic
  // `C` inside the component. The public props above are still fully checked.
  const Component: ElementType = as ?? "span";
  const color = { default: undefined, muted: "#888", danger: "#c4321c" }[tone];
  return <Component {...rest} style={{ fontSize: SIZES[size], color, ...(style as CSSProperties) }} />;
}

interface ButtonOwnProps {
  variant?: "primary" | "ghost";
}

export function Button<C extends ElementType = "button">({ as, variant = "primary", style, ...rest }: PolymorphicProps<C, ButtonOwnProps>) {
  const Component: ElementType = as ?? "button";
  const isNativeButton = Component === "button";
  return (
    <Component
      // A real <button> inside a form defaults to type="submit" — almost never what a
      // generic Button wants. Only set it on buttons; a link has no `type` like that.
      {...(isNativeButton ? { type: "button" } : {})}
      {...rest}
      style={{
        display: "inline-block",
        padding: "6px 12px",
        borderRadius: 6,
        border: "1px solid #3b6fd4",
        background: variant === "primary" ? "#3b6fd4" : "transparent",
        color: variant === "primary" ? "#fff" : "#3b6fd4",
        textDecoration: "none",
        font: "inherit",
        cursor: "pointer",
        ...(style as CSSProperties),
      }}
    />
  );
}
