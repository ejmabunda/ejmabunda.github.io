import Eyebrow from "@/components/ui/Eyebrow";
import TimelineEntry from "./TimelineEntry";
import { experience } from "@/content/experience";

export default function Experience() {
  return (
    <section id="exp" className="wrap pt-10 pb-10">
      <Eyebrow>Experience</Eyebrow>
      <div className="flex flex-col">
        {experience.map((entry, index) => (
          <TimelineEntry
            key={`${entry.org}-${entry.role}`}
            {...entry}
            isLast={index === experience.length - 1}
          />
        ))}
      </div>
    </section>
  );
}
