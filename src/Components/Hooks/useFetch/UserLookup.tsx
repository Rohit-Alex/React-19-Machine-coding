import { useState } from "react";
import { useFetch } from "./useFetch";

interface User {
  id: number;
  name: string;
  email: string;
  company: { name: string };
}

export const UserLookup = () => {
  const [userId, setUserId] = useState<number | null>(null);
  const url =
    userId === null
      ? null
      : `https://jsonplaceholder.typicode.com/users/${userId}`;
  const { data: user, error, isLoading } = useFetch<User>(url);

  return (
    <div>
      <h3>Fetching a user by id: data, error, isLoading</h3>
      <p>
        Clicking an id sets <code>userId</code>, which rebuilds the fetch{" "}
        <code>url</code> passed to <code>useFetch</code>. Click ids quickly in
        a row — each new <code>url</code> aborts whatever request is still in
        flight, so a slow response for an id you've since clicked past can
        never overwrite the result for the id you're actually looking at.
      </p>
      <div>
        {[1, 2, 3, 4, 5].map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setUserId(id)}
            disabled={userId === id && isLoading}
          >
            User {id}
          </button>
        ))}
      </div>
      {userId === null && <p>Pick a user id above.</p>}
      {isLoading && <p>Loading user {userId}...</p>}
      {error && <p role="alert">Failed to load: {error.message}</p>}
      {user && !isLoading && (
        <ul>
          <li>Name: {user.name}</li>
          <li>Email: {user.email}</li>
          <li>Company: {user.company.name}</li>
        </ul>
      )}
    </div>
  );
};
