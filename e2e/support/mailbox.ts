interface Mail {
  to: string;
  subject: string;
  text: string;
}

const outbox: Mail[] = [];

/** Stands in for the API's mail sender: keeps every mail here instead of sending it. */
export async function deliver(to: string, subject: string, text: string) {
  outbox.push({ to, subject, text });
}

export function clearMailbox() {
  outbox.length = 0;
}

export function mailFor(address: string): Mail[] {
  return outbox.filter((mail) => mail.to === address);
}

/** The invite link in the newest mail sent to the address. */
export function inviteLinkFor(address: string): string {
  const link = mailFor(address).at(-1)?.text.match(/http:\/\/\S+\/accept-invite\?\S+/);
  if (!link) throw new Error(`No invite mail arrived for ${address}`);
  return link[0];
}

/** The reset link in the newest mail sent to the address. */
export function resetLinkFor(address: string): string {
  const link = mailFor(address).at(-1)?.text.match(/http:\/\/\S+\/reset-password\?\S+/);
  if (!link) throw new Error(`No reset mail arrived for ${address}`);
  return link[0];
}
