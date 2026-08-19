import { useEffect, useLayoutEffect, useState } from "react";

export const EffectFlush = () => {
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    console.log("1. layout effect");

    // Because this update must be processed before paint,
    // React may flush the pending useEffect before the browser paints.
    setReady(true);
  }, []);

  useEffect(() => {
    console.log("2. useEffect");
  }, []);

  console.log("render", ready);

  return (
    <>
      <h4> Effect Flush when state updates in useLayoutEffect</h4>
      <p>{ready ? "Ready" : "Not ready"}</p>
    </>
  );
};

/**
 * Important:
 *
 * Normally, useEffect is considered a passive effect that runs
 * after the browser has had an opportunity to paint.
 *
 * However, if useLayoutEffect schedules a state update, React needs
 * to process that update before paint. While processing this work,
 * React may also flush pending useEffects from the previous render
 * before the browser paints.
 *
 * Therefore, don't treat:
 *
 *   useEffect = ALWAYS after paint
 *
 * as an absolute guarantee.
 * 
            Initial render
                ↓
            commit
                ↓
            useLayoutEffect
                ↓
            setReady(true)
                ↓
            React processes update
                ↓
            pending useEffect may run
                ↓
            second render
                ↓
            browser paint
 */
