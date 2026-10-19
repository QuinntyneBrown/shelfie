import { createHash, randomBytes } from 'node:crypto';

/**
 * The sign-in providers (ADR-0019): plain OAuth 2.0 authorization-code flow with PKCE, run with fetch and
 * node:crypto. A provider is on when its client id and secret are both set; its endpoints default to the
 * real service and can be pointed at a stand-in, so no test ever reaches Google or Facebook.
 */
export type ProviderName = 'google' | 'facebook';

export interface ProviderEndpoints {
  authorizeUrl: string;
  tokenUrl: string;
  /** Where the profile is read with the access token; Google needs none, its ID token carries it. */
  userInfoUrl?: string;
}

export interface OAuthProvider extends ProviderEndpoints {
  name: ProviderName;
  clientId: string;
  clientSecret: string;
  scope: string;
}

const PROVIDERS: Record<ProviderName, ProviderEndpoints & { scope: string; envPrefix: string }> = {
  google: {
    envPrefix: 'GOOGLE',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scope: 'openid email profile',
  },
  facebook: {
    envPrefix: 'FACEBOOK',
    authorizeUrl: 'https://www.facebook.com/v21.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v21.0/oauth/access_token',
    userInfoUrl: 'https://graph.facebook.com/v21.0/me',
    scope: 'email public_profile',
  },
};

/** The providers whose `*_CLIENT_ID` and `*_CLIENT_SECRET` are both set, in a fixed order. */
export function configuredProviders(env: NodeJS.ProcessEnv = process.env, endpoints: Partial<Record<ProviderName, ProviderEndpoints>> = {}): OAuthProvider[] {
  const providers: OAuthProvider[] = [];
  for (const name of Object.keys(PROVIDERS) as ProviderName[]) {
    const { envPrefix, ...defaults } = PROVIDERS[name];
    const clientId = env[`${envPrefix}_CLIENT_ID`];
    const clientSecret = env[`${envPrefix}_CLIENT_SECRET`];
    if (clientId && clientSecret) providers.push({ name, clientId, clientSecret, ...defaults, ...endpoints[name] });
  }
  return providers;
}

/** What a provider vouches for about the person who consented. */
export interface ProviderIdentity {
  subject: string;
  email: string | null;
  /** True when the provider says it has verified the e-mail; Facebook only ever returns verified ones. */
  verified: boolean;
  name: string | null;
}

/** A fresh PKCE pair: the verifier stays in the browser's start cookie, the S256 challenge goes to the provider. */
export function pkce() {
  const verifier = randomBytes(32).toString('base64url');
  return { verifier, challenge: createHash('sha256').update(verifier).digest('base64url') };
}

/** Where the browser is sent to consent (L2-149). */
export function authorizeUrl(provider: OAuthProvider, redirectUri: string, state: string, challenge: string): string {
  const url = new URL(provider.authorizeUrl);
  url.search = new URLSearchParams({
    client_id: provider.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: provider.scope,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  }).toString();
  return url.href;
}

/**
 * Trades the code for the person's identity, server to server. The tokens are read once here and never stored,
 * logged or sent on; a failure of any kind throws and the caller treats it as a provider failure.
 */
export async function exchangeCode(provider: OAuthProvider, code: string, verifier: string, redirectUri: string): Promise<ProviderIdentity> {
  const response = await fetch(provider.tokenUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: provider.clientId, client_secret: provider.clientSecret, code_verifier: verifier }),
  });
  if (!response.ok) throw new Error(`${provider.name} token endpoint answered ${response.status}`);
  const tokens = (await response.json()) as { access_token?: string; id_token?: string };
  if (provider.name === 'google') return fromIdToken(provider, tokens.id_token);
  return fromUserInfo(provider, tokens.access_token);
}

/** Google: the ID token came straight from the token endpoint over TLS, so its payload is read without a signature check (ADR-0019); `aud` is still checked. */
function fromIdToken(provider: OAuthProvider, idToken: string | undefined): ProviderIdentity {
  const payload = idToken?.split('.')[1];
  if (!payload) throw new Error(`${provider.name} returned no ID token`);
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { aud?: string; sub?: string; email?: string; email_verified?: boolean; name?: string };
  if (claims.aud !== provider.clientId || typeof claims.sub !== 'string') throw new Error(`${provider.name} ID token is not for this app`);
  return { subject: claims.sub, email: claims.email ?? null, verified: claims.email_verified === true, name: claims.name ?? null };
}

/** Facebook: `/me?fields=id,name,email`; the e-mail is present only when Facebook has verified it. */
async function fromUserInfo(provider: OAuthProvider, accessToken: string | undefined): Promise<ProviderIdentity> {
  if (!accessToken || !provider.userInfoUrl) throw new Error(`${provider.name} returned no access token`);
  const url = new URL(provider.userInfoUrl);
  url.search = new URLSearchParams({ fields: 'id,name,email', access_token: accessToken }).toString();
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${provider.name} profile endpoint answered ${response.status}`);
  const me = (await response.json()) as { id?: string; name?: string; email?: string };
  if (typeof me.id !== 'string') throw new Error(`${provider.name} returned no id`);
  return { subject: me.id, email: me.email ?? null, verified: typeof me.email === 'string', name: me.name ?? null };
}
