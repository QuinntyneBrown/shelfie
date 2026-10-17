const MAILBOX = 'http://localhost:8025/messages';

interface Mail {
  to: string[];
  raw: string;
}

export async function clearMailbox() {
  await fetch(MAILBOX, { method: 'DELETE' });
}

export async function mailFor(address: string): Promise<Mail[]> {
  const all = (await (await fetch(MAILBOX)).json()) as Mail[];
  return all.filter((mail) => mail.to.includes(address));
}

/** The reset link in the newest mail sent to the address, once it has arrived. */
export async function resetLinkFor(address: string): Promise<string> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const mails = await mailFor(address);
    const link = mails.at(-1)?.raw.match(/http:\/\/\S+\/reset-password\?\S+/);
    if (link) return link[0];
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`No reset mail arrived for ${address}`);
}
