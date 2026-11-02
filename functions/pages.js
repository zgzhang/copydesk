const FILE_RE = /^[A-Za-z0-9._-]+\.[A-Za-z0-9]{2,8}$/;

export const RESERVED = new Set([
  "home",
  "index",
  "guide",
  "open",
  "favicon.ico",
  "robots.txt",
  "assets",
  "admin-panel",
]);

export const ROBOTS = "User-agent: GPTBot\nDisallow: /\n";

export function esc(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function safePrefix(raw) {
  let decoded = String(raw || "");
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // keep raw
  }
  const out = [];
  for (const ch of decoded) {
    if (/[A-Za-z0-9._~-]/.test(ch)) out.push(ch);
    if (out.length >= 2048) break;
  }
  return out.join("");
}

export function isRecordableName(name) {
  if (!name) return false;
  if (RESERVED.has(name.toLowerCase())) return false;
  return FILE_RE.test(name);
}

export function fileKind(name) {
  const ext = String(name || "").split(".").pop().toLowerCase();
  if (["md", "txt", "rst", "log", "csv"].includes(ext)) return "Text document";
  if (ext === "pdf") return "PDF document";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return "Image";
  if (["xlsx", "xls"].includes(ext)) return "Spreadsheet";
  if (["doc", "docx", "rtf"].includes(ext)) return "Document";
  if (["zip", "gz", "7z", "tar"].includes(ext)) return "Archive";
  if (ext) return `${ext.toUpperCase()} file`;
  return "File";
}

function layout(title, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <style>
    body { margin: 0; background: #f4f1ea; color: #1c1c1c; font-family: Georgia, serif; }
    .wrap { max-width: 36rem; margin: 3rem auto; padding: 0 1.25rem 3rem; }
    .kicker { font-family: system-ui, sans-serif; letter-spacing: 0.12em; text-transform: uppercase; font-size: 0.72rem; color: #7a6548; }
    h1 { font-size: 1.8rem; font-weight: 500; margin: 0.2rem 0 0.7rem; }
    .lede { color: #4a4a4a; margin: 0 0 1.4rem; }
    form { display: flex; gap: 8px; }
    input[name="n"] { flex: 1; padding: 10px 12px; border: 1px solid #d9d0c0; border-radius: 4px; font: inherit; }
    button { padding: 10px 16px; border: 0; border-radius: 4px; background: #1c1c1c; color: #fff; font-family: system-ui, sans-serif; }
    .name { font-family: ui-monospace, monospace; }
    .meta { font-family: system-ui, sans-serif; color: #7a6548; font-size: 0.85rem; margin: 0 0 1.2rem; }
    .stage { background: #fff; border: 1px solid #d9d0c0; border-radius: 6px; min-height: 22rem; padding: 1.25rem; }
    .sheet { min-height: 18rem; background: repeating-linear-gradient(#fff, #fff 27px, #efe8dc 28px); }
    a { color: #1c1c1c; }
  </style>
</head>
<body>
${body}
</body>
</html>`;
}

export function homePage() {
  const body = `<div class="wrap">
    <p class="kicker">Copydesk</p>
    <h1>Pages</h1>
    <p class="lede">Open a file to preview it.</p>
    <form action="/open" method="get">
      <input type="text" name="n" required placeholder="filename" autocomplete="off">
      <button type="submit">Open</button>
    </form>
  </div>`;
  return layout("Copydesk", body);
}

export function previewPage(name) {
  const kind = fileKind(name);
  const body = `<div class="wrap">
    <p class="kicker">Copydesk</p>
    <h1 class="name">${esc(name)}</h1>
    <p class="meta">${esc(kind)} · Preview</p>
    <div class="stage"><div class="sheet"></div></div>
    <p><a href="/">Back to pages</a></p>
  </div>`;
  return layout(name, body);
}

export function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export function html(value) {
  return new Response(value, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export function routePublic(request) {
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);

  if (request.method === "GET" && url.pathname === "/robots.txt") {
    return new Response(ROBOTS, {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  if (request.method === "GET" && url.pathname === "/favicon.ico") {
    return new Response(null, { status: 204 });
  }
  if (request.method === "GET" && url.pathname === "/open") {
    const raw = url.searchParams.get("n") || url.searchParams.get("name") || "";
    const prefix = safePrefix(raw);
    if (isRecordableName(prefix)) {
      return Response.redirect(new URL(`/${prefix}`, url).toString(), 302);
    }
    return html(homePage());
  }
  if (
    request.method === "GET" &&
    (url.pathname === "/" || url.pathname === "/home" || url.pathname === "/index" || url.pathname === "/guide")
  ) {
    return html(homePage());
  }
  if (request.method === "GET" && parts.length === 1) {
    const prefix = safePrefix(parts[0]);
    if (!prefix || RESERVED.has(prefix.toLowerCase())) {
      return json({ ok: false, error: "not found" }, 404);
    }
    if (isRecordableName(prefix)) {
      return html(previewPage(prefix));
    }
    return html(homePage());
  }
  return json({ ok: false, error: "not found" }, 404);
}
