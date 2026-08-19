'use client';

import React, { useMemo, useState } from 'react';
import { Cloud, List } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface WordCloudWord {
  text: string;
  count: number;
}

interface WordCloudResponse {
  text: string;
  participantName: string | null;
}

interface WordCloudVisualizerProps {
  words: WordCloudWord[];
  responses: WordCloudResponse[];
  totalVotes: number;
  isPresentation?: boolean;
}

const wordColors = [
  'text-blue-600 dark:text-blue-400',
  'text-violet-600 dark:text-violet-400',
  'text-emerald-600 dark:text-emerald-400',
  'text-amber-600 dark:text-amber-400',
  'text-rose-600 dark:text-rose-400',
  'text-cyan-600 dark:text-cyan-400',
];

export const WordCloudVisualizer: React.FC<WordCloudVisualizerProps> = ({
  words,
  responses,
  totalVotes,
  isPresentation = false,
}) => {
  const t = useTranslations('presentation');
  const [activeTab, setActiveTab] = useState<'cloud' | 'list'>('cloud');

  const normalizedWords = useMemo(
    () =>
      words
        .filter((word) => word.text.trim() && Number.isFinite(word.count) && word.count > 0)
        .sort((a, b) => b.count - a.count),
    [words],
  );

  const maxCount = normalizedWords[0]?.count ?? 1;
  const minSize = isPresentation ? 18 : 14;
  const sizeRange = isPresentation ? 38 : 24;

  return (
    <div className="space-y-4">
      <div className="flex w-fit gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-950" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'cloud'}
          onClick={() => setActiveTab('cloud')}
          className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
            activeTab === 'cloud'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Cloud size={14} aria-hidden="true" className="mr-1.5 inline-block" />
          {t('wordCloudTab')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'list'}
          onClick={() => setActiveTab('list')}
          className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
            activeTab === 'list'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <List size={14} aria-hidden="true" className="mr-1.5 inline-block" />
          {t('listTab')}
        </button>
      </div>

      {totalVotes === 0 ? (
        <div className="flex min-h-36 items-center justify-center rounded-xl border border-dashed border-slate-200 px-4 text-center text-sm font-medium text-slate-400 dark:border-slate-800 dark:text-slate-500">
          {t('noWordsYet')}
        </div>
      ) : activeTab === 'cloud' ? (
        <div
          className={`flex flex-wrap items-center justify-center gap-x-5 gap-y-3 overflow-hidden rounded-xl bg-slate-50 p-6 dark:bg-slate-950/60 ${
            isPresentation ? 'min-h-64 sm:min-h-80' : 'min-h-48'
          }`}
          role="list"
          aria-label={t('wordCloudTab')}
        >
          {normalizedWords.map((word, index) => {
            const fontSize = minSize + (word.count / maxCount) * sizeRange;

            return (
              <span
                key={`${word.text.toLocaleLowerCase()}-${index}`}
                role="listitem"
                title={`${word.text} (${word.count})`}
                className={`inline-block max-w-full break-words text-center font-black leading-tight transition-all ${wordColors[index % wordColors.length]}`}
                style={{ fontSize: `${fontSize}px` }}
              >
                {word.text}
              </span>
            );
          })}
        </div>
      ) : (
        <div className={`space-y-2 overflow-y-auto pr-1 ${isPresentation ? 'max-h-80' : 'max-h-64'}`}>
          {responses.map((response, index) => (
            <div
              key={`${response.participantName ?? 'anonymous'}-${index}`}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950/60"
            >
              {response.participantName && (
                <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  {response.participantName}
                </p>
              )}
              <p
                className={`${isPresentation ? 'text-base' : 'text-sm'} break-words font-medium text-slate-700 dark:text-slate-200`}
              >
                {response.text}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
