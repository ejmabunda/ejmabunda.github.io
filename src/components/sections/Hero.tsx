"use client";

import Image from "next/image";
import Button from "@/components/ui/Button";
import ResumePreview from "@/components/ui/ResumePreview";
import Skeleton from "@/components/ui/Skeleton";
import { profile } from "@/content/profile";
import { useProfile } from "@/hooks/useProfile";

export default function Hero() {
  const profileState = useProfile();

  return (
    <section
      id="about"
      className="wrap flex items-start gap-12 pt-6 pb-14 max-[720px]:pb-10"
    >
      <Image
        src={profile.photo.src}
        alt={profile.photo.alt}
        width={180}
        height={180}
        priority
        className="washed shrink-0 rounded-full object-cover shadow-md"
      />
      <div>
        {profileState.status === "loading" && (
          <div aria-busy="true" aria-label="Loading profile">
            <Skeleton height="50px" className="mb-3 w-[320px] max-w-full" />
            <Skeleton height="22px" className="mb-5 w-[280px] max-w-full" />
            <div className="max-w-[600px] space-y-2 mb-[var(--spacing-md)]">
              <Skeleton height="20px" className="w-full" />
              <Skeleton height="20px" className="w-[88%]" />
              <Skeleton height="20px" className="w-3/5" />
            </div>
          </div>
        )}

        {profileState.status === "error" && (
          <p role="alert" className="max-w-[600px] text-[17px] opacity-85">
            Couldn&apos;t load profile content. Please refresh the page to try
            again.
          </p>
        )}

        {profileState.status === "empty" && (
          <p className="max-w-[600px] text-[17px] opacity-85">
            Profile content isn&apos;t available right now.
          </p>
        )}

        {profileState.status === "success" && (
          <>
            <h1 className="text-[48px]/[1.05]">{profileState.data.title}</h1>
            <h3 className="mb-5 font-normal text-accent-700">
              {profileState.data.headline}
            </h3>
            <p className="max-w-[600px] text-[17px] opacity-85">
              {profileState.data.subtitle}
            </p>
          </>
        )}

        <div className="flex flex-wrap gap-3">
          {profile.heroCtas.map((cta) =>
            cta.kind === "preview" ? (
              <ResumePreview
                key={cta.label}
                label={cta.label}
                href={cta.href}
                variant={cta.variant}
              />
            ) : (
              <Button
                key={cta.label}
                variant={cta.variant}
                href={cta.href}
                external={cta.external}
              >
                {cta.label}
              </Button>
            )
          )}
        </div>
      </div>
    </section>
  );
}
