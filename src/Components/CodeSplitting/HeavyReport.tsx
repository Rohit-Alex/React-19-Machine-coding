// Loaded only when first shown: this file is its own chunk in the build.
const ROWS = Array.from({ length: 12 }, (_, i) => ({ month: new Date(2026, i).toLocaleString(undefined, { month: "short" }), revenue: 40 + ((i * 53) % 60) }));

const HeavyReport = () => (
  <div>
    <strong>Revenue report</strong>
    <div style={{ display: "flex", alignItems: "end", gap: 4, height: 100, marginTop: 8 }}>
      {ROWS.map((r) => (
        <div key={r.month} title={`${r.month}: ₹${r.revenue}L`} style={{ flex: 1, height: `${r.revenue}%`, background: "#3b6fd4" }} />
      ))}
    </div>
    <div style={{ display: "flex", gap: 4, fontSize: 10 }}>
      {ROWS.map((r) => (
        <span key={r.month} style={{ flex: 1, textAlign: "center" }}>
          {r.month}
        </span>
      ))}
    </div>
  </div>
);

export default HeavyReport; // React.lazy needs a default export.
