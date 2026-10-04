/*
 * Stands in for a backend: a message store with an increasing `seq` number,
 * an HTTP-style "fetch since" for polling, and push "sockets".
 */
export interface Message {
  id: string;
  clientId: string; // Made by the sender; lets a retried send be recognised.
  author: string;
  text: string;
  seq: number; // Server order. Clients ask for "everything after seq N".
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const messages: Message[] = [
  { id: "m1", clientId: "seed-1", author: "Asha", text: "Hey! Is the demo ready?", seq: 1 },
  { id: "m2", clientId: "seed-2", author: "Bot", text: "Say anything and I'll reply.", seq: 2 },
];
let seq = messages.length;

interface Socket {
  onMessage: (message: Message) => void;
  onClose: () => void;
}
const sockets = new Set<Socket>();

function store(clientId: string, author: string, text: string): Message {
  // Idempotent: the same clientId twice (a retry after a lost response)
  // returns the first copy instead of posting the message again.
  const existing = messages.find((m) => m.clientId === clientId);
  if (existing) return existing;
  const message = { id: `m${++seq}`, clientId, author, text, seq };
  messages.push(message);
  sockets.forEach((socket) => socket.onMessage(message));
  return message;
}

export async function sendMessage(clientId: string, text: string): Promise<Message> {
  await wait(300 + Math.random() * 500);
  if (Math.random() < 0.15) throw new Error("Couldn't send (simulated)");
  const saved = store(clientId, "You", text);
  setTimeout(() => store(crypto.randomUUID(), "Bot", `You said “${text}”.`), 1200);
  return saved;
}

export async function fetchMessagesSince(afterSeq: number): Promise<Message[]> {
  await wait(150);
  return messages.filter((m) => m.seq > afterSeq);
}

export function connectSocket(onMessage: Socket["onMessage"], onClose: Socket["onClose"]) {
  const socket = { onMessage, onClose };
  sockets.add(socket);
  return () => {
    sockets.delete(socket);
  };
}

/** Demo controls. */
export const postFromSomeoneElse = () => store(crypto.randomUUID(), "Asha", "Did you see the new build?");
export function dropAllConnections() {
  for (const socket of [...sockets]) {
    sockets.delete(socket);
    socket.onClose();
  }
}
