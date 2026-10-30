import React, { useRef, useState, useEffect, useMemo, type ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  render: (item: T, index: number) => ReactNode;
}

export interface VirtualTableProps<T> {
  data: T[];
  columns: Column<T>[];
  rowHeight?: number;
  viewportHeight?: number;
  overscan?: number;
  keyExtractor: (item: T, index: number) => string;
  onRowClick?: (item: T) => void;
  selectedKey?: string;
  emptyMessage?: string;
}

export default function VirtualTable<T>({
  data,
  columns,
  rowHeight = 44,
  viewportHeight = 520,
  overscan = 8,
  keyExtractor,
  onRowClick,
  selectedKey,
  emptyMessage = 'No matching records found'
}: VirtualTableProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const totalCount = data.length;
  const totalHeight = totalCount * rowHeight;

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const { startIndex, endIndex } = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const visibleCount = Math.ceil(viewportHeight / rowHeight);
    const end = Math.min(totalCount - 1, start + visibleCount + overscan * 2);
    return { startIndex: start, endIndex: end };
  }, [scrollTop, rowHeight, viewportHeight, overscan, totalCount]);

  const visibleItems = useMemo(() => {
    const items = [];
    for (let i = startIndex; i <= endIndex; i++) {
      if (data[i]) {
        items.push({ item: data[i], index: i });
      }
    }
    return items;
  }, [data, startIndex, endIndex]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (totalCount === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => {
        const next = Math.min(totalCount - 1, prev + 1);
        scrollToIndex(next);
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => {
        const next = Math.max(0, prev - 1);
        scrollToIndex(next);
        return next;
      });
    } else if (e.key === 'Enter' && focusedIndex >= 0 && data[focusedIndex] && onRowClick) {
      e.preventDefault();
      onRowClick(data[focusedIndex]);
    }
  };

  const scrollToIndex = (index: number) => {
    if (!containerRef.current) return;
    const itemTop = index * rowHeight;
    const itemBottom = itemTop + rowHeight;
    const currentTop = containerRef.current.scrollTop;
    const currentBottom = currentTop + viewportHeight;

    if (itemTop < currentTop) {
      containerRef.current.scrollTop = itemTop;
    } else if (itemBottom > currentBottom) {
      containerRef.current.scrollTop = itemBottom - viewportHeight;
    }
  };

  if (totalCount === 0) {
    return (
      <div className="virtual-table-container empty">
        <p className="muted-note" style={{ textAlign: 'center', padding: '32px' }}>
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="virtual-table-container"
      style={{ height: `${viewportHeight}px`, overflowY: 'auto', position: 'relative' }}
      onScroll={onScroll}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="grid"
      aria-rowcount={totalCount}
      aria-colcount={columns.length}
    >
      {/* Sticky Table Header */}
      <table className="virtual-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: 'var(--surface-primary, #ffffff)' }}>
          <tr role="row">
            {columns.map(col => (
              <th
                key={col.key}
                role="columnheader"
                style={{
                  width: col.width,
                  textAlign: col.align || 'left',
                  padding: '10px 12px',
                  borderBottom: '1px solid var(--border-color, #e2e8f0)',
                  whiteSpace: 'nowrap'
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
      </table>

      {/* Virtual Scrolling Canvas */}
      <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            transform: `translateY(${startIndex * rowHeight}px)`
          }}
        >
          <table className="virtual-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {visibleItems.map(({ item, index }) => {
                const key = keyExtractor(item, index);
                const isSelected = selectedKey === key;
                const isFocused = focusedIndex === index;

                return (
                  <tr
                    key={key}
                    role="row"
                    aria-rowindex={index + 1}
                    aria-selected={isSelected}
                    tabIndex={-1}
                    className={`virtual-row ${isSelected ? 'selected' : ''} ${isFocused ? 'focused' : ''}`}
                    style={{
                      height: `${rowHeight}px`,
                      cursor: onRowClick ? 'pointer' : 'default',
                      borderBottom: '1px solid var(--border-subtle, #f1f5f9)'
                    }}
                    onClick={() => {
                      setFocusedIndex(index);
                      if (onRowClick) onRowClick(item);
                    }}
                  >
                    {columns.map(col => (
                      <td
                        key={col.key}
                        role="gridcell"
                        style={{
                          width: col.width,
                          textAlign: col.align || 'left',
                          padding: '8px 12px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {col.render(item, index)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
