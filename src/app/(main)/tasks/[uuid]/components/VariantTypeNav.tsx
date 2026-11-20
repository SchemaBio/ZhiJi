'use client';
import { useText } from '@/i18n/useText';
import { translateUI } from '@/i18n/text';


import * as React from 'react';
import { HoverHint } from '@/components/shared/HoverHint';
import { TASK_NAV_ICONS, TaskNavigationCollapsed } from './TaskNavigation';
import type { ResultContext, TabConfig, TabType } from '../types';
import { isOncologyResultTab } from '../oncology-results';
import { VARIANT_TAB_CONFIGS } from '../types';

interface VariantTypeNavProps {
  activeTab: TabType;
  context: ResultContext | null;
  onTabChange: (tab: TabType) => void;
  snvOnly?: boolean;
  tabs?: TabConfig[];
}

export function VariantTypeNav({ activeTab, context, onTabChange, snvOnly=false, tabs }: VariantTypeNavProps) {
  const t = useText();
  const configs = tabs ?? (snvOnly ? VARIANT_TAB_CONFIGS.filter(t => t.id === 'snv-indel') : VARIANT_TAB_CONFIGS);
  const collapsed = React.useContext(TaskNavigationCollapsed);
  const buttons = React.useRef<Array<HTMLButtonElement | null>>([]);
  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    let next: number;
    if (event.key === 'ArrowDown') next = (index + 1) % configs.length;
    else if (event.key === 'ArrowUp') next = (index - 1 + configs.length) % configs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = configs.length - 1;
    else return;
    event.preventDefault();
    onTabChange(configs[next].id);
    buttons.current[next]?.focus();
  };
  return (
    <nav className="yj-variant-nav" aria-label={t("history.variantType6c1aef")}>
      <p className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-fg-muted">{t("history.variantType6c1aef")}</p>
      <div className="yj-variant-nav-items">
        {configs.map((item, index) => {
          const active = activeTab === item.id;
          const summary = isOncologyResultTab(item.id) ? context?.oncology?.[item.id] : undefined;
          const count = summary ? summary.total : context?.types?.[item.id]?.total;
          const Icon = TASK_NAV_ICONS[item.id];
          const name = translateUI(item.label, t);
          const label = name + ' ' + (count?.toLocaleString(t.locale) ?? '—');
          return (
            <HoverHint key={item.id} content={collapsed ? label : undefined}><button
              key={item.id}
              ref={element => { buttons.current[index] = element; }}
              type="button"
              aria-label={label}
              onKeyDown={event => handleKeyDown(event, index)}
              onClick={() => onTabChange(item.id)}
              className={`flex items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors ${active ? 'bg-accent-subtle text-accent-fg' : 'text-fg-muted hover:bg-canvas-subtle hover:text-fg-default'}`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={15} aria-hidden="true" className="shrink-0" />
              {!collapsed && <><span className="flex-1 whitespace-nowrap">{name}</span><span className="text-xs tabular-nums opacity-80">{count?.toLocaleString(t.locale) ?? '—'}</span></>}
            </button></HoverHint>
          );
        })}
      </div>
    </nav>
  );
}
