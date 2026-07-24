import type { AnchorHTMLAttributes, ReactNode } from "react";
import type { ButtonVariant } from "@/content/types";

interface ButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant: ButtonVariant;
  href: string;
  external?: boolean;
  children: ReactNode;
}

export default function Button({
  variant,
  href,
  external,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <a
      href={href}
      className={["btn", `btn-${variant}`, className].filter(Boolean).join(" ")}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      {...rest}
    >
      {children}
    </a>
  );
}
