import { startTransition, useOptimistic, useState } from "react";

function toggleLikeOnServer(next: boolean) {
  return new Promise<boolean>((resolve, reject) => {
    setTimeout(() => {
      Math.random() > 0.5 ? resolve(next) : reject();
    }, 1000);
  });
}

export const ToggleLikeButton = () => {
  const [isLiked, setIsLiked] = useState(false);
  const [optimisticIsLiked, setOptimisticIsLiked] = useOptimistic(isLiked);

  const handleClick = () => {
    const nextValue = !optimisticIsLiked;

    startTransition(async () => {
      setOptimisticIsLiked(nextValue);

      try {
        const confirmed = await toggleLikeOnServer(nextValue);

        startTransition(() => {
          setIsLiked(confirmed);
        });
      } catch {
        // No setIsLiked call.
        // Since isLiked is still false, useOptimistic rolls back automatically.
      }
    });
  };

  return (
    <div>
      <h3>Basic optimistic toggle: no reducer</h3>
      <p>
        <code>optimisticIsLiked</code> flips the instant the button is clicked,
        inside <code>startTransition</code>. The "real" <code>isLiked</code>{" "}
        state only updates once <code>toggleLikeOnServer</code> resolves — until
        then React renders the optimistic value.
      </p>
      <button onClick={handleClick}>
        {optimisticIsLiked ? "❤️ Unlike" : "🤍 Like"}
      </button>
    </div>
  );
};
