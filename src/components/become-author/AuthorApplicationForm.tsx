"use client";

import { useActionState } from "react";
import {
  submitAuthorApplication,
  type AuthorApplicationActionResult,
} from "@/actions/author-applications";
import { Button } from "@/components/ui/button";

interface AuthorApplicationFormProps {
  defaultDisplayName?: string | null;
  email?: string | null;
}

const inputClass =
  "flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:opacity-50";

const textareaClass = `${inputClass} min-h-[140px] resize-y font-[family-name:var(--font-bengali)] text-[1rem] leading-[1.85]`;

const labelClass =
  "block text-sm font-medium text-foreground mb-1.5 font-[family-name:var(--font-bengali)]";

const socialLinkRows = [
  { index: 0, required: true },
  { index: 1, required: false },
  { index: 2, required: false },
];

export function AuthorApplicationForm({
  defaultDisplayName,
  email,
}: AuthorApplicationFormProps) {
  const initialState: AuthorApplicationActionResult = { success: false };
  const [state, formAction, isPending] = useActionState(
    submitAuthorApplication,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.message && (
        <div
          role="status"
          className="rounded-lg border border-brand/30 bg-brand/10 px-4 py-3 text-sm font-medium text-brand font-[family-name:var(--font-bengali)]"
        >
          {state.message}
        </div>
      )}

      {state.error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive font-[family-name:var(--font-bengali)]"
        >
          {state.error}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="displayName" className={labelClass}>
            লেখক হিসেবে নাম <span className="text-destructive">*</span>
          </label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            required
            defaultValue={defaultDisplayName ?? ""}
            className={`${inputClass} font-[family-name:var(--font-bengali)] text-base`}
            aria-describedby={
              state.fieldErrors?.displayName ? "displayName-error" : undefined
            }
          />
          {state.fieldErrors?.displayName && (
            <p
              id="displayName-error"
              className="mt-1 text-xs text-destructive font-[family-name:var(--font-bengali)]"
            >
              {state.fieldErrors.displayName[0]}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="applicationEmail" className={labelClass}>
            ইমেইল
          </label>
          <input
            id="applicationEmail"
            type="email"
            value={email ?? ""}
            readOnly
            aria-readonly="true"
            className={`${inputClass} bg-muted/40 text-muted-foreground`}
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="phone" className={labelClass}>
            ফোন নম্বর <span className="text-destructive">*</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            className={`${inputClass} font-[family-name:var(--font-bengali)] text-base`}
            aria-describedby={state.fieldErrors?.phone ? "phone-error" : undefined}
          />
          {state.fieldErrors?.phone && (
            <p
              id="phone-error"
              className="mt-1 text-xs text-destructive font-[family-name:var(--font-bengali)]"
            >
              {state.fieldErrors.phone[0]}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="occupation" className={labelClass}>
            পেশা <span className="text-destructive">*</span>
          </label>
          <input
            id="occupation"
            name="occupation"
            type="text"
            required
            className={`${inputClass} font-[family-name:var(--font-bengali)] text-base`}
            aria-describedby={
              state.fieldErrors?.occupation ? "occupation-error" : undefined
            }
          />
          {state.fieldErrors?.occupation && (
            <p
              id="occupation-error"
              className="mt-1 text-xs text-destructive font-[family-name:var(--font-bengali)]"
            >
              {state.fieldErrors.occupation[0]}
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="address" className={labelClass}>
          ঠিকানা <span className="text-destructive">*</span>
        </label>
        <textarea
          id="address"
          name="address"
          required
          className={`${textareaClass} min-h-[96px]`}
          aria-describedby={state.fieldErrors?.address ? "address-error" : undefined}
        />
        {state.fieldErrors?.address && (
          <p
            id="address-error"
            className="mt-1 text-xs text-destructive font-[family-name:var(--font-bengali)]"
          >
            {state.fieldErrors.address[0]}
          </p>
        )}
      </div>

      <fieldset className="space-y-3">
        <legend className={labelClass}>
          সামাজিক মাধ্যমের লিংক <span className="text-destructive">*</span>
        </legend>
        <div className="space-y-3">
          {socialLinkRows.map(({ index, required }) => (
            <div key={index} className="grid gap-3 sm:grid-cols-[1fr_2fr]">
              <div>
                <label
                  htmlFor={`socialPlatform-${index}`}
                  className="sr-only"
                >
                  প্ল্যাটফর্ম
                </label>
                <input
                  id={`socialPlatform-${index}`}
                  name="socialPlatform"
                  type="text"
                  required={required}
                  placeholder="প্ল্যাটফর্ম"
                  className={`${inputClass} font-[family-name:var(--font-bengali)] text-base`}
                  aria-describedby={
                    state.fieldErrors?.socialLinks
                      ? "socialLinks-error"
                      : undefined
                  }
                />
              </div>
              <div>
                <label htmlFor={`socialUrl-${index}`} className="sr-only">
                  URL
                </label>
                <input
                  id={`socialUrl-${index}`}
                  name="socialUrl"
                  type="url"
                  required={required}
                  placeholder="https://example.com/your-profile"
                  className={inputClass}
                  aria-describedby={
                    state.fieldErrors?.socialLinks
                      ? "socialLinks-error"
                      : undefined
                  }
                />
              </div>
            </div>
          ))}
        </div>
        {state.fieldErrors?.socialLinks && (
          <p
            id="socialLinks-error"
            className="mt-1 text-xs text-destructive font-[family-name:var(--font-bengali)]"
          >
            {state.fieldErrors.socialLinks[0]}
          </p>
        )}
      </fieldset>

      <div>
        <label htmlFor="bio" className={labelClass}>
          নিজের সম্পর্কে সংক্ষিপ্ত পরিচিতি{" "}
          <span className="text-destructive">*</span>
        </label>
        <textarea
          id="bio"
          name="bio"
          required
          className={textareaClass}
          aria-describedby={state.fieldErrors?.bio ? "bio-error" : undefined}
        />
        {state.fieldErrors?.bio && (
          <p
            id="bio-error"
            className="mt-1 text-xs text-destructive font-[family-name:var(--font-bengali)]"
          >
            {state.fieldErrors.bio[0]}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="reason" className={labelClass}>
          কেন Pustoka-তে লিখতে চান{" "}
          <span className="text-destructive">*</span>
        </label>
        <textarea
          id="reason"
          name="reason"
          required
          className={textareaClass}
          aria-describedby={
            state.fieldErrors?.reason ? "reason-error" : undefined
          }
        />
        {state.fieldErrors?.reason && (
          <p
            id="reason-error"
            className="mt-1 text-xs text-destructive font-[family-name:var(--font-bengali)]"
          >
            {state.fieldErrors.reason[0]}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isPending || state.success}
        className="w-fit font-[family-name:var(--font-bengali)]"
      >
        {isPending ? "জমা হচ্ছে..." : "আবেদন জমা দিন"}
      </Button>
    </form>
  );
}
