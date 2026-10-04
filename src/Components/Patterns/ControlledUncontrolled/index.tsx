import { useState } from "react";
import { Disclosure } from "./Disclosure";
import "../../Hooks/hook-demo.css";

const SECTIONS = ["Shipping", "Returns", "Warranty"];
const USERS = [
  { id: 1, name: "Asha Rao", email: "asha@example.com" },
  { id: 2, name: "Ben Okafor", email: "ben@example.com" },
];

export const ControlledUncontrolledDemo = () => {
  const [openSections, setOpenSections] = useState<string[]>([]);
  const [card, setCard] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [userIndex, setUserIndex] = useState(0);
  const user = USERS[userIndex];

  return (
    <section>
      <h2>Controlled vs uncontrolled</h2>
      <p>
        Writeup: <code>src/Components/Patterns/ControlledUncontrolled/ControlledUncontrolled.md</code>.
        Who owns the value: the component, or its parent?
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
        <div className="demo-card">
          <h4>Uncontrolled: each one owns its state</h4>
          {SECTIONS.map((s) => (
            <Disclosure key={s} title={s} defaultOpen={s === "Shipping"}>
              Details about {s.toLowerCase()}.
            </Disclosure>
          ))}
          <p style={{ fontSize: 13 }}>Simple to use — but the page can't open or close them.</p>
        </div>

        <div className="demo-card">
          <h4>Controlled: the parent owns it</h4>
          <div className="demo-actions">
            <button onClick={() => setOpenSections(SECTIONS)}>Expand all</button>
            <button onClick={() => setOpenSections([])}>Collapse all</button>
          </div>
          {SECTIONS.map((s) => (
            <Disclosure
              key={s}
              title={s}
              open={openSections.includes(s)}
              onOpenChange={(open) => setOpenSections((prev) => (open ? [...prev, s] : prev.filter((x) => x !== s)))}
            >
              Details about {s.toLowerCase()}.
            </Disclosure>
          ))}
          <p style={{ fontSize: 13 }}>Same component. Now "Expand all" is possible.</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
        <div className="demo-card">
          <h4>Controlled input: shape it as you type</h4>
          <label>
            Card number{" "}
            <input
              inputMode="numeric"
              autoComplete="cc-number"
              value={card}
              // Every keystroke goes through us, so we can clean and format it.
              onChange={(e) =>
                setCard(
                  e.target.value
                    .replace(/\D/g, "")
                    .slice(0, 16)
                    .replace(/(\d{4})(?=\d)/g, "$1 "),
                )
              }
              placeholder="1234 5678 9012 3456"
            />
          </label>
          <p style={{ fontSize: 13 }}>{card.replace(/\s/g, "").length} of 16 digits</p>
        </div>

        <div className="demo-card">
          <h4>Uncontrolled form: read it on submit</h4>
          <div className="demo-actions">
            <button onClick={() => setUserIndex((i) => (i + 1) % USERS.length)}>Load next user</button>
          </div>
          {/* defaultValue is only read on mount. A new key remounts the form, so
              the new user's values show — and any half-typed edits are dropped. */}
          <form
            key={user.id}
            action={(formData) => setSubmitted(`${formData.get("name")} <${formData.get("email")}>`)}
          >
            <label style={{ display: "block" }}>
              Name <input name="name" defaultValue={user.name} />
            </label>
            <label style={{ display: "block" }}>
              Email <input name="email" type="email" defaultValue={user.email} />
            </label>
            <button type="submit">Save</button>
          </form>
          <p role="status" style={{ fontSize: 13 }}>
            {submitted && `Saved: ${submitted}`}
          </p>
        </div>
      </div>
    </section>
  );
};
