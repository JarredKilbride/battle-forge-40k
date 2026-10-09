import type { ReactNode } from "react";

export function Help({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="help">
      <summary>
        {title}
        <span aria-hidden>+</span>
      </summary>
      <div>{children}</div>
    </details>
  );
}
