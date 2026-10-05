/*!
 * StayDesk chat widget.
 * <script src="https://YOUR-DOMAIN/widget.js" data-business="your-slug" async></script>
 * Optional: data-color="#8a5a2b" for the launcher button colour.
 */
(function () {
  var script = document.currentScript;
  if (!script || window.__staydeskLoaded) return;
  window.__staydeskLoaded = true;

  var slug = script.getAttribute("data-business");
  if (!slug) return console.warn("[StayDesk] data-business attribute missing");
  var origin = new URL(script.src).origin;
  var color = script.getAttribute("data-color") || "#1f4d3a";

  var frame = document.createElement("iframe");
  frame.src = origin + "/embed/" + encodeURIComponent(slug);
  frame.title = "Chat";
  frame.setAttribute("loading", "lazy");
  frame.style.cssText =
    "position:fixed;bottom:88px;right:16px;width:min(380px,calc(100vw - 32px));height:min(600px,calc(100vh - 120px));" +
    "border:0;border-radius:16px;box-shadow:0 20px 50px rgba(0,0,0,.25);z-index:2147483646;display:none;background:#fff;";

  var btn = document.createElement("button");
  btn.type = "button";
  btn.setAttribute("aria-label", "Open chat");
  btn.setAttribute("aria-expanded", "false");
  btn.style.cssText =
    "position:fixed;bottom:16px;right:16px;width:56px;height:56px;border-radius:50%;border:0;cursor:pointer;" +
    "background:" + color + ";color:#fff;box-shadow:0 10px 30px rgba(0,0,0,.25);z-index:2147483647;" +
    "display:grid;place-items:center;transition:transform .15s ease;";
  var chatIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>';
  var closeIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  btn.innerHTML = chatIcon;
  btn.onmouseenter = function () { btn.style.transform = "scale(1.05)"; };
  btn.onmouseleave = function () { btn.style.transform = ""; };

  var open = false;
  btn.onclick = function () {
    open = !open;
    frame.style.display = open ? "block" : "none";
    btn.innerHTML = open ? closeIcon : chatIcon;
    btn.setAttribute("aria-expanded", String(open));
    btn.setAttribute("aria-label", open ? "Close chat" : "Open chat");
  };

  function mount() {
    document.body.appendChild(frame);
    document.body.appendChild(btn);
  }
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
