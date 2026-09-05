(() => {
  const CLIENT_ID = "272507955688-7s4g9anuhiimmooisg0iqlk940r2a0jt.apps.googleusercontent.com";
  const AUTH_BASE = "https://paul-gateway-v2.paul-bendzko.workers.dev/auth";
  const BASE_SCOPES = "openid email";
  const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";
  const SESSION_KEY = "paul_hub_session_v2";
  const CALENDAR_KEY = "paul_google_calendar_v1";

  sessionStorage.removeItem("paul_google_session_v1");

  let sessionToken = "";
  let sessionExpiresAt = 0;
  let sessionBookmark = "";
  let profile = null;
  let calendarToken = "";
  let calendarExpiresAt = 0;

  function clearSession() {
    sessionToken = "";
    sessionExpiresAt = 0;
    sessionBookmark = "";
    profile = null;
    localStorage.removeItem(SESSION_KEY);
  }

  function clearCalendarToken() {
    calendarToken = "";
    calendarExpiresAt = 0;
    sessionStorage.removeItem(CALENDAR_KEY);
  }

  try {
    const saved = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    if (saved?.sessionToken && Number(saved.expiresAt) > Date.now()) {
      sessionToken = saved.sessionToken;
      sessionExpiresAt = Number(saved.expiresAt);
      sessionBookmark = String(saved.sessionBookmark || "");
      profile = saved.profile || null;
    } else clearSession();
  } catch { clearSession(); }

  try {
    const saved = JSON.parse(sessionStorage.getItem(CALENDAR_KEY) || "null");
    if (saved?.accessToken && Number(saved.expiresAt) > Date.now()) {
      calendarToken = saved.accessToken;
      calendarExpiresAt = Number(saved.expiresAt);
    } else clearCalendarToken();
  } catch { clearCalendarToken(); }

  function isSignedIn() {
    const valid = Boolean(sessionToken) && Date.now() < sessionExpiresAt;
    if (!valid && sessionToken) clearSession();
    return valid;
  }

  function hasCalendarToken() {
    const valid = Boolean(calendarToken) && Date.now() < calendarExpiresAt;
    if (!valid && calendarToken) clearCalendarToken();
    return valid;
  }

  function render() {
    document.querySelectorAll("[data-auth-button]").forEach((button) => {
      button.textContent = isSignedIn() ? "✓ Angemeldet" : "Mit Google anmelden";
      button.classList.toggle("is-authenticated", isSignedIn());
      button.title = isSignedIn() ? `${profile?.email || "Angemeldet"} · Klicken zum Abmelden` : "Private Daten freischalten";
    });
  }

  async function waitForGoogle() {
    const deadline = Date.now() + 10_000;
    while (!window.google?.accounts?.oauth2) {
      if (Date.now() > deadline) throw new Error("Google-Anmeldung konnte nicht geladen werden");
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  async function requestGoogleToken(calendar) {
    await waitForGoogle();
    return new Promise((resolve, reject) => {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: calendar ? `${BASE_SCOPES} ${CALENDAR_SCOPE}` : BASE_SCOPES,
        hint: "paul.bendzko@gmail.com",
        callback: (response) => response.error ? reject(new Error(response.error)) : resolve(response),
        error_callback: () => reject(new Error("Google-Anmeldung wurde abgebrochen")),
      });
      // A fresh 30-day Hub session starts with an explicit Google consent flow.
      // Silent token requests can close immediately when no reusable Google session exists.
      client.requestAccessToken({ prompt: "consent" });
    });
  }

  async function establishSession(googleToken) {
    const response = await fetch(`${AUTH_BASE}/session`, {
      method: "POST",
      headers: { Authorization: `Bearer ${googleToken}` },
    });
    if (!response.ok) throw new Error("Dieses Google-Konto ist nicht freigegeben");
    const result = await response.json();
    sessionToken = result.sessionToken;
    sessionExpiresAt = Number(result.expiresAt);
    sessionBookmark = String(result.sessionBookmark || "");
    profile = result.user;
    localStorage.setItem(SESSION_KEY, JSON.stringify({ sessionToken, sessionBookmark, expiresAt: sessionExpiresAt, profile }));
  }

  async function signIn({ calendar = false } = {}) {
    if (isSignedIn() && (!calendar || hasCalendarToken())) {
      return { accessToken: calendar ? calendarToken : sessionToken, expiresAt: calendar ? calendarExpiresAt : sessionExpiresAt, profile };
    }
    const tokenResponse = await requestGoogleToken(calendar);
    if (!isSignedIn()) await establishSession(tokenResponse.access_token);
    if (calendar) {
      calendarToken = tokenResponse.access_token;
      calendarExpiresAt = Date.now() + Math.max(0, tokenResponse.expires_in - 60) * 1000;
      sessionStorage.setItem(CALENDAR_KEY, JSON.stringify({ accessToken: calendarToken, expiresAt: calendarExpiresAt }));
    }
    render();
    window.dispatchEvent(new CustomEvent("hub-auth-change", { detail: { profile } }));
    return { accessToken: calendar ? calendarToken : sessionToken, expiresAt: calendar ? calendarExpiresAt : sessionExpiresAt, profile };
  }

  async function signOut() {
    const token = sessionToken;
    clearSession();
    clearCalendarToken();
    render();
    window.dispatchEvent(new CustomEvent("hub-auth-change", { detail: { profile: null } }));
    if (token) {
      try {
        await fetch(`${AUTH_BASE}/session`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      } catch (error) {
        console.warn("Remote session logout failed", error);
      }
    }
  }

  async function authorizedFetch(input, init = {}) {
    if (!isSignedIn()) throw new Error("Google-Anmeldung erforderlich");
    const headers = new Headers(init.headers || {});
    headers.set("Authorization", `Bearer ${sessionToken}`);
    if (sessionBookmark) headers.set("X-D1-Bookmark", sessionBookmark);
    const response = await fetch(input, { ...init, headers });
    if (response.status === 401) {
      clearSession();
      render();
      window.dispatchEvent(new CustomEvent("hub-auth-change", { detail: { profile: null } }));
    }
    return response;
  }

  async function handleButton(button) {
    button.disabled = true;
    try {
      if (isSignedIn()) await signOut();
      else {
        button.textContent = "Anmeldung…";
        await signIn({ calendar: button.dataset.authCalendar === "true" });
      }
    } catch (error) {
      console.error("Authentication failed", error);
      button.textContent = "Anmeldung fehlgeschlagen";
      button.title = error.message;
      setTimeout(render, 2500);
    } finally {
      button.disabled = false;
    }
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-auth-button]");
    if (button) handleButton(button);
  });
  document.addEventListener("DOMContentLoaded", () => {
    render();
    if (isSignedIn()) window.dispatchEvent(new CustomEvent("hub-auth-change", { detail: { profile } }));
  });

  window.HubAuth = {
    signIn,
    signOut,
    authorizedFetch,
    isSignedIn,
    getAccessToken: () => isSignedIn() ? sessionToken : "",
  };
})();
