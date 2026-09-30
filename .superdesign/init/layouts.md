# Shared Layouts

## RootLayout

- Source: `src/app/layout.tsx`
- Description: Required Next.js root document wrapper. It currently provides metadata, language, and global styles only; the approved application shell has not been ported yet.

```tsx
import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Web Study",
  description: "A private study workspace.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```
