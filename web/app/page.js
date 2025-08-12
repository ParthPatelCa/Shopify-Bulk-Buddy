'use client';
import { useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';

export default function Page() {
  const [shop, setShop] = useState('');
  const [rows, setRows] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasNext, setHasNext] = useState(false);
  const [changes, setChanges] = useState({}); // key: variantId -> { price, sku, weight }

  useEffect(() => {
    const url = new URL(window.location.href);
    const s = url.searchParams.get('shop') || '';
    setShop(s);
    fetchProducts(s);
  }, []);

  async function fetchProducts(s, c = null) {
    const q = new URLSearchParams({ shop: s });
    if (c) q.set('cursor', c);
    const res = await fetch(`/api/products?${q.toString()}`);
    const data = await res.json();
    const flat = [];
    for (const edge of data.edges || []) {
      for (const v of edge.node.variants.edges) {
        flat.push({
          productId: edge.node.id,
          title: edge.node.title,
          variantId: v.node.id,
          sku: v.node.sku || '',
          price: v.node.price || '',
          weight: v.node.weight || 0
        });
      }
    }
    setRows(prev => [...prev, ...flat]);
    setCursor(data.pageInfo?.endCursor || null);
    setHasNext(Boolean(data.pageInfo?.hasNextPage));
  }

  function onCellChange(variantId, field, value) {
    setChanges(prev => ({
      ...prev,
      [variantId]: { ...(prev[variantId] || {}), [field]: value }
    }));
    setRows(prev => prev.map(r => r.variantId === variantId ? { ...r, [field]: value } : r));
  }

  async function loadMore() {
    if (hasNext) await fetchProducts(shop, cursor);
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
  ], [changes]);

  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: '0 auto' }}>
      <h1>Bulk Buddy MVP</h1>
      <p>Shop: <strong>{shop}</strong></p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={() => exportCSV()}>Export CSV</button>
        <label style={{ border: '1px solid #ccc', padding: '6px 12px', cursor: 'pointer' }}>
          Import CSV
          <input type="file" accept=".csv" onChange={importCSV} style={{ display: 'none' }} />
        </label>
        <button onClick={preview}>Preview</button>
        <button onClick={applyChanges}>Apply</button>
        {hasNext && <button onClick={loadMore}>Load more</button>}
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
