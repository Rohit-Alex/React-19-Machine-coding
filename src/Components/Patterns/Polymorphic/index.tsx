import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Button, Text } from "./polymorphic";
import "../../Hooks/hook-demo.css";

// Stands in for a router's <Link>: a custom component with a required prop.
const FakeLink = ({ to, children, ...rest }: { to: string; children: ReactNode; style?: CSSProperties }) => (
  <a href={`#${to}`} onClick={(e) => e.preventDefault()} {...rest}>
    {children} <small>(→ {to})</small>
  </a>
);

export const PolymorphicDemo = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [clicks, setClicks] = useState(0);
  return (
    <section>
      <h2>Polymorphic components (the as prop)</h2>
      <p>
        Writeup: <code>src/Components/Patterns/Polymorphic/Polymorphic.md</code>. One styled
        component, rendered as whatever element the situation needs — with the right props checked
        by TypeScript.
      </p>
      <div className="demo-card">
        <h4>Text</h4>
        <Text as="h3" size="lg" style={{ margin: 0 }}>
          A heading (as="h3")
        </Text>
        <Text as="p" tone="muted" size="sm">
          A muted paragraph (as="p")
        </Text>
        <Text as="label" htmlFor="poly-email">
          A label (as="label" — htmlFor is allowed){" "}
        </Text>
        <Text as="input" id="poly-email" ref={inputRef} placeholder="as='input', with a typed ref" size="sm" />
      </div>
      <div className="demo-card">
        <h4>Button</h4>
        <div className="demo-actions">
          <Button onClick={() => setClicks((c) => c + 1)}>A real button ({clicks})</Button>
          <Button as="a" href="#polymorphic" variant="ghost">
            A link styled as a button
          </Button>
          <Button as={FakeLink} to="/settings">
            A router-style link
          </Button>
          <Button variant="ghost" onClick={() => inputRef.current?.focus()}>
            Focus the input via its ref
          </Button>
        </div>
        <Text as="p" size="sm" tone="muted">
          Same look, correct elements: buttons do things, links go places. Screen readers and
          middle-click work because the element is real.
        </Text>
      </div>
    </section>
  );
};
