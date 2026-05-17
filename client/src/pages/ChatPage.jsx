import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { chatAPI, buildsAPI, recommendationsAPI } from '../utils/api';
import {
  formatPrice,
  getPartPrice,
  getComponentLink,
  getComponentStore,
  openComponentLink,
} from '../utils/format';
import PageLayout from '../components/PageLayout';
import { Button, Card, Badge, SectionHeading, Input, Select } from '../components/UI';
import { parseChatBlocks } from '../utils/chatMessage';

const WELCOME_MESSAGE = {
  role: 'assistant',
  content:
    "Hi! I'm your ATLAS Build Assistant. Ask about parts or full builds — I'll show clickable retailer links. Select one of your saved builds above to ask questions about it.",
  parts: [],
};

function PartCard({ part, onRegenerate, regenerating = false }) {
  const hasLink = Boolean(getComponentLink(part));
  const store = getComponentStore(part);

  return (
    <Card className="!p-4 transition-all border border-white/10">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <Badge variant="default" size="sm">
            {part.category}
          </Badge>
          {onRegenerate && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              loading={regenerating}
              className="!min-h-0 py-1 px-2 text-[11px] shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onRegenerate(part.category);
              }}
            >
              Regenerate
            </Button>
          )}
        </div>
        <h4 className="text-sm font-bold text-white leading-snug">{part.name}</h4>
        {part.brand && <p className="text-white/50 text-xs">{part.brand}</p>}
        <div className="flex justify-between items-center pt-2 border-t border-white/10">
          <span className="text-white/50 text-xs">Price</span>
          <span className="text-white text-sm font-semibold">{formatPrice(part)}</span>
        </div>
        {hasLink ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="w-full !min-h-0 py-2"
            onClick={(e) => {
              e.stopPropagation();
              openComponentLink(part);
            }}
          >
            View on {store || 'retailer'} →
          </Button>
        ) : (
          <p className="text-white/35 text-xs">No listing link available yet</p>
        )}
      </div>
    </Card>
  );
}

function SaveBuildPanel({ message, onError }) {
  const navigate = useNavigate();
  const [buildName, setBuildName] = useState('');
  const [workload, setWorkload] = useState('general');
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    const rec = message.recommendation;
    if (rec?.workload) setWorkload(rec.workload);
    const total = rec?.estimated_total_php;
    setBuildName(
      total
        ? `Chat Build — ₱${Math.round(total).toLocaleString()}`
        : 'Chat Recommended Build'
    );
  }, [message]);

  const handleSave = async () => {
    if (!buildName.trim()) {
      setLocalError('Build name is required');
      return;
    }

    const saveable = (message.parts || []).filter(
      (c) => c.component_id && getPartPrice(c)
    );
    if (saveable.length === 0) {
      setLocalError('No priced components to save.');
      return;
    }

    setSaving(true);
    setLocalError('');

    try {
      const { data } = await buildsAPI.create({
        build_name: buildName.trim(),
        intended_workload: workload,
        is_public: false,
        components: saveable.map((c) => ({
          component_id: c.component_id,
          quantity: 1,
          price_at_save: getPartPrice(c),
        })),
      });
      navigate(`/builds/${data.data.build_id}`, {
        state: { message: 'Build saved from chat!' },
      });
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save build';
      setLocalError(msg);
      onError?.(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="!p-4 bg-violet-500/10 border-violet-400/25">
      <p className="text-sm font-semibold text-white mb-3">Save this build</p>
      <div className="space-y-3">
        <Input
          label="Build name"
          value={buildName}
          onChange={(e) => setBuildName(e.target.value)}
          placeholder="My gaming build"
        />
        <Select
          label="Workload"
          value={workload}
          onChange={(e) => setWorkload(e.target.value)}
          options={[
            { value: 'gaming', label: 'Gaming' },
            { value: 'video_editing', label: 'Video editing' },
            { value: 'student', label: 'Student' },
            { value: 'general', label: 'General' },
            { value: 'productivity', label: 'Productivity' },
          ]}
        />
        {localError && <p className="text-red-300 text-xs">{localError}</p>}
        <Button type="button" onClick={handleSave} loading={saving} className="w-full">
          Save as build
        </Button>
      </div>
    </Card>
  );
}

function ChatMessageBody({ content, isUser }) {
  if (isUser) {
    return <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>;
  }

  const blocks = parseChatBlocks(content);
  if (blocks.length === 0) {
    return <p className="text-sm leading-relaxed text-white/90">{content}</p>;
  }

  return (
    <div className="space-y-2.5 text-sm leading-relaxed text-white/90">
      {blocks.map((block, index) => {
        if (block.type === 'list') {
          return (
            <ul key={index} className="space-y-1.5 pl-4 list-disc marker:text-violet-400/80">
              {block.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          );
        }

        const verdictMatch = block.text.match(/^(Verdict|Result|Bottom line):\s*(.+)$/i);
        if (verdictMatch) {
          return (
            <p key={index} className="text-white font-medium border-l-2 border-violet-500/60 pl-3">
              <span className="text-violet-300/90">{verdictMatch[1]}:</span>{' '}
              {verdictMatch[2]}
            </p>
          );
        }

        return (
          <p key={index} className={index === 0 ? 'text-white font-medium' : undefined}>
            {block.text}
          </p>
        );
      })}
    </div>
  );
}

function ChatBubble({
  message,
  messageIndex,
  onSaveError,
  onRegenerateBuild,
  onRegeneratePart,
  regeneratingKey,
}) {
  const isUser = message.role === 'user';
  const canRegenerateBuild =
    message.is_full_build && message.recommendation?.budget_php && message.parts?.length;
  const buildRegenerating = regeneratingKey === `${messageIndex}-all`;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[min(100%,42rem)] space-y-3">
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white'
              : 'bg-white/8 border border-white/10 text-white/90'
          }`}
        >
          <ChatMessageBody content={message.content} isUser={isUser} />
        </div>

        {message.parts?.length > 0 && (
          <div className="w-full space-y-2">
            <div className="flex items-center justify-between gap-2 px-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/45">
                {message.is_full_build ? 'Recommended build' : 'Parts with links'}
              </p>
              {canRegenerateBuild && onRegenerateBuild && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  loading={buildRegenerating}
                  disabled={Boolean(regeneratingKey) && !buildRegenerating}
                  className="!min-h-0 py-1 px-2 text-[11px]"
                  onClick={() => onRegenerateBuild(messageIndex)}
                >
                  Regenerate build
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {message.parts.map((part, index) => (
                <PartCard
                  key={part.component_id ?? `${part.name}-${index}`}
                  part={part}
                  onRegenerate={
                    canRegenerateBuild && onRegeneratePart
                      ? (category) => onRegeneratePart(messageIndex, category)
                      : undefined
                  }
                  regenerating={regeneratingKey === `${messageIndex}-${part.category}`}
                />
              ))}
            </div>
            {message.recommendation?.estimated_total_php != null && (
              <p className="text-white/55 text-xs px-1">
                Estimated total:{' '}
                <span className="text-white font-medium">
                  {formatPrice(message.recommendation.estimated_total_php)}
                </span>
              </p>
            )}
          </div>
        )}

        {message.is_full_build && message.parts?.length > 0 && (
          <SaveBuildPanel message={message} onError={onSaveError} />
        )}
      </div>
    </div>
  );
}

export function ChatPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [builds, setBuilds] = useState([]);
  const [buildsLoading, setBuildsLoading] = useState(true);
  const [selectedBuildId, setSelectedBuildId] = useState(
    () => searchParams.get('build') || ''
  );
  const [regeneratingKey, setRegeneratingKey] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    buildsAPI
      .getAll()
      .then(({ data }) => setBuilds(data.data || []))
      .catch(() => setBuilds([]))
      .finally(() => setBuildsLoading(false));
  }, []);

  useEffect(() => {
    if (selectedBuildId) {
      setSearchParams({ build: selectedBuildId }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [selectedBuildId, setSearchParams]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const selectedBuild = builds.find(
    (b) => String(b.build_id) === String(selectedBuildId)
  );

  const handleSend = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMessage = { role: 'user', content: text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setError('');
    setLoading(true);

    try {
      const apiMessages = nextMessages
        .filter(
          (m) =>
            !(m.role === 'assistant' && m.content === WELCOME_MESSAGE.content)
        )
        .map((m) => ({ role: m.role, content: m.content }));

      const payload = { messages: apiMessages };
      if (selectedBuildId) {
        payload.build_id = parseInt(selectedBuildId, 10);
      }

      const { data } = await chatAPI.send(payload);
      const body = data.data || {};

      setMessages([
        ...nextMessages,
        {
          role: 'assistant',
          content: body.message || 'Sorry, I could not generate a response.',
          parts: body.parts || [],
          recommendation: body.recommendation || null,
          is_full_build: Boolean(body.is_full_build),
        },
      ]);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Failed to reach the assistant. Check that the backend is running.'
      );
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleClear = () => {
    setMessages([WELCOME_MESSAGE]);
    setError('');
    setRegeneratingKey(null);
    inputRef.current?.focus();
  };

  const updateMessageRecommendation = (messageIndex, payload) => {
    const components = payload.components || payload.parts || [];
    setMessages((prev) =>
      prev.map((m, i) =>
        i === messageIndex
          ? {
              ...m,
              parts: components,
              recommendation: { ...payload, components },
              is_full_build: true,
            }
          : m
      )
    );
  };

  const handleRegenerateChatBuild = async (messageIndex) => {
    const msg = messages[messageIndex];
    const rec = msg?.recommendation;
    if (!rec?.budget_php || !msg?.parts?.length) return;

    setRegeneratingKey(`${messageIndex}-all`);
    setError('');

    try {
      const { data } = await recommendationsAPI.generate({
        budget_php: rec.budget_php,
        workload: rec.workload || 'gaming',
        device_type: rec.device_type || 'desktop',
        regenerate: true,
        avoid_parts: msg.parts.map((p) => ({
          category: p.category,
          name: p.name,
        })),
      });
      updateMessageRecommendation(messageIndex, data.data || {});
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.detail ||
          'Failed to regenerate build'
      );
    } finally {
      setRegeneratingKey(null);
    }
  };

  const handleRegenerateChatPart = async (messageIndex, category) => {
    const msg = messages[messageIndex];
    const rec = msg?.recommendation;
    if (!rec?.budget_php || !msg?.parts?.length) return;

    setRegeneratingKey(`${messageIndex}-${category}`);
    setError('');

    const locked = msg.parts
      .filter((p) => p.category !== category)
      .map((p) => ({ category: p.category, name: p.name }));
    const avoid = msg.parts
      .filter((p) => p.category === category)
      .map((p) => ({ category: p.category, name: p.name }));

    try {
      const { data } = await recommendationsAPI.generate({
        budget_php: rec.budget_php,
        workload: rec.workload || 'gaming',
        device_type: rec.device_type || 'desktop',
        regenerate_category: category,
        locked_parts: locked,
        avoid_parts: avoid,
      });
      updateMessageRecommendation(messageIndex, data.data || {});
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.detail ||
          'Failed to regenerate this part'
      );
    } finally {
      setRegeneratingKey(null);
    }
  };

  const buildOptions = [
    { value: '', label: 'No build selected (general chat)' },
    ...builds.map((b) => ({
      value: String(b.build_id),
      label: b.build_name || `Build #${b.build_id}`,
    })),
  ];

  return (
    <PageLayout>
      <SectionHeading
        eyebrow="Build Assistant"
        title="PC Build Chat"
        description="Ask about parts or full builds — get clickable links. Select a saved build to discuss it."
      />

      <Card className="mb-4 !p-4">
        <Select
          label="Discuss a saved build"
          value={selectedBuildId}
          onChange={(e) => setSelectedBuildId(e.target.value)}
          disabled={buildsLoading}
          options={buildOptions}
        />
        {selectedBuild && (
          <p className="text-white/50 text-xs mt-2">
            Chatting about &ldquo;{selectedBuild.build_name}&rdquo;
            {selectedBuild.intended_workload
              ? ` · ${selectedBuild.intended_workload}`
              : ''}
          </p>
        )}
      </Card>

      <Card className="!p-0 overflow-hidden flex flex-col" style={{ minHeight: 'calc(100vh - 18rem)' }}>
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10">
          <p className="text-sm text-white/60">
            Powered by ATLAS · Click part cards for retailer links
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
            New chat
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 min-h-[20rem] max-h-[calc(100vh-22rem)]">
          {messages.map((msg, index) => (
            <ChatBubble
              key={`${msg.role}-${index}`}
              message={msg}
              messageIndex={index}
              onSaveError={setError}
              onRegenerateBuild={handleRegenerateChatBuild}
              onRegeneratePart={handleRegenerateChatPart}
              regeneratingKey={regeneratingKey}
            />
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl px-4 py-3 bg-white/8 border border-white/10 text-white/60 text-sm flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-violet-400" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Thinking…
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {error && (
          <div className="mx-4 mb-2 p-3 rounded-lg bg-red-500/15 border border-red-500/40 text-red-200 text-sm">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSend}
          className="border-t border-white/10 p-4 flex flex-col sm:flex-row gap-3"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={
              selectedBuild
                ? `Ask about "${selectedBuild.build_name}"…`
                : 'Ask about a GPU under ₱15k, a full build, compatibility…'
            }
            rows={2}
            disabled={loading}
            className="flex-1 resize-none rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/35 bg-white/5 border border-white/15 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 disabled:opacity-50"
          />
          <Button type="submit" loading={loading} disabled={!input.trim()} className="sm:self-end shrink-0">
            Send
          </Button>
        </form>
      </Card>
    </PageLayout>
  );
}
