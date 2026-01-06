// vite-plugin-elysia.ts
import { Readable } from "node:stream";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin, Connect, ViteDevServer, PreviewServer } from "vite";
import type { Elysia } from "elysia";

// 1. Universal Request Handler
async function handleElysia(
  req: IncomingMessage,
  res: ServerResponse,
  next: Connect.NextFunction,
  app: Elysia<any, any, any, any, any, any>,
  prefix: string
) {
  // Filter: Only handle requests starting with the prefix
  if (!req.url?.startsWith(prefix)) {
    return next();
  }

  try {
    const protocol = (req.socket as any).encrypted ? "https" : "http";
    const host = req.headers.host || "localhost";
    const url = `${protocol}://${host}${req.url}`;

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) {
        value.forEach((v) => headers.append(key, v));
      } else if (typeof value === "string") {
        headers.append(key, value);
      }
    }

    const method = req.method || "GET";
    const body =
      method === "GET" || method === "HEAD"
        ? undefined
        : (Readable.toWeb(req) as unknown as ReadableStream<Uint8Array>);

    const webReq = new Request(url, {
      method,
      headers,
      body,
      duplex: "half",
    });

    const response = await app.handle(webReq);

    if (!response) return next();

    res.statusCode = response.status;
    res.statusMessage = response.statusText;

    response.headers.forEach((value: string | number | readonly string[], key: string) => {
      if (key.toLowerCase() === "set-cookie") return;
      res.setHeader(key, value);
    });

    const cookies = response.headers.getSetCookie?.() || response.headers.get("set-cookie");
    if (cookies) res.setHeader("Set-Cookie", cookies);

    if (response.body) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    } else {
      res.end();
    }
  } catch (error) {
    console.error("Elysia Adapter Error:", error);
    res.statusCode = 500;
    res.end("Internal Server Error");
  }
}

// 2. The Plugin
export function elysiaConnect(
  app: Elysia<any, any, any, any, any, any>,
  options: { prefix?: string } = {}
): Plugin {
  const prefix = options.prefix || "/api";

  return {
    name: "vite-plugin-elysia-connect",
    // Runs in 'npm run dev'
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => 
        handleElysia(req, res, next, app, prefix)
      );
    },
    // Runs in 'npm run preview' (The fix for build test)
    configurePreviewServer(server: PreviewServer) {
      server.middlewares.use((req, res, next) => 
        handleElysia(req, res, next, app, prefix)
      );
    },
  };
}