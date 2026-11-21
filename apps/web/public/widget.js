/*
 * StoreAssist AI chat widget. Add to any website with:
 *   <script src="https://storeassist-ai.pages.dev/widget.js" async></script>
 * Optional attributes on that tag:
 *   data-color="#0a6cf0"      button color
 *   data-position="right"     "right" (default) or "left"
 *   data-label="Chat with us" button tooltip and screen-reader name
 * Script API for your own buttons: window.StoreAssist.open(), .close(), .toggle(), .destroy()
 *
 * The button lives in a Shadow DOM so the host page's CSS cannot restyle it. The chat itself is the
 * /embed page in an iframe, created on first open, so it costs nothing until someone clicks.
 */
(function () {
  "use strict";
  if (window.StoreAssist) return; // loaded twice: keep the first

  var script = document.currentScript;
  var origin = script ? new URL(script.src, location.href).origin : location.origin;
  var data = (script && script.dataset) || {};
  var color = /^#[0-9a-f]{3,8}$/i.test(data.color || "") ? data.color : "#0a6cf0";
  var left = data.position === "left";
  var label = (data.label || "Chat with us").slice(0, 60);

  var host = document.createElement("storeassist-widget");
  // Inline !important beats anything the host page's stylesheets do to this element.
  host.setAttribute(
    "style",
    "all:initial!important;position:fixed!important;bottom:0!important;" +
      (left ? "left" : "right") +
      ":0!important;width:0!important;height:0!important;z-index:2147483000!important;display:block!important",
  );
  var root = host.attachShadow({ mode: "open" });
  var side = left ? "left" : "right";

  root.innerHTML =
    "<style>" +
    ":host{all:initial}" +
    "*{box-sizing:border-box}" +
    ".launcher{position:fixed;bottom:22px;" +
    side +
    ":22px;width:60px;height:60px;border:0;border-radius:50%;" +
    "cursor:pointer;display:grid;place-items:center;color:#fff;background:" +
    color +
    ";" +
    "background-image:linear-gradient(180deg,rgba(255,255,255,.22),rgba(0,0,0,.08));" +
    "box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 10px 28px -8px rgba(0,0,0,.45),0 2px 6px rgba(0,0,0,.18);" +
    "transition:transform .5s cubic-bezier(.34,1.56,.64,1),box-shadow .3s ease;-webkit-tap-highlight-color:transparent}" +
    ".launcher:hover{transform:scale(1.06)}" +
    ".launcher:active{transform:scale(.94);transition-duration:.12s}" +
    ".launcher:focus-visible{outline:3px solid rgba(10,108,240,.55);outline-offset:3px}" +
    ".launcher svg{position:absolute;width:26px;height:26px;transition:transform .45s cubic-bezier(.34,1.56,.64,1),opacity .25s ease}" +
    ".launcher .x{opacity:0;transform:rotate(-90deg) scale(.6)}" +
    ".open .launcher .chat{opacity:0;transform:rotate(90deg) scale(.6)}" +
    ".open .launcher .x{opacity:1;transform:none}" +
    ".panel{position:fixed;bottom:96px;" +
    side +
    ":22px;width:400px;height:min(680px,calc(100vh - 120px));" +
    "border-radius:24px;overflow:hidden;background:#f3f4f7;" +
    "box-shadow:0 0 0 1px rgba(15,23,42,.08),0 30px 70px -20px rgba(0,0,0,.45),0 8px 24px -10px rgba(0,0,0,.25);" +
    "transform-origin:bottom " +
    side +
    ";opacity:0;transform:translateY(16px) scale(.92);visibility:hidden;pointer-events:none;" +
    "transition:opacity .25s ease,transform .5s cubic-bezier(.22,1,.36,1),visibility 0s linear .5s}" +
    ".open .panel{opacity:1;transform:none;visibility:visible;pointer-events:auto;" +
    "transition:opacity .25s ease,transform .55s cubic-bezier(.34,1.3,.64,1),visibility 0s}" +
    "iframe{display:block;width:100%;height:100%;border:0;background:transparent;color-scheme:normal}" +
    "@media (prefers-color-scheme:dark){.panel{background:#07080b;box-shadow:0 0 0 1px rgba(255,255,255,.08),0 30px 70px -20px rgba(0,0,0,.8)}}" +
    "@media (max-width:600px){.panel{inset:0;width:100%;height:100%;border-radius:0}" +
    ".open .launcher{opacity:0;pointer-events:none;transform:scale(.6)}}" +
    "@media (prefers-reduced-motion:reduce){*{transition:none!important}}" +
    "</style>" +
    '<div class="wrap">' +
    '<div class="panel" id="sa-panel" role="dialog" aria-label="Store support chat" aria-hidden="true"></div>' +
    '<button class="launcher" type="button" aria-controls="sa-panel" aria-expanded="false">' +
    '<svg class="chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z"/></svg>' +
    '<svg class="x" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">' +
    '<path d="M6 6l12 12M18 6 6 18"/></svg>' +
    "</button></div>";

  var wrap = root.querySelector(".wrap");
  var panel = root.querySelector(".panel");
  var button = root.querySelector(".launcher");
  button.setAttribute("aria-label", label);
  button.title = label;

  var iframe = null;
  var isOpen = false;

  function ensureFrame() {
    if (iframe) return;
    iframe = document.createElement("iframe");
    iframe.src = origin + "/embed";
    iframe.title = "Store support chat";
    iframe.allow = "clipboard-write";
    panel.appendChild(iframe);
  }

  function open() {
    if (isOpen) return;
    ensureFrame();
    isOpen = true;
    wrap.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
    button.setAttribute("aria-expanded", "true");
    button.setAttribute("aria-label", "Close chat");
    // Give the panel a moment to appear, then move focus into the chat.
    setTimeout(function () {
      if (isOpen && iframe) iframe.focus();
    }, 350);
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    wrap.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-label", label);
    button.focus();
  }

  function toggle() {
    if (isOpen) close();
    else open();
  }

  function onKeydown(event) {
    if (event.key === "Escape" && isOpen) close();
  }

  // The chat's close button and Escape key inside the iframe send this message.
  function onMessage(event) {
    if (event.origin !== origin) return;
    if (event.data && event.data.type === "storeassist:close") close();
  }

  // Removes the widget completely (used by pages that reload it with new settings).
  function destroy() {
    document.removeEventListener("keydown", onKeydown);
    window.removeEventListener("message", onMessage);
    host.remove();
    delete window.StoreAssist;
  }

  button.addEventListener("click", toggle);
  document.addEventListener("keydown", onKeydown);
  window.addEventListener("message", onMessage);

  window.StoreAssist = { open: open, close: close, toggle: toggle, destroy: destroy };

  function mount() {
    document.body.appendChild(host);
  }
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
