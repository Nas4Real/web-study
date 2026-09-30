# Routes

## `/`

- Entry: `src/app/page.tsx`
- Layout: `src/app/layout.tsx`
- Current rendering: minimal verified foundation page; it is not an approved product screen.

```tsx
export default function HomePage() {
  return (
    <main className="min-h-screen">
      <h1>Web Study</h1>
      <p>Application foundation is ready.</p>
    </main>
  );
}
```

No other application routes exist yet.
