import { useState } from "react";
import { Accordion, type AccordionItem } from "./Accordion";
import "../../Hooks/hook-demo.css";

const FAQ: AccordionItem[] = [
  {
    id: "refund",
    title: "How do refunds work?",
    content: "Refunds go back to the original payment method within 5–7 working days.",
  },
  {
    id: "cancel",
    title: "Can I cancel an order?",
    content: (
      <>
        Yes, until it ships. Type here, close the section, and open it again — the text is
        still there: <input aria-label="Cancellation reason" placeholder="Reason" />
      </>
    ),
  },
  {
    id: "support",
    title: "How do I contact support?",
    content: "Use the chat button, or email support@example.com.",
  },
];

export const AccordionDemo = () => {
  const [allowMultiple, setAllowMultiple] = useState(false);

  return (
    <section>
      <h2>Accordion</h2>
      <p>
        Writeup: <code>src/Components/MachineCoding/Accordion/Accordion.md</code>. One Set of open
        ids covers single-open and multi-open.
      </p>

      <div className="demo-card">
        <h4>Built with buttons and ARIA</h4>
        <label>
          <input
            type="checkbox"
            checked={allowMultiple}
            onChange={(event) => setAllowMultiple(event.target.checked)}
          />{" "}
          Allow several open at once
        </label>
        <p>Tab to a header, then try the arrow keys, Home, and End.</p>
        <Accordion items={FAQ} allowMultiple={allowMultiple} defaultOpenIds={["refund"]} />
      </div>

      <div className="demo-card">
        <h4>Native: &lt;details name&gt;</h4>
        <p>
          No JavaScript. The shared <code>name</code> makes them single-open, like radio buttons.
          Ctrl+F also finds and opens text inside a closed one.
        </p>
        {FAQ.map((item) => (
          <details key={item.id} name="faq-native" open={item.id === "refund"}>
            <summary>{item.title}</summary>
            <p>{item.content}</p>
          </details>
        ))}
      </div>
    </section>
  );
};
