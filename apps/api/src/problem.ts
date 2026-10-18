export class Problem extends Error {
  status: number;
  type: string;
  extra: Record<string, unknown>;

  constructor(status: number, type: string, extra: Record<string, unknown> = {}) {
    super(type);
    this.status = status;
    this.type = type;
    this.extra = extra;
  }
}
