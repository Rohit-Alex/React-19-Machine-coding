import { KanbanBoard } from "./KanbanBoard";
import "../../Hooks/hook-demo.css";

export const KanbanBoardDemo = () => {
  return (
    <section>
      <h2>Drag-and-drop list / Kanban board</h2>
      <p>
        Writeup: <code>src/Components/MachineCoding/KanbanBoard/KanbanBoard.md</code>
        . Native HTML drag and drop, plus arrow buttons on every card so it
        works without dragging (keyboard, touch, switch devices).
      </p>
      <div className="demo-card">
        <h4>Kanban board</h4>
        <p>
          Drag a card within a column to reorder it, or into another column.
          Or use the arrow buttons. A single column on its own is the
          "reorderable list" version of the question.
        </p>
        <KanbanBoard />
      </div>
    </section>
  );
};
