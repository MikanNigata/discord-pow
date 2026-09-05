import { Hono } from "hono";
import { verifyPageCss, verifyPageHtml, verifyPageJs, verifyWorkerJs } from "./assets";

const CSP =
  "default-src 'self'; connect-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'";

function htmlResponse(body: string): Response {
  return new Response(body, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "content-security-policy": CSP,
    },
  });
}

function jsResponse(body: string): Response {
  return new Response(body, {
    headers: {
      "content-type": "text/javascript; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function cssResponse(body: string): Response {
  return new Response(body, {
    headers: {
      "content-type": "text/css; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

const verify = new Hono()
  .get("/verify", (c) => htmlResponse(verifyPageHtml()))
  .get("/verify.js", (c) => jsResponse(verifyPageJs()))
  .get("/verify-worker.js", (c) => jsResponse(verifyWorkerJs()))
  .get("/verify.css", (c) => cssResponse(verifyPageCss()));

export default verify;
export type VerifyAppType = typeof verify;