import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
import type { ImgHTMLAttributes } from "react";

// Node's own experimental `localStorage` global (warns/returns undefined
// without --localstorage-file) shadows jsdom's real Storage implementation
// in this environment. Force a working in-memory Storage for tests.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear() {
    this.store.clear();
  }
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
}

for (const target of [globalThis, window] as const) {
  Object.defineProperty(target, "localStorage", {
    value: new MemoryStorage(),
    writable: true,
    configurable: true,
  });
}

// jsdom doesn't implement matchMedia; ThemeToggle uses it to resolve/watch
// the OS color-scheme preference for "system" mode. Default to "not dark".
for (const target of [globalThis, window] as const) {
  Object.defineProperty(target, "matchMedia", {
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
    writable: true,
    configurable: true,
  });
}

// next/image needs a real Next.js server/build pipeline to optimize images;
// under Vitest it's swapped for a plain <img> so components using it are
// still smoke-testable.
vi.mock("next/image", () => ({
  __esModule: true,
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- test-only stub, alt is passed through via props
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}));
