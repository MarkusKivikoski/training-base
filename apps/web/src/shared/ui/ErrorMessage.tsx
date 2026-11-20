type ErrorMessageProps = {
  error: unknown;
};

/** A failed request, with a hint that the API may not be running. */
export const ErrorMessage = ({ error }: ErrorMessageProps) => {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <p role="alert" className="py-6 text-center text-sm text-ink-2">
      Couldn’t load data: {message}. Is the API running (<code>npm run dev</code>)?
    </p>
  );
};
