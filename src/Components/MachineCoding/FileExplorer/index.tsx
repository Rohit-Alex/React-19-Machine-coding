import { FlatMapExplorer } from "./FlatMapExplorer";
import { RecursiveExplorer } from "./RecursiveExplorer";
import "../../Hooks/hook-demo.css";

export const FileExplorerDemo = () => {
  return (
    <section>
      <h2>File explorer / tree view with lazy loading</h2>
      <p>
        Writeup: <code>src/Components/MachineCoding/FileExplorer/FileExplorer.md</code>.
        Each folder's contents are fetched the first time it's opened. Try:
        open a folder, collapse its parent, reopen it (version 1 forgets which
        inner folders were open; version 2 remembers). Neither refetches.
      </p>
      <RecursiveExplorer />
      <FlatMapExplorer />
    </section>
  );
};
