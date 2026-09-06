import { useImperativeHandle, useRef } from "react";

type CommentListHandle = { scrollToBottom: () => void };
type AddCommentHandle = { focus: () => void };
type PostHandle = { scrollAndFocusAddComment: () => void };

function CommentList({ ref }: { ref?: React.Ref<CommentListHandle> }) {
  const divRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => {
    return {
      scrollToBottom() {
        const node = divRef.current;
        if (node) node.scrollTop = node.scrollHeight;
      },
    };
  }, []);

  const comments = Array.from({ length: 30 }, (_, i) => (
    <p key={i} style={{ margin: "4px 0" }}>
      Comment #{i}
    </p>
  ));

  return (
    <div ref={divRef} style={{ height: 100, overflow: "auto", border: "1px solid #ccc" }}>
      {comments}
    </div>
  );
}

function AddComment({ ref }: { ref?: React.Ref<AddCommentHandle> }) {
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => {
    return {
      focus() {
        inputRef.current?.focus();
      },
    };
  }, []);

  return <input ref={inputRef} placeholder="Add comment..." />;
}

function Post({ ref }: { ref?: React.Ref<PostHandle> }) {
  const commentsRef = useRef<CommentListHandle>(null);
  const addCommentRef = useRef<AddCommentHandle>(null);

  useImperativeHandle(ref, () => {
    return {
      scrollAndFocusAddComment() {
        commentsRef.current?.scrollToBottom();
        addCommentRef.current?.focus();
      },
    };
  }, []);

  return (
    <div>
      <article>Welcome to my blog!</article>
      <CommentList ref={commentsRef} />
      <AddComment ref={addCommentRef} />
    </div>
  );
}

export const NestedHandles = () => {
  const postRef = useRef<PostHandle>(null);

  return (
    <div>
      <h3>Nested handles</h3>
      <p>
        A handle can expose an action that itself calls into other
        components' handles — <code>Post</code> exposes a single{" "}
        <code>scrollAndFocusAddComment()</code> that reaches through its own
        refs to <code>CommentList</code> and <code>AddComment</code>. The
        parent doesn't know or care that two components are involved.
      </p>
      <button onClick={() => postRef.current?.scrollAndFocusAddComment()}>
        Write a comment
      </button>
      <Post ref={postRef} />
    </div>
  );
};
