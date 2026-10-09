export function ErrorNotice({
  message,
  retry,
  busy,
  onRetry,
  onDismiss,
}: {
  message: string;
  retry: boolean;
  busy: boolean;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="notice error" role="alert">
      {message}
      {retry && (
        <button disabled={busy} onClick={onRetry}>
          Retry same action safely
        </button>
      )}
      <button className="quiet" onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  );
}
