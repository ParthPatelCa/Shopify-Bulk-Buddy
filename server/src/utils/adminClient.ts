import { shopify } from '../shopify.js';

export function getAdminClient(shop: string, accessToken: string) {
  return new shopify.clients.Graphql({
    session: {
      shop,
      accessToken,
      isOnline: false,
      expires: undefined,
      scope: (process.env.SCOPES || ''),
      id: `${shop}_${Date.now()}`,
      state: 'offline'
    } as any
  });
}
