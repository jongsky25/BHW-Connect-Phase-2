import registry from '@/lib/elearning/ai-visual-registry.json';

type VisualRecord = {sha256: string; videos?: Record<string, string>};

/** Exact, reviewed asset identities only. Unclassified media stays unlabelled. */
export function AiVisualLabel({path, contentHash, video, en}: {
  path: string; contentHash?: string; video?: {path: string; content_hash: string}; en: boolean;
}) {
  const record = Object.hasOwn(registry, path) ? (registry as Record<string, VisualRecord>)[path] : undefined;
  if (!record || (contentHash !== undefined && contentHash !== record.sha256)) return null;
  if (video && record.videos?.[video.path] !== video.content_hash) return null;
  const text = video
    ? en ? 'Includes AI-generated illustrations' : 'May mga ilustrasyong ginawa gamit ang AI'
    : en ? 'AI-generated illustration' : 'Ilustrasyong ginawa gamit ang AI';
  return <span lang={en ? 'en' : 'fil'} data-ai-visual-label className="mt-1 block w-fit max-w-full rounded bg-canvas px-2 py-1 text-sm font-medium text-ink">{text}</span>;
}
