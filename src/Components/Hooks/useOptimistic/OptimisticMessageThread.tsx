import { useOptimistic, useRef, useState } from "react";

type Message = { id: number; text: string; sending?: boolean };

function deliverMessage(text: string): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(text), 1000);
  });
}

export const OptimisticMessageThread = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, text: "Hello there!" },
  ]);
  const formRef = useRef<HTMLFormElement>(null);
  const nextId = useRef(1);

  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    messages,
    (state, newMessageText: string) => [
      ...state,
      { id: nextId.current, text: newMessageText, sending: true },
    ],
  );

  async function formAction(formData: FormData) {
    const text = String(formData.get("message") ?? "");
    addOptimisticMessage(text);
    formRef.current?.reset();
    const sentText = await deliverMessage(text);
    setMessages((prev) => [
      ...prev,
      { id: nextId.current++, text: sentText },
    ]);
  }

  return (
    <div>
      <h3>Reducer-based optimistic list + form action</h3>
      <p>
        The updater function appends a message with <code>sending: true</code>{" "}
        to whatever the current list is — relative to <code>state</code>, not
        a fixed snapshot — so it stays correct even if <code>messages</code>{" "}
        changes while the Action is pending. <code>addOptimisticMessage</code>{" "}
        is called directly inside <code>formAction</code>, which React
        already treats as an Action because it's passed to{" "}
        <code>{"<form action={formAction}>"}</code>.
      </p>
      {optimisticMessages.map((message) => (
        <div key={message.id}>
          {message.text}
          {message.sending && <small> (Sending...)</small>}
        </div>
      ))}
      <form action={formAction} ref={formRef}>
        <input type="text" name="message" placeholder="Hello!" />
        <button type="submit">Send</button>
      </form>
    </div>
  );
};
