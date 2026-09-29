import { useState } from "react";
import {
  addToIndex,
  buildIndex,
  removeFromIndex,
  seedComments,
  visibleRows,
} from "./commentData";
import type { Comment } from "./commentData";
import { ReplyForm } from "./ReplyForm";

const MAX_INDENT = 6; // Past this, deeper replies line up instead of drifting off screen.

export const FlatMapComments = () => {
  const [index, setIndex] = useState(() => buildIndex(seedComments));
  // UI state lives here, keyed by id, because no component owns a subtree.
  // Collapsing a parent no longer loses anything below it.
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const add = (parentId: string | null, text: string) => {
    const comment: Comment = { id: crypto.randomUUID(), parentId, author: "you", text };
    setIndex((i) => addToIndex(i, comment));
  };

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  // Derived on every render; the tree is never stored in nested form.
  const rows = visibleRows(index, collapsed);

  return (
    <div className="demo-card">
      <h4>Version 2: flat map, iterative rendering</h4>
      <ReplyForm label="Add a comment" onSubmit={(text) => add(null, text)} />
      <ul style={{ listStyle: "none", padding: 0 }}>
        {rows.map(({ id, depth }) => {
          const c = index.byId[id];
          const count = c.childIds.length;
          const isCollapsed = collapsed.has(id);
          return (
            <li
              key={id}
              aria-level={depth + 1}
              style={{
                marginLeft: Math.min(depth, MAX_INDENT) * 16,
                paddingLeft: depth > 0 ? 12 : 0,
                borderLeft: depth > 0 ? "2px solid var(--border)" : undefined,
              }}
            >
              <p style={{ margin: "8px 0 0" }}>
                <strong>{c.author}</strong> {c.text}
              </p>
              <div className="demo-actions">
                <button onClick={() => setReplyingTo(replyingTo === id ? null : id)}>
                  Reply
                </button>
                <button onClick={() => setIndex((i) => removeFromIndex(i, id))}>
                  Delete
                </button>
                {count > 0 && (
                  <button aria-expanded={!isCollapsed} onClick={() => toggle(id)}>
                    {isCollapsed
                      ? `Show ${count} ${count === 1 ? "reply" : "replies"}`
                      : "Hide replies"}
                  </button>
                )}
              </div>
              {replyingTo === id && (
                <ReplyForm
                  label={`Reply to ${c.author}`}
                  onSubmit={(text) => {
                    add(id, text);
                    setReplyingTo(null);
                    setCollapsed((prev) => {
                      const next = new Set(prev);
                      next.delete(id);
                      return next;
                    });
                  }}
                  onCancel={() => setReplyingTo(null)}
                />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
