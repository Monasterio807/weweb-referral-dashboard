<template>
  <div class="hrk-root">
    <main class="hrk-page hrk-page--referral">

      <!-- Ladezustand -->
      <div v-if="uiState === 'loading'" class="hrk-state">
        <div class="hrk-spinner" aria-hidden="true"></div>
        <p class="hrk-muted">Lade deinen Empfehlungs-Code …</p>
      </div>

      <!-- Nicht eingeloggt -->
      <div v-else-if="uiState === 'authError'" class="hrk-card" role="alert">
        <p class="hrk-muted">Du musst eingeloggt sein, um deinen Empfehlungs-Code zu sehen.</p>
      </div>

      <!-- Ladefehler -->
      <div v-else-if="uiState === 'loadError'" class="hrk-card" role="alert">
        <p class="hrk-muted">
          Der Empfehlungs-Code konnte nicht geladen werden — bitte die Seite neu laden.
        </p>
      </div>

      <!-- Geladen -->
      <template v-else-if="uiState === 'loaded'">

        <!-- Intro -->
        <p class="hrk-muted ref-dash__intro">
          Empfehle Imploya weiter und profitiere: Für jeden Freund, der sich anmeldet und abonniert, erhältst du <strong>1 Monat gratis</strong>.
        </p>

        <!-- Code + Link -->
        <div class="hrk-card ref-dash__card">

          <!-- Persönlicher Code -->
          <div class="ref-dash__code-section">
            <p class="hrk-label hrk-muted hrk-small" style="margin: 0 0 var(--hrk-space-2);">
              Dein persönlicher Code
            </p>
            <p class="ref-dash__code" aria-label="Dein Empfehlungs-Code">{{ referralCode }}</p>
          </div>

          <!-- Empfehlungs-Link -->
          <div class="hrk-field ref-dash__link-field">
            <label class="hrk-label" for="ref-dash-link">Dein Empfehlungs-Link</label>
            <div class="ref-dash__link-row">
              <input
                id="ref-dash-link"
                class="hrk-input ref-dash__link-input"
                type="text"
                :value="referralLink"
                readonly
                @click="selectInput"
              />
              <button
                class="hrk-btn ref-dash__copy-btn"
                :class="copied ? 'hrk-btn--secondary' : 'hrk-btn--primary'"
                :aria-label="copied ? 'Link in die Zwischenablage kopiert' : 'Empfehlungs-Link kopieren'"
                @click="copyLink"
              >
                <span v-if="copied">✓&nbsp;Kopiert!</span>
                <span v-else>Link kopieren</span>
              </button>
            </div>
            <p v-if="copied" class="hrk-hint" role="status" aria-live="polite">
              Link wurde in die Zwischenablage kopiert.
            </p>
          </div>

        </div>

        <!-- Stats (graceful: nur anzeigen wenn Daten vorhanden) -->
        <div v-if="showStats" class="hrk-card ref-dash__stats-card">
          <h2 class="hrk-h2 ref-dash__stats-title">Deine Empfehlungen</h2>
          <dl class="hrk-dl">
            <div class="hrk-dl__row">
              <dt>Freunde eingeladen</dt>
              <dd>{{ invitedCount }}</dd>
            </div>
            <div class="hrk-dl__row">
              <dt>Davon abonniert</dt>
              <dd>{{ qualifiedCount }}</dd>
            </div>
            <div v-if="rewardCount > 0" class="hrk-dl__row">
              <dt>Gratismonate verdient</dt>
              <dd>{{ rewardCount }}</dd>
            </div>
          </dl>
          <p v-if="invitedCount === 0" class="hrk-muted hrk-small ref-dash__empty-hint">
            Noch keine Einladungen — teile deinen Link und leg los!
          </p>
        </div>

      </template>

    </main>
  </div>
</template>

<script>
/**
 * WeWeb Coded Component — Referral-Dashboard (HRklar / HR am Tisch)
 *
 * Zeigt dem eingeloggten User:
 *  1) seinen persönlichen Empfehlungs-Code (via RPC ensure_referral_code)
 *  2) einen kopierbaren Empfehlungs-Link (baseUrl?ref=CODE)
 *  3) Stats aus der referrals-Tabelle (RLS-gesichert: nur eigene Zeilen)
 *
 * Datenquellen:
 *  - referral_codes: user_id (uuid), code (text), created_at
 *  - referrals: id, referrer_user_id, referred_user_id, code, status,
 *               qualified_at, rewarded_at, reward_referrer, reward_referred
 *  - RPC ensure_referral_code() → gibt Code zurück oder erstellt ihn
 *
 * Sicherheit:
 *  - Nur Anon-Key + User-JWT; RLS ist der echte Schutz.
 *  - Stats werden bei fehlendem Zugriff lautlos weggelassen (keine Fehlermeldung).
 */
export default {
  props: {
    content: { type: Object, required: true },
    uid: { type: String, required: false, default: '' },
    /* wwEditor:start */
    wwEditorState: { type: Object, required: false, default: () => ({}) },
    /* wwEditor:end */
  },
  emits: ['trigger-event'],

  data() {
    return {
      uiState: 'loading',  // 'loading' | 'authError' | 'loadError' | 'loaded'
      referralCode: '',
      invitedCount: 0,
      qualifiedCount: 0,
      rewardCount: 0,
      showStats: false,
      copied: false,
      copyTimer: null,
    };
  },

  computed: {
    isEditing() {
      try {
        return !!(this.wwEditorState && this.wwEditorState.isEditing);
      } catch (e) {
        return false;
      }
    },
    hasAuth() {
      return !!(this.content && ((this.content && this.content.authToken) || (typeof wwLib !== 'undefined' && wwLib.globalContext && wwLib.globalContext.auth && wwLib.globalContext.auth.session && wwLib.globalContext.auth.session.access_token) || ''));
    },
    supabaseBase() {
      let url = (this.content && this.content.supabaseUrl) || 'https://ztvqsxdudzdyqgeylujr.supabase.co';
      if (/nemxnflngcfrpamkuesm/.test(String(url))) url = 'https://ztvqsxdudzdyqgeylujr.supabase.co';
      return String(url).replace(/\/+$/, '');
    },
    referralBaseUrl() {
      const url = (this.content && this.content.baseUrl) || 'https://app.imploya.ch';
      return String(url).replace(/\/+$/, '');
    },
    referralLink() {
      if (!this.referralCode) return '';
      return `${this.referralBaseUrl}?ref=${this.referralCode}`;
    },
    authHeaders() {
      const key = (this.content && this.content.apiKey) || 'sb_publishable_4rsRb_VB3l_45JO7sw0VSA_ODDS4CZc';
      const rawToken = ((this.content && ((this.content && this.content.authToken) || (typeof wwLib !== 'undefined' && wwLib.globalContext && wwLib.globalContext.auth && wwLib.globalContext.auth.session && wwLib.globalContext.auth.session.access_token) || '')) || '').toString().trim();
      const bearer = rawToken.startsWith('Bearer ') ? rawToken : `Bearer ${rawToken}`;
      return {
        apikey: key,
        Authorization: bearer,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };
    },
  },

  watch: {
    'content.authToken'(newVal) {
      if (newVal && this.uiState === 'authError') {
        this.init();
      }
    },
  },

  mounted() {
    // Im Editor einen Vorschau-Zustand zeigen (kein echter API-Call)
    if (this.isEditing) {
      this.referralCode = 'DEMO42';
      this.invitedCount = 3;
      this.qualifiedCount = 1;
      this.rewardCount = 1;
      this.showStats = true;
      this.uiState = 'loaded';
      return;
    }
    this.init();
  },

  beforeUnmount() {
    if (this.copyTimer) clearTimeout(this.copyTimer);
  },

  methods: {
    // ----------------------------------------------------------------
    // Hilfsmethoden
    // ----------------------------------------------------------------

    /** fetch mit AbortController-Timeout (10s Default) */
    async fetchWithTimeout(url, options, ms) {
      const timeout = ms || 10000;
      const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = ac ? setTimeout(() => ac.abort(), timeout) : null;
      try {
        return await fetch(url, ac ? { ...options, signal: ac.signal } : options);
      } finally {
        if (timer) clearTimeout(timer);
      }
    },

    emitEvent(name, payload) {
      this.$emit('trigger-event', { name, event: payload || {} });
    },

    // ----------------------------------------------------------------
    // Laden
    // ----------------------------------------------------------------

    async init() {
      if (!this.hasAuth) {
        this.uiState = 'authError';
        return;
      }
      this.uiState = 'loading';
      try {
        const code = await this.loadCode();
        if (!code) throw Object.assign(new Error('no_code'), { reason: 'load' });
        this.referralCode = code;
        this.emitEvent('loaded', { code });

        // Stats: best-effort, kein Fehler wenn RLS verweigert
        await this.loadStats().catch(() => { /* graceful degradation */ });

        this.uiState = 'loaded';
      } catch (e) {
        const reason = e && e.reason;
        if (reason === 'auth') {
          this.uiState = 'authError';
        } else {
          this.uiState = 'loadError';
        }
        this.emitEvent('error', { reason: reason || 'load' });
      }
    },

    /**
     * Ruft RPC ensure_referral_code() auf.
     * PostgREST gibt den Rückgabewert je nach Funktionsdeklaration als:
     *  - String "ABC123"  (RETURNS text, als JSON-String)
     *  - Array ["ABC123"] (SETOF text)
     *  - Array [{"code":"ABC123"}] (RETURNS TABLE(code text))
     *  Wir normalisieren alle Fälle.
     */
    async loadCode() {
      const res = await this.fetchWithTimeout(
        `${this.supabaseBase}/rest/v1/rpc/ensure_referral_code`,
        {
          method: 'POST',
          headers: this.authHeaders,
          body: JSON.stringify({}),
        },
      );

      if (res.status === 401 || res.status === 403) {
        throw Object.assign(new Error('auth'), { reason: 'auth' });
      }
      if (!res.ok) {
        throw Object.assign(new Error('http'), { reason: 'load' });
      }

      const data = await res.json().catch(() => null);
      return this.extractCode(data);
    },

    /** Normalisiert den RPC-Rückgabewert zu einem string */
    extractCode(data) {
      if (!data && data !== 0) return '';
      // Direkt als String
      if (typeof data === 'string') return data.trim();
      // Array: SETOF text -> ["CODE"] oder RETURNS TABLE -> [{code:"CODE"}]
      if (Array.isArray(data) && data.length > 0) {
        const first = data[0];
        if (typeof first === 'string') return first.trim();
        if (first && typeof first === 'object') {
          return (first.code || first.referral_code || Object.values(first)[0] || '').toString().trim();
        }
      }
      // Objekt-Rückgabe
      if (typeof data === 'object') {
        return (data.code || data.referral_code || '').toString().trim();
      }
      return String(data).trim();
    },

    /**
     * Lädt Referral-Stats aus der referrals-Tabelle.
     * RLS filtert automatisch auf referrer_user_id = auth.uid().
     * Schlägt die Query fehl (403, 404, kein Zugriff), wird showStats false gelassen.
     */
    async loadStats() {
      const res = await this.fetchWithTimeout(
        `${this.supabaseBase}/rest/v1/referrals?select=id,status,reward_referrer,rewarded_at`,
        {
          method: 'GET',
          headers: {
            ...this.authHeaders,
            Prefer: 'return=representation',
          },
        },
      );

      if (!res.ok) return; // graceful: keine Stats wenn kein Zugriff

      const rows = await res.json().catch(() => null);
      if (!Array.isArray(rows)) return;

      this.invitedCount = rows.length;
      this.qualifiedCount = rows.filter(
        r => r.status === 'qualified' || r.status === 'rewarded',
      ).length;
      this.rewardCount = rows.filter(
        r => r.reward_referrer === true && r.rewarded_at != null,
      ).length;
      this.showStats = true;
    },

    // ----------------------------------------------------------------
    // Copy-to-Clipboard
    // ----------------------------------------------------------------

    selectInput(event) {
      try { event.target.select(); } catch (e) { /* noop */ }
    },

    async copyLink() {
      if (!this.referralLink) return;
      const link = this.referralLink;

      try {
        await navigator.clipboard.writeText(link);
      } catch (_) {
        // Fallback für ältere Browser oder fehlende Permissions
        try {
          const el = document.createElement('textarea');
          el.value = link;
          el.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
          document.body.appendChild(el);
          el.focus();
          el.select();
          document.execCommand('copy');
          document.body.removeChild(el);
        } catch (e2) {
          // Wenn gar nichts geht, trotzdem kein Fehler anzeigen
          console.warn('[referral-dashboard] Clipboard-Fallback fehlgeschlagen:', e2);
          return;
        }
      }

      this.copied = true;
      this.emitEvent('copied', { link });
      if (this.copyTimer) clearTimeout(this.copyTimer);
      this.copyTimer = setTimeout(() => { this.copied = false; }, 2500);
    },
  },
};
</script>

<style scoped>
/* ============================================================
   HR am Tisch — Design-Tokens
   (inline kopiert aus design-tokens.css — Quelle der Wahrheit)
   ============================================================ */
:root, .hrk-root {
  --hrk-bordeaux:        #7B2D3B;
  --hrk-bordeaux-dark:   #5E2129;
  --hrk-bordeaux-soft:   #F3E7E9;
  --hrk-creme:           #FBF8F3;
  --hrk-anthrazit:       #2B2B2B;
  --hrk-gold:            #C9A24B;
  --hrk-surface:         #FFFFFF;
  --hrk-surface-muted:   #F5F1EB;
  --hrk-border:          #ECE5D9;
  --hrk-border-strong:   #DAD2C6;
  --hrk-text:            #2B2B2B;
  --hrk-text-muted:      #6B6357;
  --hrk-success:         #2E7D5B;  --hrk-success-bg: #E5F1EB;
  --hrk-warning:         #B7791F;  --hrk-warning-bg: #FBF1DD;
  --hrk-danger:          #B23A48;  --hrk-danger-bg:  #F8E7E9;
  --hrk-info:            #2F6F9F;  --hrk-info-bg:    #E6F0F7;
  --hrk-neutral:         #6B6357;  --hrk-neutral-bg: #EFEAE2;
  --hrk-font-head: "Fraunces", "Lora", Georgia, serif;
  --hrk-font-body: "Inter", "Source Sans 3", system-ui, sans-serif;
  --hrk-fs-h1:    1.9375rem;
  --hrk-fs-h2:    1.375rem;
  --hrk-fs-h3:    1.125rem;
  --hrk-fs-body:  1.0625rem;
  --hrk-fs-small: 0.9375rem;
  --hrk-lh-body:  1.55;
  --hrk-fw-regular: 400; --hrk-fw-medium: 500; --hrk-fw-semibold: 600;
  --hrk-space-1: 4px;  --hrk-space-2: 8px;  --hrk-space-3: 12px;
  --hrk-space-4: 16px; --hrk-space-5: 24px; --hrk-space-6: 32px;
  --hrk-space-7: 48px;
  --hrk-radius-sm:   8px;
  --hrk-radius-md:   12px;
  --hrk-radius-lg:   14px;
  --hrk-radius-pill: 999px;
  --hrk-shadow-card: 0 1px 2px rgba(40,35,30,.05);
  --hrk-shadow-pop:  0 8px 28px rgba(40,35,30,.12);
  --hrk-focus-ring:  0 0 0 3px rgba(123,45,59,.30);
  --hrk-tap-min:  44px;
  --hrk-page-max: 880px;
}

/* --- Basis --- */
.hrk-root, .hrk-root * { box-sizing: border-box; }
.hrk-root {
  font-family: var(--hrk-font-body);
  font-size: var(--hrk-fs-body);
  line-height: var(--hrk-lh-body);
  color: var(--hrk-text);
  background: var(--hrk-creme);
  -webkit-font-smoothing: antialiased;
}
.hrk-page {
  max-width: var(--hrk-page-max);
  margin: 0 auto;
  padding: var(--hrk-space-6) var(--hrk-space-4);
}
.hrk-h2 {
  font-family: var(--hrk-font-head);
  font-size: var(--hrk-fs-h2);
  font-weight: var(--hrk-fw-semibold);
  line-height: 1.2;
  letter-spacing: -.01em;
  color: var(--hrk-bordeaux);
  margin: 0 0 var(--hrk-space-3);
}
.hrk-muted  { color: var(--hrk-text-muted); }
.hrk-small  { font-size: var(--hrk-fs-small); }
.hrk-label  { display: block; font-weight: var(--hrk-fw-medium); margin-bottom: var(--hrk-space-1); }
.hrk-hint   { color: var(--hrk-text-muted); font-size: var(--hrk-fs-small); margin-top: var(--hrk-space-1); }

/* --- Knöpfe --- */
.hrk-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: var(--hrk-space-2);
  min-height: var(--hrk-tap-min); padding: 0 var(--hrk-space-5);
  font: inherit; font-weight: var(--hrk-fw-semibold);
  border-radius: var(--hrk-radius-md); border: 1px solid transparent;
  cursor: pointer; text-decoration: none;
  transition: background .15s, border-color .15s, transform .05s;
  white-space: nowrap;
}
.hrk-btn:active { transform: translateY(1px); }
.hrk-btn:focus-visible { outline: none; box-shadow: var(--hrk-focus-ring); }
.hrk-btn--primary   { background: var(--hrk-bordeaux); color: var(--hrk-on-primary); }
.hrk-btn--primary:hover { background: var(--hrk-bordeaux-dark); }
.hrk-btn--secondary { background: var(--hrk-surface); color: var(--hrk-bordeaux); border-color: var(--hrk-border-strong); }
.hrk-btn--secondary:hover { background: var(--hrk-bordeaux-soft); }

/* --- Eingabefelder --- */
.hrk-field  { display: block; margin-bottom: 0; }
.hrk-input {
  width: 100%; min-height: var(--hrk-tap-min); padding: var(--hrk-space-3);
  font: inherit; color: var(--hrk-text); background: var(--hrk-surface);
  border: 1px solid var(--hrk-border); border-radius: var(--hrk-radius-sm);
}
.hrk-input:focus { outline: none; border-color: var(--hrk-bordeaux); box-shadow: var(--hrk-focus-ring); }

/* --- Karte --- */
.hrk-card {
  background: var(--hrk-surface);
  border: 1px solid var(--hrk-border);
  border-radius: var(--hrk-radius-lg);
  box-shadow: var(--hrk-shadow-card);
  padding: var(--hrk-space-5);
}

/* --- Schlüsseldaten-Liste --- */
.hrk-dl { margin: 0; }
.hrk-dl__row {
  display: flex; align-items: baseline; justify-content: space-between;
  gap: var(--hrk-space-4); padding: var(--hrk-space-2) 0;
  border-bottom: 1px solid var(--hrk-border);
}
.hrk-dl__row:last-child { border-bottom: 0; }
.hrk-dl dt { color: var(--hrk-text-muted); }
.hrk-dl dd { margin: 0; font-weight: var(--hrk-fw-semibold); font-variant-numeric: tabular-nums; }

/* --- Zustände (Laden / Fehler) --- */
.hrk-state {
  display: flex; flex-direction: column; align-items: center; gap: var(--hrk-space-3);
  padding: var(--hrk-space-7) var(--hrk-space-4);
  color: var(--hrk-text-muted); text-align: center;
}
.hrk-spinner {
  width: 28px; height: 28px;
  border: 3px solid var(--hrk-border);
  border-top-color: var(--hrk-bordeaux);
  border-radius: 50%;
  animation: hrk-spin .8s linear infinite;
}
@keyframes hrk-spin { to { transform: rotate(360deg); } }

/* ============================================================
   Referral-Dashboard spezifische Styles
   ============================================================ */

.hrk-page--referral {
  /* etwas weniger Abstand oben, da kein H1 im Design */
  padding-top: var(--hrk-space-5);
}

.ref-dash__intro {
  margin: 0 0 var(--hrk-space-4);
  line-height: 1.6;
}

/* Hauptkarte */
.ref-dash__card {
  display: flex;
  flex-direction: column;
  gap: var(--hrk-space-5);
}

/* Grosser Code */
.ref-dash__code-section {
  text-align: center;
  padding: var(--hrk-space-4) 0 var(--hrk-space-2);
}
.ref-dash__code {
  font-family: var(--hrk-font-head);
  font-size: clamp(2rem, 8vw, 3rem);
  font-weight: var(--hrk-fw-semibold);
  letter-spacing: .15em;
  color: var(--hrk-bordeaux);
  margin: 0;
  user-select: all;
  line-height: 1.1;
}

/* Link-Zeile */
.ref-dash__link-field { margin-bottom: 0; }
.ref-dash__link-row {
  display: flex;
  gap: var(--hrk-space-2);
  align-items: stretch;
}
.ref-dash__link-input {
  flex: 1 1 auto;
  min-width: 0;
  font-size: var(--hrk-fs-small);
  color: var(--hrk-text-muted);
  cursor: pointer;
}
.ref-dash__copy-btn {
  flex: 0 0 auto;
  min-width: 140px;
}

/* Stats-Karte */
.ref-dash__stats-card {
  margin-top: var(--hrk-space-4);
}
.ref-dash__stats-title {
  margin-top: 0;
}
.ref-dash__empty-hint {
  margin: var(--hrk-space-3) 0 0;
}

/* --- Responsive --- */
@media (max-width: 600px) {
  .hrk-page { padding: var(--hrk-space-4) var(--hrk-space-3); }
  .hrk-card { padding: var(--hrk-space-4); }
  .ref-dash__link-row { flex-direction: column; align-items: stretch; }
  .ref-dash__copy-btn { min-width: unset; width: 100%; }
  .ref-dash__code { letter-spacing: .10em; }
}
</style>
