import { Fragment, useMemo, useState } from 'react';

function compare(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'ru', { numeric: true, sensitivity: 'base' });
}

export default function DataTable({
  columns,
  rows,
  rowKey,
  loading = false,
  emptyText = 'Нет данных',
  onRowClick,
  expandedKey,
  renderExpanded,
}) {
  const [sort, setSort] = useState({ key: null, direction: 1 });

  const sortedRows = useMemo(() => {
    const column = columns.find((item) => item.key === sort.key);
    if (!column) return rows;
    const valueOf = column.sortValue ?? ((row) => row[column.key]);
    return [...rows].sort((a, b) => compare(valueOf(a), valueOf(b)) * sort.direction);
  }, [columns, rows, sort]);

  const handleSort = (column) => {
    if (!column.sortable) return;
    setSort((current) => {
      if (current.key !== column.key) return { key: column.key, direction: 1 };
      return { key: column.key, direction: current.direction === 1 ? -1 : 1 };
    });
  };

  const cellStyle = (column) => {
    const style = {};
    if (column.width) style.width = column.width;
    if (column.align === 'right') style.textAlign = 'right';
    return Object.keys(style).length ? style : undefined;
  };

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={column.sortable ? 'sortable' : undefined}
                style={cellStyle(column)}
                onClick={() => handleSort(column)}
                aria-sort={sort.key === column.key ? (sort.direction === 1 ? 'ascending' : 'descending') : 'none'}
              >
                {column.label}
                {sort.key === column.key ? (
                  <span className="sort-arrow">{sort.direction === 1 ? '▲' : '▼'}</span>
                ) : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td className="table-state" colSpan={columns.length}>Загрузка…</td>
            </tr>
          ) : sortedRows.length === 0 ? (
            <tr>
              <td className="table-state" colSpan={columns.length}>{emptyText}</td>
            </tr>
          ) : (
            sortedRows.map((row) => {
              const key = rowKey(row);
              const isExpanded = expandedKey != null && expandedKey === key;
              const className =
                [onRowClick ? 'expandable' : '', isExpanded ? 'expanded-parent' : ''].filter(Boolean).join(' ') ||
                undefined;
              return (
                <Fragment key={key}>
                  <tr className={className} onClick={onRowClick ? () => onRowClick(row) : undefined}>
                    {columns.map((column) => (
                      <td key={column.key} style={cellStyle(column)}>
                        {column.render ? column.render(row) : row[column.key] ?? '—'}
                      </td>
                    ))}
                  </tr>
                  {isExpanded && renderExpanded ? (
                    <tr className="expansion-row">
                      <td colSpan={columns.length}>
                        <div className="expansion-inner">{renderExpanded(row)}</div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
