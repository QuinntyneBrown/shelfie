import { createHash } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { ProviderEndpoints } from './oauth.ts';

/** What the stand-in provider vouches for on the next sign-in. */
export interface FakeAccount {
  /** The provider's stable id for the account; derived from the e-mail when not given. */
  subject?: string;
  email: string | null;
  name: string | null;
  verified: boolean;
}

type Mode = { kind: 'answer'; account: FakeAccount } | { kind: 'cancel' } | { kind: 'fail' };

const sha256 = (text: string) => createHash('sha256').update(text).digest('base64url');
const base64url = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');

/**
 * An in-process stand-in for Google and Facebook (ADR-0019), so no test reaches either: `/authorize` sends the browser
 * straight back with a code (or an error), `/token` checks the PKCE verifier and answers an unsigned ID token and an
 * access token for the chosen account, and `/me` answers Facebook's shape. Tell it what to do before each sign-in.
 */
export async function startFakeProvider(host = 'localhost') {
  let mode: Mode = { kind: 'answer', account: { email: 'parent@example.com', name: 'A parent', verified: true } };
  const codes = new Map<string, { challenge: string; account: FakeAccount; clientId: string }>();
  const tokens = new Map<string, FakeAccount>();
  let issued = 0;

  const server: Server = createServer(async (req, res) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const redirect = (to: string) => {
      res.writeHead(302, { location: to });
      res.end();
    };
    const json = (status: number, body: unknown) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    if (url.pathname === '/authorize') {
      const back = new URL(url.searchParams.get('redirect_uri')!);
      back.searchParams.set('state', url.searchParams.get('state') ?? '');
      if (mode.kind === 'cancel') back.searchParams.set('error', 'access_denied');
      else if (mode.kind === 'fail') back.searchParams.set('error', 'server_error');
      else {
        const code = `code-${++issued}`;
        codes.set(code, { challenge: url.searchParams.get('code_challenge') ?? '', account: mode.account, clientId: url.searchParams.get('client_id') ?? '' });
        back.searchParams.set('code', code);
      }
      return redirect(back.href);
    }
    if (url.pathname === '/token' && req.method === 'POST') {
      let raw = '';
      for await (const chunk of req) raw += chunk;
      const form = new URLSearchParams(raw);
      const grant = codes.get(form.get('code') ?? '');
      codes.delete(form.get('code') ?? '');
      if (!grant || sha256(form.get('code_verifier') ?? '') !== grant.challenge || form.get('client_id') !== grant.clientId) return json(400, { error: 'invalid_grant' });
      const { account } = grant;
      const subject = account.subject ?? `sub-${account.email ?? 'nobody'}`;
      const accessToken = `access-${++issued}`;
      tokens.set(accessToken, account);
      const claims = { iss: 'fake', aud: grant.clientId, sub: subject, email: account.email ?? undefined, email_verified: account.email ? account.verified : undefined, name: account.name ?? undefined };
      return json(200, { access_token: accessToken, token_type: 'Bearer', id_token: `${base64url({ alg: 'none' })}.${base64url(claims)}.` });
    }
    if (url.pathname === '/me') {
      const account = tokens.get(url.searchParams.get('access_token') ?? '');
      if (!account) return json(401, { error: 'invalid_token' });
      // Facebook returns an e-mail only when it has verified one.
      return json(200, { id: account.subject ?? `sub-${account.email ?? 'nobody'}`, name: account.name ?? undefined, email: account.email && account.verified ? account.email : undefined });
    }
    json(404, { error: 'not_found' });
  });
  server.listen(0, host);
  await new Promise((resolve) => server.once('listening', resolve));
  const url = `http://${host}:${(server.address() as AddressInfo).port}`;
  const endpoints: ProviderEndpoints = { authorizeUrl: `${url}/authorize`, tokenUrl: `${url}/token`, userInfoUrl: `${url}/me` };
  return {
    url,
    endpoints,
    /** The next sign-in consents as this account. */
    answer(account: FakeAccount) {
      mode = { kind: 'answer', account };
    },
    /** The next sign-in comes back with error=access_denied, as a cancelled consent screen does. */
    cancel() {
      mode = { kind: 'cancel' };
    },
    /** The next sign-in comes back with a provider error. */
    fail() {
      mode = { kind: 'fail' };
    },
    close() {
      server.closeAllConnections();
      return new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

export type FakeProvider = Awaited<ReturnType<typeof startFakeProvider>>;
