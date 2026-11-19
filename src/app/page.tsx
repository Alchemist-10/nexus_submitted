import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { HomeSessionPreview } from "@/components/home-session-preview";
import { MentorRating } from "@/components/mentor-rating";
import { listMentors } from "@/features/mentorship/queries";
import { expertiseLabel } from "@/features/mentorship/presentation";
import { Suspense } from "react";
import { currentProfile } from "@/features/profiles/queries";
import {
  ArrowUpRight,
  MessageSquare,
  ArrowUp,
  Video,
  Plus,
  Search,
  Compass,
  Code2,
  FolderKanban,
  GraduationCap,
  BriefcaseBusiness,
  LayoutGrid,
  ImageIcon,
  CheckCircle2,
} from "lucide-react";
import { loadFeed } from "@/features/community/queries";
import { categories, topics, type Topic } from "@/features/community/shared";
export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{
    sort?: string;
    category?: string;
    topic?: string;
    q?: string;
    page?: string;
  }>;
}) {
  const filters = await searchParams;
  const profile = await currentProfile();
  const [{ posts, hasMore, unavailable }, mentors] = await Promise.all([
    loadFeed(filters),
    listMentors(),
  ]);
  const categoryIcons = {
    coding: Code2,
    projects: FolderKanban,
    academics: GraduationCap,
    career: BriefcaseBusiness,
  };
  const page = Math.max(
    1,
    Math.min(100, Math.trunc(Number(filters.page)) || 1),
  );
  function url(change: Record<string, string>) {
    const p = new URLSearchParams(
      Object.entries({ ...filters, ...change }).filter(([, v]) =>
        Boolean(v),
      ) as [string, string][],
    );
    return `/?${p}`;
  }
  return (
    <div
      className={`shell community-shell ${profile ? "signed-in-community" : "guest-community"}`}
    >
      {profile ? (
        <section className="workspace-welcome">
          <div>
            <span className="eyebrow">
              <span className="status-dot" /> YOUR NEXT CHAPTER
            </span>
            <h1>
              Hey {profile.full_name.split(" ")[0]},<br />
              <span className="heading-accent">what’s on your mind?</span>
            </h1>
            <p>
              A tricky problem. A big decision. Find someone to work through it
              with.
            </p>
            <div className="button-row">
              <Link className="button" href="/posts/new">
                <Plus size={17} aria-hidden="true" /> Share where you’re stuck
              </Link>
              <Link className="text-link" href="/mentors">
                Explore mentors <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
          <Suspense
            fallback={
              <div className="next-session-card">
                <span className="eyebrow">YOUR NEXT CONVERSATION</span>
                <h2>A little time. A new perspective.</h2>
                <Link className="text-link" href="/dashboard">
                  View your sessions <ArrowUpRight size={16} />
                </Link>
              </div>
            }
          >
            <HomeSessionPreview userId={profile.id} />
          </Suspense>
        </section>
      ) : (
        <section className="community-hero">
          <div>
            <span className="eyebrow">
              FOR ENGINEERING STUDENTS. FROM PEOPLE WHO GET IT.
            </span>
            <h1>
              Stuck on the approach?
              <br />
              <em>Find your person.</em>
            </h1>
            <p>
              Some things click when someone walks you through them. Share the
              problem. Find a mentor. Work it out together.
            </p>
            <div className="button-row">
              <Link className="button" href="/posts/new">
                <Plus size={17} />
                Post where you’re stuck
              </Link>
              <Link className="text-link" href="/mentors">
                Explore mentors <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>
          <div className="hero-callout">
            <Video size={28} strokeWidth={1.3} />
            <h2>
              More than
              <br />
              another answer.
            </h2>
            <p>
              A person who listens.
              <br />
              An approach you understand.
            </p>
            <span>One free introductory call per mentor.</span>
          </div>
        </section>
      )}
      <div className="feed-layout">
        <aside className="feed-sidebar">
          {profile && (
            <Link className="my-profile-card" href="/profile">
              <Avatar
                id={profile.id}
                name={profile.full_name}
                path={profile.avatar_path}
                variant={profile.avatar_variant}
                size="medium"
              />
              <div>
                <small>YOUR PROFILE</small>
                <strong>{profile.full_name}</strong>
                <span>My posts & answers</span>
              </div>
            </Link>
          )}
          <span className="eyebrow">EXPLORE</span>
          <nav aria-label="Community categories">
            <Link
              className={!filters.category ? "active" : ""}
              href={url({ category: "", page: "1" })}
            >
              <LayoutGrid size={17} aria-hidden="true" /> All requests
            </Link>
            {Object.entries(categories).map(([id, label]) => {
              const Icon = categoryIcons[id as keyof typeof categoryIcons];
              return (
                <Link
                  className={filters.category === id ? "active" : ""}
                  key={id}
                  href={url({ category: id, page: "1" })}
                >
                  <Icon size={17} aria-hidden="true" />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="sidebar-note">
            <span className="eyebrow">YOU’VE BEEN THERE.</span>
            <h3>
              Help someone
              <br />
              get unstuck.
            </h3>
            <p>
              Share your approach. Build trust through useful contributions.
            </p>
            <Link className="text-link" href="/dashboard/mentor">
              Become a mentor <ArrowUpRight size={15} />
            </Link>
          </div>
        </aside>
        <section className="feed-main" aria-label="Learning requests">
          <div className="feed-heading">
            <h2>
              Learning, in good company<span className="heading-dot">.</span>
            </h2>
            <span>Questions worth a conversation.</span>
          </div>
          <Link className="feed-compose-prompt" href="/posts/new">
            <span className="compose-prompt-icon">
              <Plus size={19} aria-hidden="true" />
            </span>
            <span>What could you use a hand with?</span>
            <span className="compose-prompt-end">
              Ask the community <ArrowUpRight size={16} aria-hidden="true" />
            </span>
          </Link>
          <form method="get" className="feed-search">
            <input
              type="hidden"
              name="category"
              value={filters.category || ""}
            />
            <input type="hidden" name="sort" value={filters.sort || "latest"} />
            <label className="search-field">
              <Search size={17} />
              <input
                name="q"
                aria-label="Search learning requests"
                placeholder="Search a problem or question"
                defaultValue={filters.q}
              />
            </label>
            <select
              name="topic"
              aria-label="Filter by topic"
              defaultValue={filters.topic || ""}
            >
              <option value="">All topics</option>
              {Object.entries(topics).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
            <button className="button secondary" type="submit">
              Search
            </button>
          </form>
          <nav className="feed-tabs" aria-label="Sort learning requests">
            {[
              ["latest", "Latest"],
              ["top", "Top"],
              ["unanswered", "Unanswered"],
            ].map(([id, label]) => (
              <Link
                aria-current={
                  (filters.sort || "latest") === id ? "page" : undefined
                }
                className={(filters.sort || "latest") === id ? "active" : ""}
                href={url({ sort: id, page: "1" })}
                key={id}
              >
                {label}
              </Link>
            ))}
          </nav>
          {unavailable ? (
            <div className="empty-state">
              <h3>The community is nearly ready.</h3>
              <p>
                Community publishing is not available yet. You can still browse
                mentors before posting a request. Existing bookings still work.
              </p>
              <Link className="button secondary" href="/mentors">
                Find a mentor
              </Link>
            </div>
          ) : posts.length ? (
            posts.map((post) => (
              <article className="feed-card" key={post.id}>
                <div className="post-meta">
                  <span>
                    {categories[post.category as keyof typeof categories]}
                  </span>
                  <Link
                    className="author-link"
                    href={`/profile/${post.author_id}`}
                  >
                    <Avatar
                      id={post.author_id}
                      name={post.author_name}
                      path={post.author_avatar_path}
                      variant={post.author_avatar_variant}
                      size="tiny"
                    />
                    <span>{post.author_name}</span>
                  </Link>
                  <span>
                    {new Date(post.created_at).toLocaleDateString("en-IN", {
                      month: "short",
                      day: "numeric",
                      timeZone: "UTC",
                    })}
                  </span>
                </div>
                <h3>
                  <Link href={`/posts/${post.id}`}>{post.title}</Link>
                </h3>
                <p className="feed-excerpt">{post.stuck_on}</p>
                <div className="tags">
                  {post.tags.map((t) => (
                    <Link key={t} href={url({ topic: t, page: "1" })}>
                      {topics[t as Topic] || t}
                    </Link>
                  ))}
                </div>
                {post.image_paths.length > 0 && (
                  <span className="muted small-copy">
                    <ImageIcon size={14} aria-hidden="true" />{" "}
                    {post.image_paths.length} attached{" "}
                    {post.image_paths.length === 1 ? "image" : "images"}
                  </span>
                )}
                <div className="feed-card-bottom">
                  <div>
                    <span>
                      <ArrowUp size={15} />
                      {post.upvotes} <span className="stat-label">upvotes</span>
                    </span>
                    <span>
                      <MessageSquare size={15} />
                      {post.answer_count}{" "}
                      <span className="stat-label">
                        {post.answer_count === 1 ? "answer" : "answers"}
                      </span>
                    </span>
                    {post.accepted_answer_id && (
                      <span className="resolved-label">
                        <CheckCircle2 size={14} aria-hidden="true" />
                        Answer accepted
                      </span>
                    )}
                  </div>
                  <Link href={`/posts/${post.id}`} className="text-link">
                    Find a mentor for this <ArrowUpRight size={15} />
                  </Link>
                </div>
              </article>
            ))
          ) : (
            <div className="empty-state">
              <MessageSquare size={28} />
              <h3>
                {filters.q || filters.topic || filters.category
                  ? "No requests match yet."
                  : "Every breakthrough starts somewhere."}
              </h3>
              <p>
                Post the problem you want to work through with a mentor. Include
                what you tried and where it stopped making sense.
              </p>
              <Link className="button" href="/posts/new">
                Start a conversation <Plus size={15} />
              </Link>
            </div>
          )}
          <div className="pagination">
            {page > 1 && (
              <Link
                className="text-link"
                href={url({ page: String(page - 1) })}
              >
                Previous page
              </Link>
            )}
            {hasMore && (
              <Link
                className="text-link"
                href={url({ page: String(page + 1) })}
              >
                More learning requests <ArrowUpRight size={15} />
              </Link>
            )}
          </div>
        </section>
        <aside className="feed-discovery" aria-label="Discover mentors">
          <div className="discovery-heading">
            <span className="eyebrow">A PERSON, NOT JUST AN ANSWER</span>
            <h2>Meet your next mentor.</h2>
            <p>Turn a stuck moment into a conversation.</p>
          </div>
          {mentors.slice(0, 3).map((m) => (
            <Link
              className="mini-mentor"
              href={`/mentors/${m.user_id}`}
              key={m.user_id}
            >
              <Avatar
                id={m.user_id}
                name={m.profile?.full_name || "Mentor"}
                path={m.profile?.avatar_path}
                variant={m.profile?.avatar_variant}
                size="medium"
              />
              <h3>{m.profile?.full_name || "Nexus mentor"}</h3>
              <p>{m.headline}</p>
              <MentorRating
                average={m.rating?.average_rating}
                count={m.rating?.rating_count}
              />
              <div className="tags">
                {m.expertise.slice(0, 2).map((t) => (
                  <span key={t}>{expertiseLabel(t)}</span>
                ))}
              </div>
              <span className="mini-mentor-cta">
                Meet your mentor <ArrowUpRight size={15} aria-hidden="true" />
              </span>
            </Link>
          ))}
          <Link className="button secondary" href="/mentors">
            <Compass size={16} aria-hidden="true" /> Browse all mentors
          </Link>
          <div className="how-it-works-mini">
            <span className="eyebrow">FROM STUCK TO STARTED</span>
            <ol>
              <li>
                <span>01</span> Share your roadblock
              </li>
              <li>
                <span>02</span> Find the right mentor
              </li>
              <li>
                <span>03</span> Talk it through, together
              </li>
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}
