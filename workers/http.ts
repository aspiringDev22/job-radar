const USER_AGENT = "JobRadar/0.1 (public career-page sync; local development)";
const HOST_DELAY_MS = 1000;
const MAX_ATTEMPTS = 3;

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

export async function fetchJson(url: string, body?: unknown): Promise<unknown> {
  const hostname = new URL(url).hostname;
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    await waitForHost(hostname);
    try {
      const response = await fetch(url, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          Accept: "application/json",
          "User-Agent": USER_AGENT,
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
      });

      if (isRetryable(response.status)) {
        throw new Error(`HTTP ${response.status} from ${hostname}`);
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} from ${hostname}`);
      }

      return (await response.json()) as unknown;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : "";
      const retryable = message.startsWith("HTTP 429") || message.startsWith("HTTP 5") || !message.startsWith("HTTP ");
      if (!retryable || attempt === MAX_ATTEMPTS) {
        break;
      }
      await sleep(500 * 2 ** (attempt - 1));
    }
  }

  const message = lastError instanceof Error ? lastError.message : "Request failed";
  throw new Error(message);
}
