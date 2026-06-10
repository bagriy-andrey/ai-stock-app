import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <main className="auth-placeholder-screen">
      <section className="auth-placeholder-card" aria-labelledby="forgot-password-heading">
        <p className="eyebrow">Coming soon</p>
        <h1 id="forgot-password-heading">Password reset is not available yet</h1>
        <p>
          Email and password authentication will be added in a later sprint. Use
          Google login to access AI Stock Advisor for now.
        </p>
        <Link className="empty-state-primary-action" href="/login">
          Back to login
        </Link>
      </section>
    </main>
  );
}
