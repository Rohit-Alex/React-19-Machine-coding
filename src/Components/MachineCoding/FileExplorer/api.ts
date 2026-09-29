import type { Entry } from "./fileTree";

const folder = (id: string, name: string): Entry => ({ id, name, kind: "folder" });
const file = (id: string, name: string): Entry => ({ id, name, kind: "file" });

// The "server". Only one folder's contents come back per request.
const server: Record<string, Entry[]> = {
  root: [
    folder("src", "src"),
    folder("public", "public"),
    folder("drive", "network-drive (fails half the time)"),
    file("pkg", "package.json"),
    file("readme", "README.md"),
  ],
  src: [folder("components", "components"), file("app", "App.tsx"), file("main", "main.tsx")],
  components: [file("button", "Button.tsx"), file("modal", "Modal.tsx"), folder("icons", "icons")],
  icons: [],
  public: [file("favicon", "favicon.svg")],
  drive: [file("backup", "backup.zip")],
};

export function fetchChildren(folderId: string): Promise<Entry[]> {
  return new Promise((resolve, reject) =>
    setTimeout(() => {
      if (folderId === "drive" && Math.random() < 0.5) {
        reject(new Error("Network error"));
      } else {
        resolve(server[folderId] ?? []);
      }
    }, 600),
  );
}
