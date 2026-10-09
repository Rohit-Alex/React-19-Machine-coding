import { FlatMapExplorer } from "./FlatMapExplorer";
import { RecursiveExplorer } from "./RecursiveExplorer";
import "../../Hooks/hook-demo.css";

export const FileExplorerDemo = () => {
  return (
    <section>
      <h2>File explorer / tree view with lazy loading</h2>
      <p>
        Writeup: <code>src/Components/MachineCoding/FileExplorer/FileExplorer.md</code>.
        Version 1 fetches each folder's contents the first time it's opened;
        version 2 has the whole tree in memory. Try: open a folder, collapse
        its parent, reopen it (version 1 forgets which inner folders were open;
        version 2 remembers).
      </p>
      <RecursiveExplorer />
      <FlatMapExplorer />
    </section>
  );
};
