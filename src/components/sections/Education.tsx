import Eyebrow from "@/components/ui/Eyebrow";
import { education } from "@/content/education";

export default function Education() {
  return (
    <section className="wrap pt-10 pb-12">
      <Eyebrow>Education</Eyebrow>
      <div className="flex flex-col gap-[10px] text-sm">
        {education.map((entry) => (
          <div key={entry.label} className="flex flex-wrap gap-[10px]">
            <strong className="font-semibold">{entry.label}</strong>
            <span className="text-muted">{entry.meta}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
