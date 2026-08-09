import Button from "@/components/ui/Button";
import ThemeToggle from "./ThemeToggle";
import MobileMenu from "./MobileMenu";
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
        <Button
          variant="primary"
          href={`mailto:${site.email}`}
          className="nav-cta-desktop"
        >
          get in touch
        </Button>
        <ThemeToggle />
        <MobileMenu />
      </nav>
    </div>
  );
}
