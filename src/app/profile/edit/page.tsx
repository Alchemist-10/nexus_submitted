import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { currentProfile } from "@/features/profiles/queries";
import { ProfileEditor } from "@/components/profile-editor";
export default async function EditProfile() {
  await requireUser();
  const profile = await currentProfile();
  if (!profile) throw new Error("Your profile could not be loaded.");
  return (
    <div className="shell narrow page-space">
      <Link className="text-link" href="/profile">
        <ArrowLeft size={16} />
        My profile
      </Link>
      <div className="compose-heading">
        <span className="eyebrow">MAKE IT YOURS</span>
        <h1>
          A familiar face.
          <br />
          Your own story.
        </h1>
        <p className="lead">
          Help the community get to know the person behind your questions.
        </p>
      </div>
      <div className="panel">
        <ProfileEditor profile={profile} />
      </div>
    </div>
  );
}
