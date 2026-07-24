import Tag from "@/components/ui/Tag";
import Eyebrow from "@/components/ui/Eyebrow";
import { skills } from "@/content/skills";

export default function Skills() {
  return (
    <section id="skills" className="wrap pt-10 pb-10">
      <Eyebrow>Core skills</Eyebrow>
      <div className="flex flex-col gap-[14px]">
        {skills.map((group) => (
          <div key={group.label} className="skill-row">
            <div className="skill-label">{group.label}</div>
            <div className="skill-tags">
              {group.items.map((item) => (
                <Tag key={item} tone={group.tone}>
                  {item}
                </Tag>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
