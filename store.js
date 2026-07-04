/* Store — Supabase REST (mode « cloud », réponses partagées en direct)
   ou repli localStorage + BroadcastChannel (mode « démo local », même navigateur).
   Interface : Store.mode, Store.getAll(), Store.save(row), Store.watch(cb) */
(function () {
  const C = window.DPA_CONFIG || {};
  const cloud = !!(C.supabaseUrl && C.supabaseAnonKey && !/^https?:\/\/$/.test(C.supabaseUrl));
  const TABLE = "dpa_validations";
  const LKEY = "dpa_validations_local_v1";

  function nowISO() { return new Date().toISOString(); }

  const cloudStore = {
    mode: "cloud",
    base: C.supabaseUrl.replace(/\/+$/, "") + "/rest/v1/" + TABLE,
    hdr() {
      return { apikey: C.supabaseAnonKey, Authorization: "Bearer " + C.supabaseAnonKey,
               "Content-Type": "application/json" };
    },
    async getAll() {
      const r = await fetch(this.base + "?select=*", { headers: this.hdr() });
      if (!r.ok) throw new Error("Supabase GET " + r.status);
      const rows = await r.json();
      const map = {}; rows.forEach(x => map[x.ad_id] = x); return map;
    },
    async save(row) {
      row.updated_at = nowISO();
      const r = await fetch(this.base + "?on_conflict=ad_id", {
        method: "POST",
        headers: Object.assign(this.hdr(), { Prefer: "resolution=merge-duplicates,return=minimal" }),
        body: JSON.stringify(row)
      });
      if (!r.ok) throw new Error("Supabase POST " + r.status + " " + (await r.text()));
    },
    watch(cb) { setInterval(() => this.getAll().then(cb).catch(() => {}), 4000); }
  };

  const localStore = {
    mode: "local",
    bc: ("BroadcastChannel" in window) ? new BroadcastChannel("dpa-val") : null,
    read() { try { return JSON.parse(localStorage.getItem(LKEY) || "{}"); } catch (e) { return {}; } },
    async getAll() { return this.read(); },
    async save(row) {
      row.updated_at = nowISO();
      const all = this.read(); all[row.ad_id] = row;
      localStorage.setItem(LKEY, JSON.stringify(all));
      if (this.bc) this.bc.postMessage("changed");
    },
    watch(cb) {
      if (this.bc) this.bc.onmessage = () => cb(this.read());
      window.addEventListener("storage", e => { if (e.key === LKEY) cb(this.read()); });
    }
  };

  window.Store = cloud ? cloudStore : localStore;
})();
