interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

const outbox: Mail[] = [];

/** Stands in for the API's mail sender: keeps every mail here instead of sending it. */
export async function deliver(to: string, subject: string, text: string, html: string) {
  outbox.push({ to, subject, text, html });
}

export function clearMailbox() {
  outbox.length = 0;
}

export function mailFor(address: string): Mail[] {
  return outbox.filter((mail) => mail.to === address);
}

/** Waits up to 5 s for a mail to the address whose text holds a link matching `pattern`, and returns the newest such link. */
async function linkFor(address: string, pattern: RegExp, kind: string): Promise<string> {
  for (const deadline = Date.now() + 5000; Date.now() < deadline; await new Promise((r) => setTimeout(r, 50))) {
    const link = mailFor(address).at(-1)?.text.match(pattern);
    if (link) return link[0];
  }
  throw new Error(`No ${kind} mail arrived for ${address}`);
}

/** The invite link in the newest mail sent to the address, once it has arrived. */
export function inviteLinkFor(address: string): Promise<string> {
  return linkFor(address, /http:\/\/\S+\/accept-invite\?\S+/, 'invite');
}

/** The reset link in the newest mail sent to the address, once it has arrived. */
export function resetLinkFor(address: string): Promise<string> {
  return linkFor(address, /http:\/\/\S+\/reset-password\?\S+/, 'reset');
}
