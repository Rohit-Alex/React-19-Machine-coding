import { useState } from "react";
import { Tabs, type TabItem } from "./Tabs";
import "../../Hooks/hook-demo.css";

const SIMPLE: TabItem[] = [
  { id: "overview", label: "Overview", content: "A short description of the product." },
  { id: "specs", label: "Specs", content: "Weight 1.2kg · Battery 18h · USB-C." },
  { id: "reviews", label: "Reviews", content: "★★★★☆ — “Does what it says.”" },
];

export const TabsDemo = () => {
  const [tab, setTab] = useState("profile");
  const [name, setName] = useState("");
  const [savedName, setSavedName] = useState("");
  const isDirty = name !== savedName;

  const settings: TabItem[] = [
    {
      id: "profile",
      label: "Profile",
      content: (
        <div className="demo-actions">
          <input aria-label="Display name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name" />
          <button onClick={() => setSavedName(name)} disabled={!isDirty}>
            Save
          </button>
        </div>
      ),
    },
    { id: "billing", label: "Billing", content: "Visa ending 4242 · next bill 1 Nov." },
    { id: "security", label: "Security", content: "Two-factor login is on." },
  ];

  return (
    <section>
      <h2>Tabs</h2>
      <p>
        Writeup: <code>src/Components/MachineCoding/Tabs/Tabs.md</code>. One component, two modes:
        pass <code>defaultValue</code> and it owns the tab; pass <code>value</code> and you do.
      </p>

      <div className="demo-card">
        <h4>Uncontrolled</h4>
        <p>Only a starting tab. Click a tab, or focus one and use the arrow keys, Home, End.</p>
        <Tabs label="Product details" tabs={SIMPLE} defaultValue="specs" />
      </div>

      <div className="demo-card">
        <h4>Controlled</h4>
        <p>
          The parent owns the tab, so it can change it from outside, and refuse a change: type a
          name without saving, then try to leave Profile.
        </p>
        <div className="demo-actions">
          <button onClick={() => setTab("billing")}>Open Billing from outside</button>
        </div>
        <Tabs
          label="Settings"
          tabs={settings}
          value={tab}
          onChange={(next) => {
            if (tab === "profile" && isDirty) return; // Veto: unsaved changes.
            setTab(next);
          }}
        />
        <p role="status">{tab === "profile" && isDirty && "Unsaved changes — save before leaving Profile."}</p>
      </div>
    </section>
  );
};
