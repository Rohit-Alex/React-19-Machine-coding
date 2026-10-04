import { useState } from "react";
import { Tabs } from "./Tabs";
import "../../Hooks/hook-demo.css";

export const CompoundComponentsDemo = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [unread, setUnread] = useState(3);

  return (
    <section>
      <h2>Compound components</h2>
      <p>
        Writeup: <code>src/Components/Patterns/CompoundComponents/CompoundComponents.md</code>. The
        caller arranges the parts; the parts share state through context.
      </p>
      <div className="demo-card">
        <h4>Things a config-array API makes awkward</h4>
        <label>
          <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} /> Admin (adds a tab)
        </label>
        <Tabs.Root defaultValue="inbox">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <Tabs.List label="Mail">
              <Tabs.Tab value="inbox">
                {/* Any content in a tab: here, a live badge. */}
                Inbox {unread > 0 && <span style={{ background: "#c4321c", color: "#fff", borderRadius: 8, padding: "0 6px", fontSize: 11 }}>{unread}</span>}
              </Tabs.Tab>
              <Tabs.Tab value="sent">Sent</Tabs.Tab>
              <Tabs.Tab value="spam" disabled>
                Spam
              </Tabs.Tab>
              {/* Conditional tab: just don't render it. */}
              {isAdmin && <Tabs.Tab value="audit">Audit log</Tabs.Tab>}
            </Tabs.List>
            {/* Something that isn't a tab, placed between list and panels. */}
            <button onClick={() => setUnread(0)} disabled={!unread}>
              Mark all read
            </button>
          </div>
          <Tabs.Panel value="inbox">{unread ? `${unread} unread messages.` : "All caught up."}</Tabs.Panel>
          <Tabs.Panel value="sent">Nothing sent today.</Tabs.Panel>
          <Tabs.Panel value="audit">Admin-only audit log.</Tabs.Panel>
        </Tabs.Root>
      </div>
    </section>
  );
};
