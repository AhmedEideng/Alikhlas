(function () {
  // Set your Al Ikhlas Medical GA4 Measurement ID (e.g. "G-XXXXXXXXXX") when ready.
  // Read from <meta name="ga-measurement-id"> (injected at build time).
  // window.__IKHLAS_GA_ID is a fallback for older caches only.
  var gaMeta =
    typeof document !== "undefined"
      ? document.querySelector('meta[name="ga-measurement-id"]')
      : null;
  var measurementId =
    (gaMeta && gaMeta.getAttribute("content")) ||
    (typeof window !== "undefined" && window.__IKHLAS_GA_ID) ||
    "";
  var configured = false;
  var scriptLoaded = false;

  if (typeof window !== "undefined") {
    window.dataLayer = window.dataLayer || [];
    window.gtag =
      window.gtag ||
      function () {
        window.dataLayer.push(arguments);
      };
  }

  function readClientIdCookie() {
    var match = document.cookie.match(/(?:^|; )ikhlas_ga_cid=(\d+\.\d+)/);
    return match ? match[1] : null;
  }

  function configureGA() {
    if (!measurementId || configured || typeof window === "undefined") return;
    configured = true;
    window.gtag("js", new Date());
    var sharedClientId = readClientIdCookie();
    window.gtag("config", measurementId, {
      ...(sharedClientId ? { client_id: sharedClientId } : {}),
      transport_type: "beacon",
      send_page_view: false,
      cookie_domain: "auto",
      cookie_flags: "SameSite=None;Secure",
      file_downloads: true,
      debug_mode:
        typeof window !== "undefined" && new URLSearchParams(window.location.search).has("debug"),
    });
  }

  function loadGA() {
    if (!measurementId || scriptLoaded || typeof window === "undefined") return;
    scriptLoaded = true;
    var s = document.createElement("script");
    s.async = true;
    s.onload = function () {
      window.__ikhlasGaLoaded = true;
    };
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(measurementId);
    document.head.appendChild(s);
  }

  var fallbackSent = false;
  function sendServerFallback() {
    if (!measurementId || window.__ikhlasGaLoaded || fallbackSent) return;
    fallbackSent = true;
    try {
      var clientId = readClientIdCookie();
      if (!clientId) {
        clientId = Math.floor(Math.random() * 2147483647) + "." + Math.floor(Date.now() / 1000);
        document.cookie =
          "ikhlas_ga_cid=" + clientId + "; Max-Age=63072000; Path=/; SameSite=Lax; Secure";
      }
      var sessionId = window.sessionStorage.getItem("ikhlas_ga_sid");
      if (!sessionId) {
        sessionId = String(Math.floor(Date.now() / 1000));
        window.sessionStorage.setItem("ikhlas_ga_sid", sessionId);
      }
      var payload = JSON.stringify({
        client_id: clientId,
        session_id: sessionId,
        page_path: window.location.pathname,
        page_title: document.title,
      });
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/ga-pageview", new Blob([payload], { type: "application/json" }));
      } else {
        fetch("/api/ga-pageview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        });
      }
    } catch {
      /* measurement fallback must never break the page */
    }
  }

  if (typeof window !== "undefined" && measurementId) {
    configureGA();
    var started = false;
    function startOnce() {
      if (started) return;
      started = true;
      loadGA();
    }
    if (document.readyState === "complete") startOnce();
    else {
      window.addEventListener("load", startOnce, { once: true });
      setTimeout(startOnce, 3000);
    }
    setTimeout(sendServerFallback, 8000);
    window.addEventListener("pagehide", sendServerFallback);
  }
})();
