// Gateway core: asks the website for waiting WhatsApp messages and sends them one by one.
// Kept separate from the WhatsApp library so it can be tested without a real phone.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function createWorker({ apiUrl, secret, send, isConnected, myNumber = () => "", delay = [1500, 3500], pollMs = 300, fetchImpl = fetch, log = console.log }) {
  let running = false;
  const headers = { "x-wa-secret": secret, "Content-Type": "application/json" };

  async function pull() {
    const q = `connected=${isConnected() ? 1 : 0}&number=${encodeURIComponent(myNumber())}`;
    const res = await fetchImpl(`${apiUrl}/wa/pending?${q}`, { headers });
    if (!res.ok) throw new Error(`pending ${res.status}`);
    return res.json();
  }

  async function report(body) {
    try { await fetchImpl(`${apiUrl}/wa/report`, { method: "POST", headers, body: JSON.stringify(body) }); }
    catch (e) { log("report failed:", e.message); }
  }

  /** One round: fetch a batch, send each, report each. Returns how many were handled. */
  async function round() {
    const batch = await pull();
    for (let i = 0; i < batch.length; i++) {
      const m = batch[i];
      try {
        await send(m.to, m.text);
        await report({ id: m.id, ok: true });
        log(`sent -> ${m.to}`);
      } catch (e) {
        await report({ id: m.id, ok: false, error: e.message, permanent: !!e.permanent });
        log(`FAILED -> ${m.to}: ${e.message}`);
      }
      if (i < batch.length - 1) await sleep(delay[0] + Math.random() * (delay[1] - delay[0]));
    }
    return batch.length;
  }

  async function loop() {
    running = true;
    while (running) {
      let n = 0;
      try { n = await round(); } catch (e) { log("poll error:", e.message); }
      if (n === 0) await sleep(pollMs);
      else await sleep(delay[0]); // more may be waiting: go straight back for the next batch
    }
  }

  return { round, loop, stop: () => { running = false; } };
}
