const PUBG_APP_ID = "1450015065";
const MIDASBUY_PAGE_URL = "https://www.midasbuy.com/midasbuy/pk/buy/pubgm";
const MIDASBUY_LOOKUP_URL = "https://www.midasbuy.com/interface/getCharac";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

interface MidasbuyLookupResponse {
  ret?: number;
  info?: {
    charac_name?: string;
  };
}

function decodePlayerName(encodedName: string): string {
  try {
    return decodeURIComponent(encodedName);
  } catch {
    return encodedName;
  }
}

function extractToken(html: string): string | null {
  const match = html.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
  return match?.[0] ?? null;
}

function extractUuidCookie(setCookieHeaders: string[]): string {
  for (const header of setCookieHeaders) {
    const match = header.match(/UUID=([^;]+)/);
    if (match) return `UUID=${match[1]}`;
  }
  return "";
}

async function fetchMidasbuySession(): Promise<{
  token: string;
  cookie: string;
} | null> {
  const response = await fetch(MIDASBUY_PAGE_URL, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) return null;

  const html = await response.text();
  const token = extractToken(html);
  if (!token) return null;

  const setCookieHeaders =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [];

  const uuidCookie = extractUuidCookie(setCookieHeaders);
  const cookie = [uuidCookie, "shopcode=midasbuy", "country=pk"]
    .filter(Boolean)
    .join("; ");

  return { token, cookie };
}

async function lookupViaMidasbuy(uid: string): Promise<string | null> {
  const session = await fetchMidasbuySession();
  if (!session) return null;

  const params = new URLSearchParams({
    ctoken: session.token,
    appid: PUBG_APP_ID,
    currency_type: "PKR",
    country: "PK",
    midasbuyArea: "SouthAsia",
    sc: "",
    from: "",
    task_token: "",
    pf: "mds_hkweb_pc-v2-android-midasweb-midasbuy",
    zoneid: "1",
    _id: String(Math.random()),
    shopcode: "midasbuy",
    cgi_extend: "",
    buyType: "save",
    openid: uid,
  });

  const response = await fetch(`${MIDASBUY_LOOKUP_URL}?${params}`, {
    headers: {
      "User-Agent": USER_AGENT,
      Referer: MIDASBUY_PAGE_URL,
      Cookie: session.cookie,
    },
  });

  if (!response.ok) return null;

  const data = (await response.json()) as MidasbuyLookupResponse;
  const rawName = data.ret === 0 ? data.info?.charac_name?.trim() : undefined;
  return rawName ? decodePlayerName(rawName) : null;
}

export interface PlayerLookupResult {
  found: boolean;
  inGameName: string | null;
}

export async function lookupPlayerByUid(
  uid: string,
): Promise<PlayerLookupResult> {
  try {
    const inGameName = await lookupViaMidasbuy(uid);
    return {
      found: Boolean(inGameName),
      inGameName,
    };
  } catch (error) {
    console.error("Player lookup failed:", error);
    return {
      found: false,
      inGameName: null,
    };
  }
}
