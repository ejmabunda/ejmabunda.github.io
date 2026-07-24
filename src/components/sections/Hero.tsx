import Image from "next/image";
import Button from "@/components/ui/Button";
import { profile } from "@/content/profile";

export default function Hero() {
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
        <h1 className="text-[48px]/[1.05]">{profile.name}</h1>
        <h3 className="mb-5 font-normal text-accent-700">
          {profile.subtitle}
        </h3>
        <p className="max-w-[600px] text-[17px] opacity-85">{profile.bio}</p>
        <div className="flex flex-wrap gap-3">
          {profile.heroCtas.map((cta) => (
            <Button
              key={cta.label}
              variant={cta.variant}
              href={cta.href}
              external={cta.external}
            >
              {cta.label}
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}
