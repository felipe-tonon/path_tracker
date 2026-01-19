import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Path Tracker - Lightweight observability for distributed systems',
  description:
    'Track REST and LLM requests across services, visualize request paths, and monitor costs, latency, and errors—all in one lightweight dashboard.',
  openGraph: {
    title: 'Path Tracker - Lightweight observability for distributed systems',
    description:
      'Track REST and LLM requests across services, visualize request paths, and monitor costs, latency, and errors—all in one lightweight dashboard.',
    images: [
      {
        url: '/images/promo/01-overview.png',
        width: 1200,
        height: 630,
        alt: 'Path Tracker Overview Dashboard',
      },
    ],
    siteName: 'Path Tracker by Pathwave.io',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Path Tracker - Lightweight observability for distributed systems',
    description:
      'Track REST and LLM requests across services, visualize request paths, and monitor costs, latency, and errors—all in one lightweight dashboard.',
    images: ['/images/promo/01-overview.png'],
  },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
