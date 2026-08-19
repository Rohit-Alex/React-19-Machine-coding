import { useEffect, useState } from "react";

function fetchBio(person: string) {
  const delay = Math.round(200 + Math.random() * 1500);
  console.log(`[RaceCondition] requesting "${person}" bio (${delay}ms)`);
  return new Promise<string>((resolve) => {
    setTimeout(() => resolve(`${person}'s bio (took ${delay}ms)`), delay);
  });
}

/**
 * Scenario 2: Race conditions in data fetching.
 * Without the `ignore` flag, clicking Alice then Bob quickly could let
 * Alice's slower response land AFTER Bob's and overwrite it - the classic
 * fetch race condition. The `ignore` flag set in cleanup discards stale
 * responses.
 */
export const RaceCondition = () => {
  const [person, setPerson] = useState("Alice");
  const [bio, setBio] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    setBio(null);
    fetchBio(person).then((result) => {
      if (!ignore) {
        setBio(result);
      } else {
        console.log(`[RaceCondition] ignored stale response for "${person}"`);
      }
    });
    return () => {
      ignore = true;
    };
  }, [person]);

  return (
    <div className="demo-card">
      <h4>2. Race conditions in data fetching</h4>
      <p>
        Open the console. Click Alice then Bob quickly a few times - the bio
        shown always matches the last click, even if an earlier request resolves
        later.
      </p>
      <div className="demo-actions">
        <button onClick={() => setPerson("Alice")}>Alice</button>
        <button onClick={() => setPerson("Bob")}>Bob</button>
      </div>
      <p>{bio ?? "loading..."}</p>
    </div>
  );
};
