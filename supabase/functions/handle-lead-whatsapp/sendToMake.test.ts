import { expect, test } from "bun:test";
import { createServer, type Server } from "node:http";
import { DEFAULT_TIMEOUT_MS, sendToMake } from "./sendToMake.ts";

const payload = { phone: "40799069256", message: "test" };

async function withServer(
  onRequest: Parameters<typeof createServer>[0],
  run: (url: string) => Promise<void>,
) {
  const server: Server = createServer(onRequest);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  try {
    await run(`http://127.0.0.1:${port}/hook`);
  } finally {
    server.closeAllConnections?.();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

test("Make.com gets at most 3 seconds before the form is answered", () => {
  expect(DEFAULT_TIMEOUT_MS).toBe(3000);
});

test("webhook that answers slowly is abandoned at the timeout, not awaited", async () => {
  await withServer(
    (_req, res) => setTimeout(() => res.end("late"), 5000),
    async (url) => {
      const started = Date.now();
      const result = await sendToMake(url, payload, 300);
      expect(result.status).toBe("timeout");
      expect(Date.now() - started).toBeLessThan(1500);
    },
  );
});

test("webhook error is reported as failed and never thrown", async () => {
  await withServer(
    (_req, res) => {
      res.statusCode = 500;
      res.end("boom");
    },
    async (url) => {
      const result = await sendToMake(url, payload);
      expect(result.status).toBe("failed");
      expect(result.httpStatus).toBe(500);
    },
  );
});

test("webhook that accepts the payload is reported as sent", async () => {
  await withServer(
    (req, res) => {
      req.resume();
      res.end("ok");
    },
    async (url) => {
      const result = await sendToMake(url, payload);
      expect(result.status).toBe("sent");
      expect(result.httpStatus).toBe(200);
    },
  );
});

test("unreachable webhook is reported as network_error and never thrown", async () => {
  const result = await sendToMake("http://127.0.0.1:1/hook", payload, 300);
  expect(result.status).toBe("network_error");
  expect(result.httpStatus).toBe(0);
});
