const GAS_URL = "https://script.google.com/macros/s/AKfycbwXRfo3G3Y2m5SU9j719Xdw4gLmzThVD9_3rNiy2MUxlrIAa_Bv7TuV0EW6tOmdXkMjAg/exec";

export async function onRequest(context) {
  const { request } = context;
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (request.method !== "POST") {
    return json({ status: false, message: "Gunakan metode POST untuk API SIPKS.", data: null }, 405);
  }
  try {
    const body = await request.text();
    let parsedBody;
    try { parsedBody = JSON.parse(body); }
    catch (_) { return json({ status: false, message: "Request JSON tidak valid.", data: null }, 400); }
    if (String(parsedBody.action || "").toLowerCase() === "setup") {
      return json({ status: false, message: "Aksi setup hanya boleh dijalankan manual dari editor Apps Script.", data: null }, 403);
    }
    // Server-side proxy avoids browser CORS issues; GAS remains the source of truth.
    const upstream = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json;charset=UTF-8" },
      body,
      redirect: "follow"
    });
    const text = await upstream.text();
    let parsed;
    try { parsed = JSON.parse(text); }
    catch (_) {
      return json({ status: false, message: "Google Apps Script tidak mengembalikan JSON. Pastikan doPost dipasang dan deployment Apps Script diperbarui.", data: null, upstreamStatus: upstream.status }, 502);
    }
    return json(parsed, upstream.ok ? 200 : upstream.status);
  } catch (err) {
    return json({ status: false, message: "Proxy Cloudflare gagal menghubungi Apps Script: " + (err && err.message ? err.message : String(err)), data: null }, 502);
  }
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store"
  };
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json; charset=utf-8" }
  });
}
