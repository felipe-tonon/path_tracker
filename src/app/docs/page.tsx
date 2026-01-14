"use client";

import Image from "next/image";
import Link from "next/link";

const screenshots = [
  {
    src: "/images/promo/01-overview.png",
    alt: "Overview dashboard",
    caption: "Monitor requests, cost, latency, and error rate at a glance.",
  },
  {
    src: "/images/promo/02-logs-list.png",
    alt: "Logs list",
    caption: "Filterable request logs with clickable user and request IDs.",
  },
  {
    src: "/images/promo/07-metrics.png",
    alt: "Metrics dashboard",
    caption: "Aggregated metrics with latency percentiles and cost tracking.",
  },
];

export default function DocsLanding() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-6 py-12 md:py-16">
        <div className="flex flex-col gap-3">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">
            Path Tracker
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Observe your distributed system in minutes
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl">
            Track REST and LLM requests across services, visualize request paths, and monitor
            costs, latency, and errors—all in one lightweight dashboard.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/sign-in"
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
            >
              Try the dashboard
            </Link>
            <a
              href="https://github.com/felipe-tonon/path_tracker/blob/main/docs/UI_GUIDE.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-muted transition"
            >
              View UI Guide
            </a>
          </div>
        </div>

        <div className="mt-10 grid gap-8 md:mt-14">
          {screenshots.map((shot) => (
            <div
              key={shot.src}
              className="overflow-hidden rounded-lg border border-border bg-card shadow-sm"
            >
              <div className="relative h-[320px] w-full bg-muted">
                <Image
                  src={shot.src}
                  alt={shot.alt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 900px"
                  priority
                />
              </div>
              <div className="p-4 text-sm text-muted-foreground">{shot.caption}</div>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-lg border border-border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold">What you get</h2>
          <ul className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <li>• Request paths across services (REST + LLM)</li>
            <li>• Filterable logs with per-user and per-request drill downs</li>
            <li>• Request/response body capture (configurable)</li>
            <li>• Metrics with latency percentiles and cost tracking</li>
            <li>• Per-user analytics (requests, tokens, spend)</li>
            <li>• API key management and tenant settings</li>
          </ul>
        </div>

        <div className="mt-8 rounded-lg border border-border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Perfect for</h2>
          <ul className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <li>✅ Debugging distributed request flows</li>
            <li>✅ LLM cost tracking and optimization</li>
            <li>✅ Performance analysis and optimization</li>
            <li>✅ User behavior analytics</li>
            <li>✅ Error tracking and root cause analysis</li>
            <li>✅ Compliance and audit trails</li>
          </ul>
        </div>

        <div className="mt-10 flex flex-wrap gap-3 text-sm">
          <a 
            href="https://github.com/felipe-tonon/path_tracker/blob/main/docs/UI_GUIDE.md" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-primary hover:underline"
          >
            Read the full UI Guide
          </a>
          <span className="text-muted-foreground">•</span>
          <a 
            href="https://github.com/felipe-tonon/path_tracker/blob/main/docs/API_DOCUMENTATION.md" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-primary hover:underline"
          >
            API docs
          </a>
          <span className="text-muted-foreground">•</span>
          <a 
            href="https://github.com/felipe-tonon/path_tracker" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-primary hover:underline"
          >
            GitHub
          </a>
        </div>
      </div>
    </div>
  );
}
