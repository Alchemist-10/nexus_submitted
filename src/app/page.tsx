import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { FeedPostActions } from "@/components/feed-post-actions";
import { HomeSessionPreview } from "@/components/home-session-preview";
import { StudioIllustration } from "@/components/studio-illustration";
import { MentorRating } from "@/components/mentor-rating";
import { listMentors } from "@/features/mentorship/queries";
import { expertiseLabel } from "@/features/mentorship/presentation";
import { Suspense } from "react";
import { currentProfile } from "@/features/profiles/queries";
import {
  ArrowUpRight,
  MessageSquare,
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
import { normalizeSearch } from "@/features/community/search";
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
  const search = normalizeSearch(filters.q);
  const profile = await currentProfile();
  const [{ posts, votedPostIds, hasMore, unavailable }, mentors] =
    await Promise.all([loadFeed(filters, profile?.id), listMentors()]);
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
      <section
        className={`studio-hero ${profile ? "studio-hero-personal" : ""}`}
      >
        <div className="studio-hero-copy">
          <span className="eyebrow">
            01 / THE LEARNING STUDIO
            {profile && (
              <span className="studio-greeting">
                Hey, {profile.full_name.split(" ")[0]}.
              </span>
            )}
          </span>
          <h1>
            Good questions.
            <br />
            <em>Better conversations.</em>
          </h1>
          <p>Stuck on the approach? Find someone to work through it with.</p>
          <div className="button-row">
            <Link className="button" href="/mentors">
              Find a mentor <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
            <Link className="text-link" href="/posts/new">
              Share where you’re stuck
            </Link>
          </div>
          <span className="studio-free-note">
            Your first introduction with each mentor is free.
          </span>
        </div>
        <StudioIllustration
          people={mentors.slice(0, 2).map((m) => ({
            id: m.user_id,
            name: m.profile?.full_name || "Nexus mentor",
            path: m.profile?.avatar_path,
            variant: m.profile?.avatar_variant,
          }))}
        />
      </section>
      <div className="studio-running-line">
        <span>A little guidance goes a long way.</span>
        <span>CODING / PROJECTS / ACADEMICS / CAREERS</span>
      </div>
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
              <span className="subject-number" aria-hidden="true">
                00
              </span>
              <LayoutGrid size={16} aria-hidden="true" /> All requests
            </Link>
            {Object.entries(categories).map(([id, label], index) => {
              const Icon = categoryIcons[id as keyof typeof categoryIcons];
              return (
                <Link
                  className={filters.category === id ? "active" : ""}
                  key={id}
                  href={url({ category: id, page: "1" })}
                >
                  <span className="subject-number" aria-hidden="true">
                    0{index + 1}
                  </span>
                  <Icon size={16} aria-hidden="true" />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="sidebar-note">
            <span className="eyebrow">YOU’VE BEEN THERE.</span>
            <h2>
              Help someone
              <br />
              get unstuck.
            </h2>
            <p>
              Share your approach. Build trust through useful contributions.
            </p>
            <Link className="text-link" href="/dashboard/mentor">
              Become a mentor <ArrowUpRight size={15} />
            </Link>
          </div>
        </aside>
        {profile && (
          <div className="feed-next-session">
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
          </div>
        )}
        <section className="feed-main" aria-label="Learning requests">
          <div className="feed-heading">
            <h2>
              The working notes<span className="heading-dot">.</span>
            </h2>
            <span>QUESTIONS WORTH A CONVERSATION</span>
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
          <form
            method="get"
            className="feed-search"
            key={JSON.stringify([
              search,
              filters.category,
              filters.topic,
              filters.sort,
              page,
            ])}
          >
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
                placeholder="Search titles, details or topics"
                defaultValue={search}
                maxLength={100}
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
          {(search || filters.topic || filters.category) && (
            <div className="search-summary" role="status">
              <span>
                {search ? (
                  <>
                    Results for <strong>“{search}”</strong>
                  </>
                ) : (
                  "Filtered learning requests"
                )}
              </span>
              <Link
                className="text-link"
                href={url({
                  q: "",
                  category: "",
                  topic: "",
                  sort: "latest",
                  page: "1",
                })}
              >
                {search ? "Clear search & filters" : "Clear filters"}
              </Link>
            </div>
          )}
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
                  <div className="feed-engagement">
                    <FeedPostActions
                      postId={post.id}
                      title={post.title}
                      authorId={post.author_id}
                      viewerId={profile?.id}
                      voted={votedPostIds.includes(post.id)}
                      upvotes={post.upvotes}
                      answerCount={post.answer_count}
                    />
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
                {search || filters.topic || filters.category
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
