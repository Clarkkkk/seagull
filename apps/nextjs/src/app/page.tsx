export default function HomePage() {
  return (
    <main className="container h-screen py-16">
      <div className="flex flex-col items-center justify-center gap-4">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
          Seagull
        </h1>
        <p className="text-muted-foreground max-w-xl text-center">
          Next.js is frontend-only in this repo. The API server runs separately
          (Fastify on port 4000).
        </p>
      </div>
    </main>
  );
}
