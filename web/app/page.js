'use client';
import { useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';

export default function Page() {
  const [shop, setShop] = useState('');
  const [rows, setRows] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [titleFilter, setTitleFilter] = useState('');
  const [skuFilter, setSkuFilter] = useState('');
  const [selected, setSelected] = useState(() => new Set()); // Set of variantIds
  const [changes, setChanges] = useState({}); // key: variantId -> { price, sku, weight }

  useEffect(() => {
    const url = new URL(window.location.href);
    const s = url.searchParams.get('shop') || '';
    setShop(s);
    fetchProducts(s);
  }, []);

  async function fetchProducts(s, c = null, replace = false) {
    if (!s) return;
    setLoading(true);
    try {
      const q = new URLSearchParams({ shop: s });
      if (c) q.set('cursor', c);
      const res = await fetch(`/api/products?${q.toString()}`);
      const data = await res.json();
      const flat = [];
      for (const edge of data.edges || []) {
        for (const v of edge.node.variants.edges) {
          const record = {
            productId: edge.node.id,
            title: edge.node.title,
            variantId: v.node.id,
            sku: v.node.sku || '',
            price: v.node.price || '',
            weight: v.node.weight || 0
          };
          flat.push(record);
        }
      }
      setRows(prev => {
        const base = replace ? [] : prev;
        const map = new Map(base.map(r => [r.variantId, r]));
        for (const r of flat) map.set(r.variantId, { ...(map.get(r.variantId) || {}), ...r });
        return Array.from(map.values());
      });
      setCursor(data.pageInfo?.endCursor || null);
      setHasNext(Boolean(data.pageInfo?.hasNextPage));
    } finally {
      setLoading(false);
    }
  }

  function onCellChange(variantId, field, value) {
    setChanges(prev => ({
      ...prev,
      [variantId]: { ...(prev[variantId] || {}), [field]: value }
    }));
    setRows(prev => prev.map(r => r.variantId === variantId ? { ...r, [field]: value } : r));
  }

  async function loadMore() {
    if (hasNext && !loading) await fetchProducts(shop, cursor);
  }

  function toggleSelectAll(checked) {
    if (checked) {
      const allIds = rowsFiltered.map(r => r.variantId);
      setSelected(prev => new Set([...prev, ...allIds]));
    } else {
      // Remove only those currently visible
      setSelected(prev => {
        const next = new Set(prev);
        rowsFiltered.forEach(r => next.delete(r.variantId));
        return next;
      });
    }
  }

  function toggleRow(id, checked) {
    setSelected(prev => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }

  async function exportCSV() {
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'variants.csv';
    a.click();
  }

  async function importCSV(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      complete: (res) => {
        const data = res.data;
        const byId = {};
        const updated = rows.map(r => {
          const match = data.find(d => d.variantId === r.variantId);
          if (!match) return r;
          const next = { ...r };
          ['sku', 'price', 'weight'].forEach(k => {
            if (match[k] != null && match[k] !== '') {
              next[k] = match[k];
              byId[r.variantId] = { ...(byId[r.variantId] || {}), [k]: match[k] };
            }
          });
          return next;
        });
        setRows(updated);
        setChanges(prev => ({ ...prev, ...byId }));
      }
    });
  }

  async function preview() {
    const payload = Object.entries(changes).map(([variantId, data]) => ({ variantId, ...data }));
    const res = await fetch('/api/bulk/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-shop': shop },
      body: JSON.stringify({ changes: payload })
    });
    const data = await res.json();
    alert(`Preview notes: ${data.notes.length} items, first: ${JSON.stringify(data.notes[0] || {}, null, 2)}`);
  }

  async function applyChanges() {
    const payload = Object.entries(changes).map(([variantId, data]) => ({ variantId, ...data }));
    const res = await fetch('/api/bulk/apply?shop=' + encodeURIComponent(shop), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-shop': shop },
      body: JSON.stringify({ description: 'UI apply', changes: payload })
    });
    const data = await res.json();
    if (data.ok) {
      alert('Applied successfully');
      setChanges({});
    } else {
      alert('Apply failed: ' + JSON.stringify(data));
    }
  }

  const columnHelper = createColumnHelper();
  const columns = useMemo(() => [
    {
      id: 'select',
      header: () => <input type="checkbox" onChange={e => toggleSelectAll(e.target.checked)} />,
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={selected.has(row.original.variantId)}
          onChange={e => toggleRow(row.original.variantId, e.target.checked)}
        />
      )
    },
    columnHelper.accessor('title', { header: 'Product' }),
    columnHelper.accessor('variantId', { header: 'Variant ID' }),
    columnHelper.accessor('sku', {
      header: 'SKU',
      cell: ({ row, getValue }) => (
        <input defaultValue={getValue()} onChange={e => onCellChange(row.original.variantId, 'sku', e.target.value)} />
      )
    }),
    columnHelper.accessor('price', {
      header: 'Price',
      cell: ({ row, getValue }) => (
        <input defaultValue={getValue()} onChange={e => onCellChange(row.original.variantId, 'price', e.target.value)} />
      )
    }),
    columnHelper.accessor('weight', {
      header: 'Weight',
      cell: ({ row, getValue }) => (
        <input defaultValue={getValue()} onChange={e => onCellChange(row.original.variantId, 'weight', e.target.value)} />
      )
    })
  ], [changes, selected]);

  // Client-side filtering (could be server-side later)
  const rowsFiltered = useMemo(() => {
    return rows.filter(r => {
      if (titleFilter && !r.title.toLowerCase().includes(titleFilter.toLowerCase())) return false;
      if (skuFilter && !r.sku.toLowerCase().includes(skuFilter.toLowerCase())) return false;
      return true;
    });
  }, [rows, titleFilter, skuFilter]);

  const table = useReactTable({ data: rowsFiltered, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: '0 auto' }}>
      <h1>Bulk Buddy MVP</h1>
      <p>Shop: <strong>{shop}</strong></p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <button onClick={() => exportCSV()}>Export CSV</button>
        <label style={{ border: '1px solid #ccc', padding: '6px 12px', cursor: 'pointer' }}>
          Import CSV
          <input type="file" accept=".csv" onChange={importCSV} style={{ display: 'none' }} />
        </label>
        <button onClick={preview}>Preview</button>
        <button onClick={applyChanges}>Apply</button>
        {hasNext && <button disabled={loading} onClick={loadMore}>{loading ? 'Loading...' : 'Load more'}</button>}
        <input placeholder="Filter title" value={titleFilter} onChange={e => setTitleFilter(e.target.value)} style={{ padding: 6 }} />
        <input placeholder="Filter SKU" value={skuFilter} onChange={e => setSkuFilter(e.target.value)} style={{ padding: 6 }} />
        <span style={{ fontSize: 12, alignSelf: 'center' }}>Selected: {selected.size}</span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(h => (
                  <th key={h.id} style={{ borderBottom: '1px solid #eee', textAlign: 'left', padding: 8 }}>
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(r => (
              <tr key={r.id}>
                {r.getVisibleCells().map(c => (
                  <td key={c.id} style={{ borderBottom: '1px solid #f2f2f2', padding: 8 }}>
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
