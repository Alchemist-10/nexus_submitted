import Link from "next/link";
export default function NotFoundPage() {
  return (
    <div className="shell narrow page-space">
      <span className="eyebrow">404</span>
      <h1>A different direction.</h1>
      <p className="lead">We couldn&apos;t find that page or mentor.</p>
      <Link className="button" href="/">
        Back to Nexus
      </Link>
    </div>
  );
}
