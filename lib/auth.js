const crypto = require("crypto");

const AUTH_TTL_MS = 12 * 60 * 60 * 1000;

function getAuthSecret() {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;

  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "{}");
  return credentials.private_key || process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "ebf-2026-local";
}

function base64url(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function sign(payload) {
  return crypto.createHmac("sha256", getAuthSecret()).update(payload).digest("base64url");
}

function createToken(user) {
  const payload = base64url({
    user: user.usuario,
    name: user.nome || user.usuario,
    exp: Date.now() + AUTH_TTL_MS,
  });

  return `${payload}.${sign(payload)}`;
}

function verifyToken(token) {
  const [payload, signature] = String(token || "").split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== signatureBuffer.length) return null;
  if (!crypto.timingSafeEqual(expectedBuffer, signatureBuffer)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data.exp || Date.now() > data.exp) return null;
    return data;
  } catch (err) {
    return null;
  }
}

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

function requireAuth(req, res) {
  const session = verifyToken(getBearerToken(req));
  if (session) return session;

  res.status(401).json({ error: "Faça login para continuar." });
  return null;
}

module.exports = {
  AUTH_TTL_MS,
  createToken,
  requireAuth,
  verifyToken,
};
