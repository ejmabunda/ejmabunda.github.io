import { site } from "@/content/site";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="wrap flex flex-wrap justify-between gap-2 border-t border-divider pt-[28px] pb-[40px] text-[13px] opacity-70">
      <div>© {year} Matimu Mabunda</div>
      <div>
        {site.location} · {site.email}
      </div>
    </footer>
  );
}
