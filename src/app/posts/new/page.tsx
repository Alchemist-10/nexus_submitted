import Link from "next/link";
import { randomUUID } from "node:crypto";
import { ArrowLeft, Video } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { PostComposer } from "@/components/post-composer";
export default async function NewPostPage() {
  await requireUser();
  return (
    <div className="shell page-space narrow">
      <Link className="text-link" href="/">
        <ArrowLeft size={16} />
        Back to community
      </Link>
      <div className="compose-heading">
        <span className="eyebrow">
          A BETTER CONVERSATION STARTS WITH CONTEXT
        </span>
        <h1>
          Show us where
          <br />
          you’re stuck.
        </h1>
        <p className="lead">
          A hard problem. A project decision. Your next career step. Find
          someone who can work through it with you.
        </p>
        <p className="intro-note">
          <Video size={17} />
          One free introductory call with each mentor.
        </p>
      </div>
      <div className="panel">
        <PostComposer id={randomUUID()} />
      </div>
    </div>
  );
}
