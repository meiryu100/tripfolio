"use client";

import { Camera } from "lucide-react";
import { useRef } from "react";
import { Avatar, Spinner } from "./ui";

/** Shows the current avatar and hands a chosen file to the caller. */
export function AvatarPicker({
  url,
  name,
  busy,
  onPick,
  onRemove,
}: {
  url: string | null;
  name: { id?: string; firstName: string; lastName: string };
  busy?: boolean;
  onPick: (file: File) => void;
  onRemove?: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-4">
      <button type="button" onClick={() => input.current?.click()} className="group relative rounded-full" aria-label="Choose profile photo">
        <Avatar user={{ id: name.id ?? name.firstName + name.lastName, firstName: name.firstName || "?", lastName: name.lastName, avatarUrl: url }} size={80} />
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/35 text-white opacity-0 transition duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
          <Camera className="size-5" aria-hidden />
        </span>
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/35">
            <Spinner className="text-white" label="Uploading" />
          </span>
        )}
      </button>
      <div className="text-sm">
        <button type="button" className="min-h-11 font-semibold text-brand hover:underline" onClick={() => input.current?.click()}>
          {url ? "Change photo" : "Add profile photo"}
        </button>
        {url && onRemove && (
          <button type="button" className="ml-3 min-h-11 text-muted hover:text-danger" onClick={onRemove}>
            Remove
          </button>
        )}
        <p className="text-muted">JPEG, PNG, WebP or HEIC · up to 15 MB</p>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*,.heic,.heif"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
