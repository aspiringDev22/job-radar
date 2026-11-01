const USER_AGENT = "JobRadar/0.1 (public career-page sync; local development)";
const HOST_DELAY_MS = 1000;
const MAX_ATTEMPTS = 3;
const TIMEOUT_MS = 30_000;

export type FetchOptions = {
  // Total tries, including the first. Defaults to 3.
  attempts?: number;
  timeoutMs?: number;
  // "manual" turns a redirect into an error, for probes where a redirect means "no such board".
  redirect?: "follow" | "manual";
};

const lastRequestAt = new Map<string, number>();
const hostChain = new Map<string, Promise<void>>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function waitForHost(hostname: string): Promise<void> {
  const previous = hostChain.get(hostname) ?? Promise.resolve();
  const turn = previous.then(async () => {
    const elapsed = Date.now() - (lastRequestAt.get(hostname) ?? 0);
    const remaining = HOST_DELAY_MS - elapsed;
    if (remaining > 0) {
      await sleep(remaining);
    }
    lastRequestAt.set(hostname, Date.now());
  });
  hostChain.set(hostname, turn.catch(() => undefined));
  return turn;
}

function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

async function request<T>(
  url: string,
  init: { method: string; accept: string; body?: string },
  options: FetchOptions,
  read: (response: Response) => Promise<T>,
): Promise<T> {
  const hostname = new URL(url).hostname;
  const attempts = options.attempts ?? MAX_ATTEMPTS;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    await waitForHost(hostname);
    try {
      const response = await fetch(url, {
        method: init.method,
        headers: {
          Accept: init.accept,
          "User-Agent": USER_AGENT,
          ...(init.body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: init.body,
        redirect: options.redirect ?? "follow",
        signal: AbortSignal.timeout(options.timeoutMs ?? TIMEOUT_MS),
      });

      if (isRetryable(response.status)) {
        throw new Error(`HTTP ${response.status} from ${hostname}`);
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} from ${hostname}`);
      }

      return await read(response);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : "";
      const retryable = message.startsWith("HTTP 429") || message.startsWith("HTTP 5") || !message.startsWith("HTTP ");
      if (!retryable || attempt === attempts) {
        break;
      }
      await sleep(500 * 2 ** (attempt - 1));
    }
  }

  const message = lastError instanceof Error ? lastError.message : "Request failed";
  throw new Error(message);
}

export async function fetchJson(url: string, body?: unknown, options: FetchOptions = {}): Promise<unknown> {
  return request(
    url,
    {
      method: body === undefined ? "GET" : "POST",
      accept: "application/json",
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    options,
    async (response) => (await response.json()) as unknown,
  );
}

// For careers pages and robots.txt. Shares the per-host delay with fetchJson.
export async function fetchText(url: string, options: FetchOptions = {}): Promise<string> {
  return request(url, { method: "GET", accept: "text/html,text/plain;q=0.9,*/*;q=0.8" }, options, (response) =>
    response.text(),
  );
}
