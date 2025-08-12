"use client";
import React, { useCallback, useEffect, useState } from 'react';
import { AppProvider as PolarisAppProvider, Frame, Toast } from '@shopify/polaris';
import enTranslations from '@shopify/polaris/locales/en.json';
import { Provider as AppBridgeProvider } from '@shopify/app-bridge-react';
import type { AppBridgeState } from '@shopify/app-bridge-react';
import Page from '../page';

// Toast helper component
function useToasts() {
  const [toasts, setToasts] = useState<{ id: number; content: string; error?: boolean }[]>([]);
  const push = useCallback((content: string, opts: { error?: boolean } = {}) => {
    setToasts(t => [...t, { id: Date.now() + Math.random(), content, error: opts.error }]);
  }, []);
  const markup = toasts.map(t => (
    <Toast key={t.id} content={t.content} error={t.error} onDismiss={() => setToasts(ts => ts.filter(x => x.id !== t.id))} />
  ));
  return { push, markup };
}

export default function EmbeddedPage() {
  const [shop, setShop] = useState<string>('');
  const { push, markup } = useToasts();

  useEffect(() => {
    const url = new URL(window.location.href);
    const s = url.searchParams.get('shop') || '';
    setShop(s);
  }, []);

  // Wrap fetch to show success/error toasts
  useEffect(() => {
    const orig = window.fetch;
    window.fetch = async (...args) => {
      try {
        const resp = await orig(...args as [RequestInfo, RequestInit?]);
        if (!resp.ok) {
          push(`API error ${resp.status}`, { error: true });
        }
        return resp;
      } catch (e: any) {
        push(e?.message || 'Network error', { error: true });
        throw e;
      }
    };
    return () => { window.fetch = orig; };
  }, [push]);

  const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || '';

  const appBridgeConfig: AppBridgeState = {
    apiKey,
    host: (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('host')) || '',
    forceRedirect: true
  } as any;

  return (
    <PolarisAppProvider i18n={enTranslations}>
      <AppBridgeProvider config={appBridgeConfig}>
        <Frame>
          <div style={{ padding: 16 }}>
            <h2 style={{ marginTop: 0 }}>Embedded Bulk Editor</h2>
            <p style={{ color: '#555' }}>Shop: <strong>{shop}</strong></p>
            {/* Re-use existing table page component */}
            <Page />
          </div>
          {markup}
        </Frame>
      </AppBridgeProvider>
    </PolarisAppProvider>
  );
}
