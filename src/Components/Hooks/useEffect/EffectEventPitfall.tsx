import { useEffect, useEffectEvent, useState } from "react";

interface LogEntry {
  query: string;
  caseSensitive: boolean;
}

interface SearchProps {
  query: string;
  caseSensitive: boolean;
  onLog: (entry: LogEntry) => void;
}

// Buggy: `query` is only ever read inside the Effect Event, so it's never a
// dependency here. The Effect has nothing left to react to, so it fires once
// on mount and never again - later query changes are silently never logged.
const BuggySearch = ({ query, caseSensitive, onLog }: SearchProps) => {
  const onSearch = useEffectEvent(() => {
    onLog({ query, caseSensitive });
  });

  useEffect(() => {
    onSearch();
  }, []);

  return null;
};

// Fixed: `query` should cause a new log entry, so it stays a real dependency.
// Only `caseSensitive` - a display detail that shouldn't trigger a re-log -
// is read non-reactively inside the Effect Event.
const FixedSearch = ({ query, caseSensitive, onLog }: SearchProps) => {
  const onSearch = useEffectEvent((searchedQuery: string) => {
    onLog({ query: searchedQuery, caseSensitive });
  });

  useEffect(() => {
    onSearch(query);
  }, [query]);

  return null;
};

export const EffectEventPitfall = () => {
  const [query, setQuery] = useState("react");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [buggy, setBuggy] = useState(true);
  const [log, setLog] = useState<LogEntry[]>([]);

  const onLog = (entry: LogEntry) => setLog((l) => [...l, entry]);

  return (
    <div className="demo-card">
      <h4>Pitfall: don't hide a dependency that should re-run the Effect</h4>
      <p>
        Change "query" a few times while on the buggy version - the log stops
        growing after the first entry, because <code>query</code> is only
        read inside the Effect Event instead of being a real dependency.
        Switch to fixed and every query change logs correctly; only{" "}
        <code>caseSensitive</code> (a display-only detail) is read
        non-reactively.
      </p>
      <div className="demo-actions">
        <button onClick={() => setQuery((q) => (q === "react" ? "vue" : "react"))}>
          change query ({query})
        </button>
        <button onClick={() => setCaseSensitive((c) => !c)}>
          toggle caseSensitive ({String(caseSensitive)})
        </button>
        <button
          onClick={() => {
            setBuggy((b) => !b);
            setLog([]);
          }}
        >
          switch to {buggy ? "fixed" : "buggy"} version
        </button>
      </div>
      <p>
        Currently running: <strong>{buggy ? "buggy" : "fixed"}</strong>{" "}
        version
      </p>
      {buggy ? (
        <BuggySearch query={query} caseSensitive={caseSensitive} onLog={onLog} />
      ) : (
        <FixedSearch query={query} caseSensitive={caseSensitive} onLog={onLog} />
      )}
      <ul>
        {log.map((entry, i) => (
          <li key={i}>
            {entry.query} (caseSensitive: {String(entry.caseSensitive)})
          </li>
        ))}
      </ul>
    </div>
  );
};
