interface ErrorStateProps {
  message: string;
  title: string;
}

export function ErrorState({ message, title }: ErrorStateProps) {
  return (
    <div className="error-state" role="alert">
      <span aria-hidden="true" className="error-state-mark" />
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  );
}
