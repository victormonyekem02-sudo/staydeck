import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <p className="font-mono text-sm text-muted">404</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">Page not found</h1>
        <Link href="/" className="mt-6 inline-block text-sm text-accent hover:underline">Go home</Link>
      </div>
    </main>
  );
}
