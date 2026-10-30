import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, FileText, Building2, AlertTriangle, ArrowRight, ShieldCheck, BadgeCheck } from 'lucide-react';
import { useDhaarStore } from '../context/useDhaarStore';
import { money } from '../lib/format';

export interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const deposits = useDhaarStore(s => s.deposits);
  const releaseCases = useDhaarStore(s => s.releaseCases);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const items: Array<{
      id: string;
      category: 'Instruments' | 'Institutions' | 'Findings' | 'Releases';
      title: string;
      subtitle: string;
      badge?: string;
      url: string;
    }> = [];

    // Search instruments
    deposits.forEach(d => {
      if (
        d.id.toLowerCase().includes(q) ||
        d.fdrNo.toLowerCase().includes(q) ||
        d.bank.toLowerCase().includes(q)
      ) {
        items.push({
          id: `inst-${d.id}`,
          category: 'Instruments',
          title: `${d.id} · ${d.fdrNo}`,
          subtitle: `${d.bank} · ${money(d.amount)} · ${d.institution}`,
          badge: d.grade,
          url: `/registry?search=${encodeURIComponent(d.fdrNo)}`
        });
      }
    });

    // Search institutions
    const instMap = new Map<string, string>();
    deposits.forEach(d => {
      if (
        (d.institution.toLowerCase().includes(q) || d.institutionCode.toLowerCase().includes(q)) &&
        !instMap.has(d.institutionCode)
      ) {
        instMap.set(d.institutionCode, d.institution);
        items.push({
          id: `org-${d.institutionCode}`,
          category: 'Institutions',
          title: d.institution,
          subtitle: `Code: ${d.institutionCode} · Region: ${d.region || 'Western'}`,
          badge: 'Institution',
          url: `/institutions?search=${encodeURIComponent(d.institutionCode)}`
        });
      }
    });

    // Search findings
    deposits.forEach(d => {
      if (d.finding && d.finding.toLowerCase().includes(q)) {
        items.push({
          id: `find-${d.id}`,
          category: 'Findings',
          title: d.finding,
          subtitle: `Flagged on ${d.id} (${d.fdrNo} · ${d.bank})`,
          badge: 'Finding',
          url: `/verification`
        });
      }
    });

    // Search release cases
    releaseCases.forEach(rc => {
      if (
        rc.id.toLowerCase().includes(q) ||
        rc.depositId.toLowerCase().includes(q) ||
        rc.refundAccount.toLowerCase().includes(q)
      ) {
        items.push({
          id: `rel-${rc.id}`,
          category: 'Releases',
          title: `${rc.id} · ${rc.stage}`,
          subtitle: `Linked Deposit: ${rc.depositId} · Refund: ${rc.refundAccount}`,
          badge: rc.stage,
          url: `/release`
        });
      }
    });

    return items.slice(0, 15);
  }, [query, deposits, releaseCases]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (results.length > 0 ? (prev + 1) % results.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      navigate(results[selectedIndex].url);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Global Search">
      <div className="global-search-modal" onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className="global-search-header">
          <Search size={20} className="search-icon" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search instruments, institutions, findings, releases… (↑↓ to navigate, Enter to open, Esc to close)"
            aria-label="Search query"
          />
          {query && (
            <button className="icon-button" onClick={() => setQuery('')} aria-label="Clear query">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="global-search-results">
          {query.trim() === '' ? (
            <div className="search-hint">
              <p>Type to search across <strong>1,800+ instruments</strong>, <strong>1,000 institutions</strong>, <strong>active findings</strong>, and <strong>releases</strong>.</p>
              <div className="quick-tags">
                <button className="badge badge-neutral" onClick={() => setQuery('HDFC')}>HDFC</button>
                <button className="badge badge-neutral" onClick={() => setQuery('Lien')}>Lien</button>
                <button className="badge badge-neutral" onClick={() => setQuery('Short tenure')}>Short tenure</button>
                <button className="badge badge-neutral" onClick={() => setQuery('REL-')}>Releases</button>
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="search-empty">
              <p>No results found for "{query}"</p>
            </div>
          ) : (
            <ul>
              {results.map((item, idx) => {
                const isSelected = selectedIndex === idx;
                return (
                  <li
                    key={item.id}
                    className={`search-result-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      navigate(item.url);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <div className="item-icon">
                      {item.category === 'Instruments' && <FileText size={18} />}
                      {item.category === 'Institutions' && <Building2 size={18} />}
                      {item.category === 'Findings' && <AlertTriangle size={18} className="text-amber" />}
                      {item.category === 'Releases' && <BadgeCheck size={18} className="text-teal" />}
                    </div>
                    <div className="item-content">
                      <div className="item-title-row">
                        <strong>{item.title}</strong>
                        {item.badge && <span className="badge badge-neutral">{item.badge}</span>}
                      </div>
                      <small className="item-subtitle">{item.subtitle}</small>
                    </div>
                    <ArrowRight size={14} className="item-arrow" />
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="global-search-footer">
          <span>Navigate with <kbd>↑</kbd> <kbd>↓</kbd></span>
          <span>Open with <kbd>Enter</kbd></span>
          <span>Close with <kbd>Esc</kbd></span>
        </div>
      </div>
    </div>
  );
}
