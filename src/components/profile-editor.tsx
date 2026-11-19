"use client";
import { useState } from "react";
import { Avatar } from "@/components/avatar";
import { ActionForm } from "@/components/action-form";
import { updateProfile } from "@/features/profiles/actions";
import type { Profile } from "@/lib/database.types";
export function ProfileEditor({ profile }: { profile: Profile }) {
  const [variant, setVariant] = useState(profile.avatar_variant),
    [useDefault, setUseDefault] = useState(false);
  return (
    <ActionForm
      action={updateProfile}
      submitLabel="Save profile"
      className="profile-editor"
    >
      <div className="avatar-editor">
        <Avatar
          id={profile.id}
          name={profile.full_name}
          variant={variant}
          path={useDefault ? null : profile.avatar_path}
          size="large"
        />
        <div>
          <h2>Your profile picture</h2>
          <p className="muted">
            Keep a unique illustration or upload your own photo.
          </p>
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              setVariant((v) => (v + 1) % 24);
              setUseDefault(true);
            }}
          >
            Try another avatar
          </button>
        </div>
      </div>
      <input name="avatarVariant" type="hidden" value={variant} />
      <input name="useDefault" type="hidden" value={String(useDefault)} />
      <label>
        Upload a photo{" "}
        <small>
          Optional · PNG, JPEG, or WebP · up to 3 MB. Applied when you save.
        </small>
        <input
          name="photo"
          type="file"
          accept="image/png,image/jpeg,image/webp"
        />
      </label>
      <label>
        Display name
        <input
          name="fullName"
          defaultValue={profile.full_name}
          minLength={2}
          maxLength={80}
          autoComplete="name"
          required
        />
      </label>
      <label>
        Handle
        <input
          name="username"
          defaultValue={profile.username}
          minLength={3}
          maxLength={40}
          pattern="[a-zA-Z0-9_]{3,40}"
          autoComplete="username"
          required
        />
        <small>Unique · 3–40 letters, numbers, or underscores.</small>
      </label>
      <label>
        About you
        <textarea
          name="bio"
          rows={4}
          maxLength={500}
          defaultValue={profile.bio}
          placeholder="What are you learning, building, or happy to help with?"
        />
      </label>
      <p className="muted public-note">
        Your name, handle, bio, and picture are public. Your session history and
        account email stay private.
      </p>
    </ActionForm>
  );
}
