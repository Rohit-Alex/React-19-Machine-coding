import { useState } from "react";
import { buildTree, seedComments, updateTree } from "./commentData";
import type { TreeNode } from "./commentData";
import { ReplyForm } from "./ReplyForm";

interface Handlers {
  onReply: (parentId: string, text: string) => void;
  onDelete: (id: string) => void;
}

const CommentList = ({
  comments,
  ...handlers
}: { comments: TreeNode[] } & Handlers) => (
  <ul style={{ listStyle: "none", paddingLeft: 16, borderLeft: "2px solid var(--border)" }}>
    {comments.map((c) => (
      <CommentItem key={c.id} comment={c} {...handlers} />
    ))}
  </ul>
);

// The component renders a list of its own replies, which renders this
// component again. The data's shape and the component's shape are the same.
const CommentItem = ({
  comment,
  ...handlers
}: { comment: TreeNode } & Handlers) => {
  // UI state lives in each comment. Collapsing a parent unmounts its
  // replies, so their open reply boxes and collapse state are lost.
  const [collapsed, setCollapsed] = useState(false);
  const [replying, setReplying] = useState(false);
  const count = comment.replies.length;

  return (
    <li>
      <p style={{ margin: "8px 0 0" }}>
        <strong>{comment.author}</strong> {comment.text}
      </p>
      <div className="demo-actions">
        <button onClick={() => setReplying((r) => !r)}>Reply</button>
        <button onClick={() => handlers.onDelete(comment.id)}>Delete</button>
        {count > 0 && (
          <button aria-expanded={!collapsed} onClick={() => setCollapsed((c) => !c)}>
            {collapsed ? `Show ${count} ${count === 1 ? "reply" : "replies"}` : "Hide replies"}
          </button>
        )}
      </div>
      {replying && (
        <ReplyForm
          label={`Reply to ${comment.author}`}
          onSubmit={(text) => {
            handlers.onReply(comment.id, text);
            setReplying(false);
            setCollapsed(false);
          }}
          onCancel={() => setReplying(false)}
        />
      )}
      {count > 0 && !collapsed && (
        <CommentList comments={comment.replies} {...handlers} />
      )}
    </li>
  );
};

export const RecursiveComments = () => {
  const [tree, setTree] = useState(() => buildTree(seedComments));

  const onReply = (parentId: string, text: string) => {
    const reply: TreeNode = {
      id: crypto.randomUUID(),
      parentId,
      author: "you",
      text,
      replies: [],
    };
    // Walks down from the root to find the parent, copying the path.
    setTree((t) =>
      updateTree(t, parentId, (p) => ({ ...p, replies: [...p.replies, reply] })),
    );
  };

  const onDelete = (id: string) => setTree((t) => updateTree(t, id, () => null));

  const onComment = (text: string) =>
    setTree((t) => [
      ...t,
      { id: crypto.randomUUID(), parentId: null, author: "you", text, replies: [] },
    ]);

  return (
    <div className="demo-card">
      <h4>Version 1: nested tree, recursive component</h4>
      <ReplyForm label="Add a comment" onSubmit={onComment} />
      <CommentList comments={tree} onReply={onReply} onDelete={onDelete} />
    </div>
  );
};
