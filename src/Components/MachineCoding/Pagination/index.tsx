import { ClientPagination } from "./ClientPagination";
import { ServerPagination } from "./ServerPagination";
import "../../Hooks/hook-demo.css";

export const PaginationDemo = () => {
  return (
    <section>
      <h2>Pagination</h2>
      <p>
        Writeup:{" "}
        <code>src/Components/MachineCoding/Pagination/Pagination.md</code>.
        Same page-number component, two data strategies: slice an array you
        already have, or ask the server for one page at a time.
      </p>
      <ClientPagination />
      <ServerPagination />
    </section>
  );
};
