// Collapsible "thinking" block — animated cognition display
import { Suspense, lazy, useState, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, Brain } from 'lucide-react';
import { PanelErrorBoundary } from '../PanelErrorBoundary';

const MessageMarkdown = lazy(() =>
  import('../MessageMarkdown').then((module) => ({ default: module.MessageMarkdown }))
);

// Render **bold** markers in thinking preview text.
function renderThinkingPreview(raw: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      parts.push(raw.slice(lastIndex, match.index));
    }
    parts.push(
      <strong key={key++} className="font-semibold not-italic">
        {match[1]}
      </strong>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < raw.length) {
    parts.push(raw.slice(lastIndex));
  }
  return parts;
}

// Animated thinking label — cycles through contextual verbs
const THINKING_LABELS = ['thinking', 'analyzing', 'reasoning', 'synthesizing', 'mapping'];
function ThinkingLabel({ isStreaming }: { isStreaming: boolean }) {
  const { t } = useTranslation();
  const [idx, setIdx] = useState(0);

  // Cycle through labels every 3s for temporal feel
  useState(() => {
    if (!isStreaming) return;
    const interval = setInterval(() => {
      setIdx(i => (i + 1) % THINKING_LABELS.length);
    }, 3000);
    return () => clearInterval(interval);
  });

  const label = isStreaming
    ? THINKING_LABELS[idx]
    : t('messageCard.thinking');

  return <span>{label}</span>;
}

interface ThinkingBlockProps {
  block: { type: 'thinking'; thinking: string };
  depth?: number;
  isStreaming?: boolean;
}

export const ThinkingBlock = memo(function ThinkingBlock({ block, depth = 0, isStreaming }: ThinkingBlockProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const text = block.thinking || '';
  if (!text) return null;

  // Depth-based color theming
  const depthConfigs = [
    { accent: '#a884d0', glow: 'rgba(168,132,208,0.12)', border: 'rgba(168,132,208,0.18)' },
    { accent: '#06b6d4', glow: 'rgba(6,182,212,0.1)', border: 'rgba(6,182,212,0.15)' },
    { accent: '#22c55e', glow: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.12)' },
  ];
  const cfg = depthConfigs[Math.min(depth, depthConfigs.length - 1)];

  // Preview: first ~80 chars, clean up broken ** markers from truncation
  let preview = text.length > 80 ? text.substring(0, 77) + '…' : text;
  preview = preview.replace(/\*{1,2}(?:\.{3})?$/, (m) => {
    return m.endsWith('…') ? '…' : '';
  });
  const previewNodes = renderThinkingPreview(preview);

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-300"
      style={{
        background: expanded
          ? `linear-gradient(135deg, ${cfg.glow} 0%, rgba(0,0,0,0.15) 100%)`
          : 'rgba(255,255,255,0.02)',
        border: `1px solid ${expanded ? cfg.border : 'rgba(255,255,255,0.05)'}`,
        boxShadow: expanded
          ? `0 0 20px ${cfg.glow}, 0 4px 16px rgba(0,0,0,0.3)`
          : '0 1px 4px rgba(0,0,0,0.2)',
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/[0.02] transition-colors"
      >
        {/* Animated brain icon */}
        <div className="flex-shrink-0 relative">
          <Brain
            className="w-3.5 h-3.5 transition-colors duration-300"
            style={{ color: expanded ? cfg.accent : 'rgba(255,255,255,0.3)' }}
          />
          {/* Subtle pulse ring when expanded */}
          {expanded && (
            <div
              className="absolute inset-0 rounded-full animate-orb-pulse"
              style={{ background: `${cfg.accent}20` }}
            />
          )}
        </div>

        {/* Thinking label with cycling verb when streaming */}
        <span
          className="text-[11.5px] font-medium flex-shrink-0 transition-colors duration-200"
          style={{ color: expanded ? cfg.accent : 'rgba(255,255,255,0.35)' }}
        >
          {isStreaming
            ? <ThinkingLabel isStreaming={isStreaming} />
            : t('messageCard.thinking')
          }
        </span>

        {!expanded && (
          <>
            {/* Preview text */}
            <span className="text-[11px] text-text-muted/50 truncate flex-1 min-w-0 italic font-light">
              {previewNodes}
            </span>

            {/* Streaming indicator — animated cognition dots */}
            {isStreaming && (
              <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
                <span className="w-1 h-1 rounded-full" style={{ background: `${cfg.accent}60` }} />
                <span className="w-1 h-1 rounded-full" style={{ background: `${cfg.accent}40` }} />
                <span className="w-1 h-1 rounded-full" style={{ background: `${cfg.accent}25` }} />
              </div>
            )}
          </>
        )}

        {/* Animated expand chevron */}
        <div className="flex-shrink-0 ml-auto">
          {expanded ? (
            <ChevronDown
              className="w-3.5 h-3.5 transition-colors duration-200"
              style={{ color: `${cfg.accent}80` }}
            />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-text-muted/40" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div
          className="animate-panel-enter"
          style={{ borderTop: `1px solid ${cfg.border}40` }}
        >
          {/* Animated cognition progress bar */}
          {isStreaming && (
            <div className="h-[2px] w-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.03)' }}
            >
              <div
                className="h-full cognition-bar"
                style={{ width: '60%' }}
              />
            </div>
          )}

          <div className="px-4 py-3.5">
            <div
              className="text-[13px] leading-relaxed prose-chat max-w-none"
              style={{ color: 'rgba(255,255,255,0.6)' }}
            >
              <PanelErrorBoundary
                name="ThinkingMarkdown"
                fallback={<div className="whitespace-pre-wrap font-light">{text}</div>}
              >
                <Suspense fallback={<div className="whitespace-pre-wrap font-light">{text}</div>}>
                  <MessageMarkdown normalizedText={text} />
                </Suspense>
              </PanelErrorBoundary>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
