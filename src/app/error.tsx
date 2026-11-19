"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="shell narrow page-space">
      <div className="panel">
        <span className="eyebrow">LET&apos;S TRY THAT AGAIN</span>
        <h1>A small interruption.</h1>
        <p className="lead">
          We couldn&apos;t load this page. Please try again. If this is a new
          workspace, check that the database migration has been applied.
        </p>
        <div className="button-row">
          <button className="button" onClick={reset}>
            Try again
          </button>
          <Link className="button secondary" href="/">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
