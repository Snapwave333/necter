// MessageCard — top-level chat message renderer.
// Delegates block rendering to ContentBlockView and its sub-components.
import { useState, memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check, Clock, XCircle } from 'lucide-react';
import type { Message, ContentBlock, ToolUseContent, ToolResultContent } from '../types';
import { ContentBlockView } from './message/ContentBlockView';

interface MessageCardProps {
  message: Message;
  isStreaming?: boolean;
}

export const MessageCard = memo(function MessageCard({ message, isStreaming }: MessageCardProps) {
  const { t } = useTranslation();
  const isUser = message.role === 'user';
  const isQueued = message.localStatus === 'queued';
  const isCancelled = message.localStatus === 'cancelled';
  const rawContent = message.content as unknown;
  const contentBlocks = Array.isArray(rawContent)
    ? (rawContent as ContentBlock[])
    : [{ type: 'text', text: String(rawContent ?? '') } as ContentBlock];
  const [copied, setCopied] = useState(false);

  // Build a set of tool_result IDs that have a matching tool_use (for merging)
  const mergedResultIds = useMemo(() => {
    const ids = new Set<string>();
    for (const b of contentBlocks) {
      if (b.type === 'tool_use') {
        const tu = b as ToolUseContent;
        const result = contentBlocks.find(
          (r) => r.type === 'tool_result' && (r as ToolResultContent).toolUseId === tu.id
        );
        if (result) ids.add((result as ToolResultContent).toolUseId);
      }
    }
    return ids;
  }, [contentBlocks]);

  // Extract text content for copying
  const getTextContent = () =>
    contentBlocks
      .filter((block) => block.type === 'text')
      .map((block) => (block as { type: 'text'; text: string }).text)
      .join('\n');

  const handleCopy = async () => {
    const text = getTextContent();
    if (text) {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Clipboard unavailable
      }
    }
  };

  return (
    <div className="animate-message-enter">
      {isUser ? (
        // User message - compact styling with smaller padding and radius
        <div className="flex items-start gap-2 justify-end group">
          <div
            className={`message-user px-4 py-3 rounded-[1.65rem] max-w-[80%] min-w-0 break-words !border-0 ${
              isQueued ? 'opacity-70 border-dashed border-border' : ''
            } ${isCancelled ? 'opacity-60' : ''}`}
          >
            {isQueued && (
              <div className="mb-1 flex items-center gap-1 text-[11px] text-text-muted">
                <Clock className="w-3 h-3" />
                <span>{t('messageCard.queued')}</span>
              </div>
            )}
            {isCancelled && (
              <div className="mb-1 flex items-center gap-1 text-[11px] text-text-muted">
                <XCircle className="w-3 h-3" />
                <span>{t('messageCard.cancelled')}</span>
              </div>
            )}
            {contentBlocks.length === 0 ? (
              <span className="text-text-muted italic">{t('messageCard.emptyMessage')}</span>
            ) : (
              contentBlocks.map((block, index) => (
                <ContentBlockView
                  key={
                    'id' in block ? (block as { id: string }).id : `block-${block.type}-${index}`
                  }
                  block={block}
                  isUser={isUser}
                  isStreaming={isStreaming}
                />
              ))
            )}
          </div>
          <button
            onClick={handleCopy}
            className="mt-2 w-6 h-6 flex items-center justify-center rounded-lg bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
            style={{ boxShadow: 'var(--depth-1)' }}
            title={t('messageCard.copyMessage')}
          >
            {copied ? (
              <Check className="w-3 h-3 text-success" />
            ) : (
              <Copy className="w-3 h-3 text-text-muted" />
            )}
          </button>
        </div>
      ) : (
        // Assistant message — no bubble, direct content (Claude style)
        <div className="message-assistant space-y-1.5">
          {contentBlocks.map((block, index) => {
            // Skip tool_result blocks that are merged into their tool_use card
            if (
              block.type === 'tool_result' &&
              mergedResultIds.has((block as ToolResultContent).toolUseId)
            ) {
              return null;
            }
            return (
              <ContentBlockView
                key={'id' in block ? (block as { id: string }).id : `block-${block.type}-${index}`}
                block={block}
                isUser={isUser}
                isStreaming={isStreaming}
                allBlocks={contentBlocks}
                message={message}
              />
            );
          })}
          {isStreaming && (
            <div className="flex items-center gap-1 py-2">
              <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-streaming-dot-1" />
              <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-streaming-dot-2" />
              <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-streaming-dot-3" />
            </div>
          )}
        </div>
      )}
    </div>
  );
});
