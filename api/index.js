import express from "express";
import serverless from "serverless-http";
import cookieSession from "cookie-session";
import axios from "axios";

const app = express();
app.use(express.json());
app.use(cookieSession({
  name: "sess",
  secret: process.env.SESSION_SECRET || "devsecret",
  sameSite: "lax",
  httpOnly: true,
  secure: true   // set true in prod; if testing locally over http, you can set false
}));

const XERO_AUTH = "https://login.xero.com/identity/connect/authorize";
const XERO_TOKEN = "https://identity.xero.com/connect/token";

// health
app.get("/health", (req, res) => res.json({ ok: true }));

// start oauth
app.get("/oauth/login", (req, res) => {
  const scopes = [
    "offline_access", "openid", "profile", "email",
    "accounting.contacts.read", "accounting.settings.read",
    "accounting.transactions", "accounting.transactions.read"
  ].join(" ");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.XERO_CLIENT_ID,
    redirect_uri: process.env.XERO_REDIRECT_URI,
    scope: scopes,
    state: "prostencil"
  });

  res.redirect(`${XERO_AUTH}?${params.toString()}`);
});

// oauth callback
app.get("/oauth/callback", async (req, res) => {
  try {
    const tokenRes = await axios.post(
      XERO_TOKEN,
      new URLSearchParams({
        grant_type: "authorization_code",
        code: req.query.code,
        redirect_uri: process.env.XERO_REDIRECT_URI,
        client_id: process.env.XERO_CLIENT_ID,
        client_secret: process.env.XERO_CLIENT_SECRET
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    req.session.tokens = tokenRes.data;

    // get tenant
    const tenRes = await axios.get("https://api.xero.com/connections", {
      headers: { Authorization: `Bearer ${tokenRes.data.access_token}` }
    });
    const tenant = tenRes.data?.[0];
    if (!tenant) return res.status(400).send("No tenant connected");

    req.session.tenantId = tenant.tenantId;

    // go to portal home
    res.redirect("/portal");
  } catch (e) {
    console.error("OAuth error", e?.response?.data || e.message);
    res.status(500).send("OAuth error");
  }
});

// simple portal page
app.get("/portal", (req, res) => {
  const authed = Boolean(req.session.tokens && req.session.tenantId);
  res.setHeader("Content-Type", "text/html");
  res.end(`<!doctype html><html><body style="font-family:sans-serif;padding:24px;">
    <h2>ProStencil Portal</h2>
    ${authed ? `
      <p>Connected to Xero. <a href="/api/orders">View your orders (demo)</a></p>
    ` : `
      <p><a href="/oauth/login">Connect to Xero</a></p>
    `}
  </body></html>`);
});

// demo: list invoices (you’ll later filter by ContactID)
app.get("/api/orders", async (req, res) => {
  try {
    const access = req.session.tokens?.access_token;
    const tenantId = req.session.tenantId;
    if (!access || !tenantId) return res.status(401).json({ error: "unauthorized" });

    const r = await axios.get("https://api.xero.com/api.xro/2.0/Invoices", {
      headers: { Authorization: `Bearer ${access}`, "Xero-tenant-id": tenantId },
      params: { statuses: "AUTHORISED,PAID", order: "Date DESC", page: 1, summaryOnly: true }
    });

    res.json(r.data);
  } catch (e) {
    console.error("Orders error", e?.response?.data || e.message);
    res.status(500).json({ error: "orders failed" });
  }
});

export default serverless(app);
