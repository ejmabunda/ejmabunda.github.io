import Button from "@/components/ui/Button";
import ThemeToggle from "./ThemeToggle";
import { site } from "@/content/site";

export default function Nav() {
  return (
    <div className="nav-sticky">
      <nav className="nav wrap">
        <span className="nav-brand">{site.brand}</span>
        {site.navLinks.map((link) => (
          <a key={link.href} href={link.href} className="nav-links-desktop">
            {link.label}
          </a>
        ))}
        <Button variant="primary" href={`mailto:${site.email}`}>
          get in touch
        </Button>
        <ThemeToggle />
      </nav>
      <div className="nav-mobile-row wrap">
        {site.navLinks.map((link) => (
          <a key={link.href} href={link.href} className="nav-chip">
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}
