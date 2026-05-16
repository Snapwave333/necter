import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import { resolveArtifactPath } from '../utils/artifact-path';
import { extractFilePathFromToolInput, extractFilePathFromToolOutput } from '../utils/tool-output-path';
import { getArtifactLabel, getArtifactIconComponent, getArtifactSteps } from '../utils/artifact-steps';
import { useIPC } from '../hooks/useIPC';
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  FileText,
  FileSpreadsheet,
  FilePieChart,
  FileCode2,
  FileArchive,
  FileAudio2,
  FileVideo,
  Image as ImageIcon,
  FolderOpen,
  FolderSync,
  File,
  Check,
  Loader2,
  Plug,
  Wrench,
  MessageSquare,
  Cpu,
  Copy,
  Layers,
} from 'lucide-react';
import type { TraceStep, MCPServerInfo } from '../types';

const EMPTY_STEPS: TraceStep[] = [];

// ============================================================
// SVG Radial Gauge Component — AI cockpit style
// ============================================================
function RadialGauge({ percentage, size = 72, strokeWidth = 6 }: { percentage: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const getColor = (pct: number) => {
    if (pct > 95) return '#ef4444';
    if (pct > 80) return '#f59e0b';
    return '#06b6d4';
  };

  const color = getColor(percentage);
  const trackColor = percentage > 80
    ? 'rgba(255,255,255,0.06)'
    : 'rgba(255,255,255,0.04)';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Ambient glow ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius + strokeWidth}
          fill="none"
          stroke={color}
          strokeWidth={1}
          opacity={0.15}
        />
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
          style={{
            filter: `drop-shadow(0 0 6px ${color}60)`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs font-bold" style={{ color }}>{Math.round(percentage)}%</span>
      </div>
    </div>
  );
}

// ============================================================
// Artifact Card Component — glass + glow on hover
// ============================================================
function ArtifactCard({
  artifact,
  onClick,
  t,
  currentWorkingDir,
}: {
  artifact: { label: string; path: string };
  onClick: () => void;
  t: (key: string) => string;
  currentWorkingDir?: string;
}) {
  const label = artifact.label || t('context.fileCreated');
  const artifactPath = artifact.path;
  const canClick = Boolean(artifactPath && typeof window !== 'undefined' && !!window.electronAPI?.showItemInFolder);

  const iconComponent = getArtifactIconComponent(label);
  const IconComponent =
    iconComponent === 'presentation' ? FilePieChart
    : iconComponent === 'table' ? FileSpreadsheet
    : iconComponent === 'document' ? FileText
    : iconComponent === 'code' ? FileCode2
    : iconComponent === 'image' ? ImageIcon
    : iconComponent === 'audio' ? FileAudio2
    : iconComponent === 'video' ? FileVideo
    : iconComponent === 'archive' ? FileArchive
    : iconComponent === 'text' ? File
    : File;

  return (
    <button
      onClick={onClick}
      disabled={!canClick}
      className={`
        group relative flex flex-col items-center gap-2 p-3 rounded-2xl
        bg-[rgba(255,255,255,0.025)] border border-[rgba(255,255,255,0.05)]
        hover:bg-[rgba(255,255,255,0.05)] hover:border-accent/30
        transition-all duration-200 text-left w-full
        ${canClick ? 'cursor-pointer' : 'cursor-default opacity-50'}
      `}
      title={artifactPath || undefined}
    >
      {/* Subtle cyan glow on hover */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, rgba(6,182,212,0.06) 0%, transparent 70%)' }}
      />

      {/* Icon */}
      <div className="relative z-10 w-10 h-10 rounded-xl bg-[rgba(255,255,255,0.04)] flex items-center justify-center group-hover:bg-accent/10 transition-colors">
        <IconComponent className="w-5 h-5 text-text-muted group-hover:text-accent transition-colors" />
      </div>

      {/* Label */}
      <span className="relative z-10 text-[11px] text-text-secondary text-center leading-tight line-clamp-2 w-full group-hover:text-text-primary transition-colors">
        {label}
      </span>

      {/* Type badge */}
      {iconComponent && iconComponent !== 'text' && (
        <span className="absolute top-1.5 right-1.5 text-[9px] px-1 py-0.5 rounded bg-[rgba(255,255,255,0.04)] text-text-muted uppercase tracking-wide">
          {iconComponent.slice(0, 4)}
        </span>
      )}
    </button>
  );
}

// ============================================================
// Main Context Panel — AI Cockpit
// ============================================================
export function ContextPanel() {
  const { t } = useTranslation();
  const activeSessionId = useAppStore((s) => s.activeSessionId);
  const sessions = useAppStore((s) => s.sessions);
  const sessionStates = useAppStore((s) => s.sessionStates);
  const appConfig = useAppStore((s) => s.appConfig);
  const contextPanelCollapsed = useAppStore((s) => s.contextPanelCollapsed);
  const toggleContextPanel = useAppStore((s) => s.toggleContextPanel);
  const workingDir = useAppStore((s) => s.workingDir);
  const setGlobalNotice = useAppStore((s) => s.setGlobalNotice);
  const { getMCPServers, changeWorkingDir } = useIPC();
  const [artifactsOpen, setArtifactsOpen] = useState(true);
  const [expandedConnector, setExpandedConnector] = useState<string | null>(null);
  const [mcpServers, setMcpServers] = useState<MCPServerInfo[]>([]);
  const [copiedPath, setCopiedPath] = useState(false);
  const [isChangingDir, setIsChangingDir] = useState(false);
  const [recentWorkspaceFiles, setRecentWorkspaceFiles] = useState<Array<{
    path: string;
    modifiedAt: number;
    size: number;
  }>>([]);

  const handleCopyPath = async (path: string) => {
    try {
      let shellPath = path;
      if (path.includes(' ')) {
        const isWindows = window.electronAPI?.platform === 'win32';
        shellPath = isWindows ? `"${path}"` : path.replace(/ /g, '\\ ');
      }
      await navigator.clipboard.writeText(shellPath);
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 2000);
    } catch (err) {
      console.error('Failed to copy path:', err);
    }
  };

  const ss = activeSessionId ? sessionStates[activeSessionId] : undefined;
  const steps = ss?.traceSteps ?? EMPTY_STEPS;
  const activeSession = activeSessionId ? sessions.find(s => s.id === activeSessionId) : null;
  const currentWorkingDir = activeSession?.cwd || workingDir;
  const { displayArtifactSteps } = getArtifactSteps(steps);
  const canShowItemInFolder = typeof window !== 'undefined' && !!window.electronAPI?.showItemInFolder;

  // Session info computations
  const messages = useMemo(
    () => (activeSessionId ? sessionStates[activeSessionId]?.messages || [] : []),
    [activeSessionId, sessionStates]
  );
  const messageCount = messages.length;
  const toolCallCount = steps.filter((s) => s.type === 'tool_call').length;
  const modelName = activeSession?.model || appConfig?.model || '—';

  // Token usage aggregation
  const tokenUsage = useMemo(() => {
    let input = 0;
    let output = 0;
    for (const msg of messages) {
      if (msg.tokenUsage) {
        input += msg.tokenUsage.input || 0;
        output += msg.tokenUsage.output || 0;
      }
    }
    return { input, output, total: input + output };
  }, [messages]);

  // Context usage
  const contextUsage = useMemo(() => {
    const contextWindow = activeSessionId ? sessionStates[activeSessionId]?.contextWindow : undefined;
    if (!contextWindow) return null;

    let lastInput = 0;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].tokenUsage?.input) {
        lastInput = messages[i].tokenUsage!.input;
        break;
      }
    }
    if (lastInput === 0) return null;

    const percentage = Math.min((lastInput / contextWindow) * 100, 100);
    return { used: lastInput, total: contextWindow, percentage };
  }, [activeSessionId, sessionStates, messages]);

  const completedStepCount = useMemo(
    () => steps.reduce((n, s) => n + (s.status === 'completed' ? 1 : 0), 0),
    [steps]
  );

  useEffect(() => {
    if (contextPanelCollapsed) return;
    if (
      typeof window === 'undefined'
      || !window.electronAPI?.artifacts?.listRecentFiles
      || !currentWorkingDir
      || !activeSession?.createdAt
    ) {
      setRecentWorkspaceFiles([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const files = await window.electronAPI.artifacts.listRecentFiles(
          currentWorkingDir,
          activeSession.createdAt,
          50
        );
        if (!cancelled) setRecentWorkspaceFiles(files || []);
      } catch (error) {
        if (!cancelled) setRecentWorkspaceFiles([]);
      }
    }, 500);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [activeSession?.createdAt, activeSessionId, steps.length, completedStepCount, contextPanelCollapsed, currentWorkingDir]);

  const displayArtifacts = useMemo(() => {
    const seenPaths = new Set<string>();
    const items: Array<{ label: string; path: string }> = [];

    for (const step of displayArtifactSteps) {
      const fallbackPath = extractFilePathFromToolOutput(step.toolOutput)
        || extractFilePathFromToolInput(step.toolInput);
      if (!fallbackPath) continue;

      const resolvedPath = resolveArtifactPath(fallbackPath, currentWorkingDir);
      const key = resolvedPath.trim();
      if (!key || seenPaths.has(key)) continue;

      seenPaths.add(key);
      items.push({ label: getArtifactLabel(fallbackPath), path: resolvedPath });
    }

    for (const file of recentWorkspaceFiles) {
      const resolvedPath = resolveArtifactPath(file.path, currentWorkingDir);
      const key = resolvedPath.trim();
      if (!key || seenPaths.has(key)) continue;

      seenPaths.add(key);
      items.push({ label: getArtifactLabel(file.path), path: resolvedPath });
    }

    return items;
  }, [currentWorkingDir, displayArtifactSteps, recentWorkspaceFiles]);

  useEffect(() => {
    if (contextPanelCollapsed) return;
    const loadMCPServers = async () => {
      try {
        const servers = await getMCPServers();
        setMcpServers(servers || []);
      } catch (error) {
        console.error('Failed to load MCP servers:', error);
      }
    };
    loadMCPServers();
    const interval = setInterval(loadMCPServers, 30000);
    return () => clearInterval(interval);
  }, [contextPanelCollapsed, getMCPServers]);

  if (contextPanelCollapsed) {
    return (
      <div className="w-11 flex items-start justify-center pt-3 bg-[rgba(8,8,8,0.8)] backdrop-blur-2xl border-l border-[rgba(255,255,255,0.04)]">
        <button
          onClick={toggleContextPanel}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[rgba(255,255,255,0.06)] text-text-muted hover:text-text-primary transition-colors"
          title={t('context.expandPanel')}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-[22rem] flex flex-col overflow-hidden text-sm"
      style={{
        background: 'linear-gradient(180deg, rgba(8,8,12,0.92) 0%, rgba(6,6,10,0.95) 100%)',
        backdropFilter: 'blur(40px)',
        borderLeft: '1px solid rgba(255,255,255,0.05)',
        boxShadow: '-4px 0 40px rgba(0,0,0,0.4), inset 1px 0 0 rgba(255,255,255,0.03)',
      }}
    >
      {/* Atmospheric header */}
      <div className="px-4 h-14 flex items-center gap-3"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.025) 0%, transparent 100%)',
        }}
      >
        <button
          onClick={toggleContextPanel}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[rgba(255,255,255,0.06)] text-text-muted hover:text-text-primary transition-colors"
          title={t('context.collapsePanel')}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2.5">
          {/* Ambient pulse dot */}
          <div className="relative">
            <div className="w-2 h-2 rounded-full bg-accent" />
            <div className="absolute inset-0 w-2 h-2 rounded-full bg-accent animate-orb-pulse opacity-60" />
          </div>
          <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.1em]">
            {t('context.context')}
          </span>
        </div>
      </div>

      {/* Session Stats — AI cockpit card */}
      {activeSession && (
        <div className="px-4 py-4"
          style={{
            borderBottom: '1px solid rgba(255,255,255,0.04)',
            background: 'linear-gradient(180deg, rgba(6,182,212,0.03) 0%, transparent 100%)',
          }}
        >
          {/* Model card with glow */}
          <div className="flex items-center gap-3 p-3 rounded-2xl animate-glow-active"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(6,182,212,0.15)',
              boxShadow: '0 0 20px rgba(6,182,212,0.08), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: 'rgba(6,182,212,0.12)',
                boxShadow: '0 0 16px rgba(6,182,212,0.2)',
              }}
            >
              <Cpu className="w-5 h-5 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-text-primary truncate">{modelName}</div>
              <div className="flex items-center gap-3 text-[11px] text-text-muted mt-0.5">
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {messageCount}
                </span>
                <span className="flex items-center gap-1">
                  <Wrench className="w-3 h-3" />
                  {toolCallCount}
                </span>
              </div>
            </div>
          </div>
          {tokenUsage.total > 0 && (
            <div className="mt-2.5 px-1 text-[11px] text-text-muted">
              {t('context.inputTokens')} {formatTokenCount(tokenUsage.input)} · {t('context.outputTokens')} {formatTokenCount(tokenUsage.output)}
            </div>
          )}
        </div>
      )}

      {/* Context Usage — Radial + atmospheric */}
      {activeSession && contextUsage && (
        <div className="px-4 py-4"
          style={{
            borderBottom: '1px solid rgba(255,255,255,0.04)',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%)',
          }}
        >
          <div className="flex items-center gap-4">
            <RadialGauge percentage={contextUsage.percentage} size={76} strokeWidth={6} />
            <div className="flex-1">
              <div className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-1">
                {t('context.contextUsage')}
              </div>
              <p className="text-[11px] text-text-muted">
                {formatTokenCount(contextUsage.used)} / {formatTokenCount(contextUsage.total)}
              </p>
              {contextUsage.percentage > 80 && (
                <p className={`text-[11px] mt-1 ${contextUsage.percentage > 95 ? 'text-red-400' : 'text-amber-400'}`}>
                  {contextUsage.percentage > 95 ? '⚠ Critical' : '⚡ Getting full'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Artifacts Section */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <button
          onClick={() => setArtifactsOpen(!artifactsOpen)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-[rgba(255,255,255,0.02)] transition-colors"
        >
          <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
            {t('context.artifacts')}
          </span>
          {artifactsOpen ? (
            <ChevronUp className="w-4 h-4 text-text-muted" />
          ) : (
            <ChevronDown className="w-4 h-4 text-text-muted" />
          )}
        </button>

        {artifactsOpen && (
          <div className="pb-4 px-4">
            {displayArtifacts.length === 0 ? (
              <div className="flex items-center gap-2 py-4 text-[11px] text-text-muted">
                <Layers className="w-4 h-4 shrink-0 opacity-50" />
                <span>{t('context.noArtifactsYet')}</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {displayArtifacts.slice(0, 8).map((artifact, index) => {
                  const artifactPath = artifact.path;
                  const canClick = Boolean(artifactPath && canShowItemInFolder);

                  return (
                    <ArtifactCard
                      key={artifact.path || artifact.label || `artifact-${index}`}
                      artifact={artifact}
                      t={t}
                      currentWorkingDir={currentWorkingDir ?? undefined}
                      onClick={async () => {
                        if (!canClick || !artifactPath) return;
                        const revealed = await window.electronAPI.showItemInFolder(artifactPath, currentWorkingDir ?? undefined);
                        if (!revealed) {
                          setGlobalNotice({
                            id: `artifact-reveal-failed-${Date.now()}`,
                            type: 'warning',
                            message: t('context.revealFailed'),
                          });
                        }
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Working Directory */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="px-4 py-3">
          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
            {t('context.workingDirectory')}
          </p>
          <div className="flex items-center gap-2 min-w-0">
            <FolderOpen className="w-4 h-4 text-text-muted shrink-0" />
            <span
              className={`text-[11px] truncate flex-1 ${currentWorkingDir ? 'text-text-secondary cursor-pointer hover:text-accent transition-colors' : 'text-text-muted'}`}
              title={currentWorkingDir ? t('context.openInFileManager') : ''}
              onClick={() => currentWorkingDir && window.electronAPI?.showItemInFolder(currentWorkingDir)}
            >
              {currentWorkingDir ? formatPath(currentWorkingDir) : t('context.noFolderSelected')}
            </span>
            {currentWorkingDir && (
              <button
                onClick={() => handleCopyPath(currentWorkingDir)}
                className="text-text-muted hover:text-text-primary transition-colors shrink-0"
                title={t('context.copyPath')}
              >
                {copiedPath ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            )}
            <button
              onClick={async () => {
                setIsChangingDir(true);
                try {
                  const result = await changeWorkingDir(
                    activeSessionId || undefined,
                    currentWorkingDir || undefined
                  );
                  if (!result.success && result.error && result.error !== 'User cancelled') {
                    setGlobalNotice({
                      id: `change-dir-failed-${Date.now()}`,
                      type: 'warning',
                      message: `${t('context.changeDirFailed')}: ${result.error}`,
                    });
                  }
                } catch (error) {
                  setGlobalNotice({
                    id: `change-dir-failed-${Date.now()}`,
                    type: 'error',
                    message: error instanceof Error && error.message
                      ? `${t('context.changeDirFailed')}: ${error.message}`
                      : t('context.changeDirFailed'),
                  });
                } finally {
                  setIsChangingDir(false);
                }
              }}
              disabled={isChangingDir}
              className="text-text-muted hover:text-text-primary disabled:opacity-50 transition-colors shrink-0"
              title={t('context.changeDir')}
            >
              {isChangingDir ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FolderSync className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* MCP Connectors */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-3">
          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
            {t('context.mcpConnectors')}
          </p>
          {mcpServers.length === 0 ? (
            <div className="flex items-center gap-2 text-[11px] text-text-muted py-2">
              <Plug className="w-4 h-4 shrink-0 opacity-50" />
              <span>{t('mcp.noConnectors')}</span>
            </div>
          ) : (
            <div className="space-y-2">
              {mcpServers.map((server) => (
                <ConnectorItem
                  key={server.id}
                  server={server}
                  steps={steps}
                  expanded={expandedConnector === server.id}
                  onToggle={() =>
                    setExpandedConnector(expandedConnector === server.id ? null : server.id)
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Connector Item — atmospheric with glow accent
// ============================================================
function ConnectorItem({
  server,
  steps,
  expanded,
  onToggle
}: {
  server: MCPServerInfo;
  steps: TraceStep[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const serverNamePattern = server.name.replace(/\s+/g, '_');

  const mcpToolsUsed = steps
    .filter(s => s.toolName?.startsWith('mcp__'))
    .map(s => s.toolName!)
    .filter((name, index, self) => self.indexOf(name) === index)
    .filter(name => {
      const match = name.match(/^mcp__(.+?)__(.+)$/);
      return match ? match[1] === serverNamePattern : false;
    });

  const usageCount = steps.filter(s =>
    s.toolName?.startsWith('mcp__') && mcpToolsUsed.includes(s.toolName)
  ).length;

  const isConnected = server.connected;

  return (
    <div className={`
      relative rounded-2xl overflow-hidden transition-all duration-300
      ${isConnected
        ? 'bg-[rgba(6,182,212,0.04)] border border-[rgba(6,182,212,0.15)]'
        : 'bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]'
      }
    `}>
      {/* Left accent line for connected */}
      {isConnected && (
        <div className="absolute left-0 top-0 bottom-0 w-[2px]"
          style={{
            background: 'linear-gradient(180deg, rgba(6,182,212,0.8) 0%, rgba(6,182,212,0.3) 100%)',
            boxShadow: '0 0 8px rgba(6,182,212,0.4)',
          }}
        />
      )}

      <button
        onClick={onToggle}
        className="w-full pl-4 pr-3 py-2.5 flex items-center gap-3 hover:bg-[rgba(255,255,255,0.03)] transition-colors"
      >
        {/* Glow icon */}
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
          isConnected
            ? 'bg-[rgba(6,182,212,0.12)]'
            : 'bg-[rgba(255,255,255,0.04)]'
        }`}>
          <Plug className={`w-4 h-4 ${isConnected ? 'text-accent' : 'text-text-muted'}`} />
        </div>

        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-text-primary truncate">
              {server.name}
            </span>
            {isConnected && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
              </span>
            )}
            {!isConnected && (
              <span className="text-[10px] text-text-muted">({t('mcp.notConnected')})</span>
            )}
          </div>
          {isConnected && (
            <p className="text-[11px] text-text-muted">
              {t('mcp.toolCount', { count: server.toolCount })}
              {usageCount > 0 && ` · ${t('mcp.callCount', { count: usageCount })}`}
            </p>
          )}
        </div>

        {isConnected && (
          expanded ? (
            <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
          )
        )}
      </button>

      {expanded && isConnected && (
        <div className="px-4 pb-3 space-y-1"
          style={{ background: 'rgba(0,0,0,0.15)' }}
        >
          {mcpToolsUsed.length > 0 ? (
            <>
              <p className="text-[10px] text-text-muted px-2 py-1.5 uppercase tracking-wider">
                {t('context.toolsUsedLabel')}
              </p>
              {mcpToolsUsed.map((toolName, index) => {
                const count = steps.filter(s => s.toolName === toolName).length;
                const match = toolName.match(/^mcp__(.+?)__(.+)$/);
                const readableName = match ? match[2] : toolName;

                return (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[rgba(6,182,212,0.05)] hover:bg-[rgba(6,182,212,0.1)] transition-colors border border-[rgba(6,182,212,0.1)]"
                  >
                    <Wrench className="w-3.5 h-3.5 text-accent shrink-0" />
                    <span className="text-[11px] text-text-secondary flex-1 truncate">{readableName}</span>
                    <span className="text-[10px] text-text-muted">{count}×</span>
                  </div>
                );
              })}
            </>
          ) : (
            <p className="text-[11px] text-text-muted px-2 py-2">{t('context.noToolsUsedYet')}</p>
          )}
        </div>
      )}
    </div>
  );
}

// Format long paths to abbreviated version
function formatPath(path: string): string {
  if (!path) return '';
  const winHome = /^[A-Z]:\\Users\\[^\\]+/i;
  const winMatch = path.match(winHome);
  if (winMatch) return '~' + path.slice(winMatch[0].length).replace(/\\/g, '/');
  const unixHome = /^\/(?:Users|home)\/[^/]+/;
  const unixMatch = path.match(unixHome);
  if (unixMatch) return '~' + path.slice(unixMatch[0].length);
  return path;
}

function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
