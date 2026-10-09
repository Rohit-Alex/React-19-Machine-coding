import { ConsentView } from "./ConsentView";
import "../../Hooks/hook-demo.css";

export const CookieConsentDemo = () => (
  <section>
    <h2>Cookie Consent Manager SDK (LLD)</h2>
    <p>
      Writeup: <code>src/Components/MachineCoding/CookieConsent/CookieConsent.md</code>. The SDK is a plain
      class with no React; the banner subscribes to it with <code>useSyncExternalStore</code>, and three fake
      vendor scripts register as consumers.
    </p>
    <div className="demo-card">
      <h4>Config service → consent → consumers</h4>
      <p>
        Accept, reject or customise, then watch which consumers start and stop, and which cookies get
        deleted. Reload to see the saved decision come back; publish a new config version to be asked again.
      </p>
      <ConsentView />
    </div>
  </section>
);
