import { DriveExplorer } from "./DriveExplorer";
import "../../Hooks/hook-demo.css";

export const DriveExplorerDemo = () => {
  return (
    <section>
      <h2>Google Drive–like file explorer (HLD + mini build)</h2>
      <p>
        Writeup: <code>src/Components/MachineCoding/DriveExplorer/DriveExplorer.md</code>
        . The writeup is the full design; this is the part you'd build in the
        interview: layout, breadcrumbs, grid/list, search, and add / rename /
        delete.
      </p>
      <DriveExplorer />
    </section>
  );
};
