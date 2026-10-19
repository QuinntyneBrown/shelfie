/**
 * The sign-in providers (ADR-0018): plain OAuth 2.0 authorization-code flow with PKCE, run with fetch and
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
