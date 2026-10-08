/**
 * Desk & Day embeddable chat widget
 *
 * Usage (paste before </body>):
 *
 * <script
 *   src="https://shopify-ai-sales-assistant.vercel.app/widget.js"
 *   data-position="right"
 *   data-color="#a67c52"
 *   defer
 * ></script>
 */
;(function () {
  if (window.__DeskDayWidgetLoaded) return
  window.__DeskDayWidgetLoaded = true

  var script =
    document.currentScript ||
    document.querySelector('script[src*="widget.js"][data-deskday], script[src*="widget.js"]')

  var scriptSrc = (script && script.src) || 'https://shopify-ai-sales-assistant.vercel.app/widget.js'
  var origin = ''
  try {
    origin = new URL(scriptSrc).origin
  } catch (e) {
    origin = 'https://shopify-ai-sales-assistant.vercel.app'
  }

  var position = (script && script.getAttribute('data-position')) || 'right'
  var color = (script && script.getAttribute('data-color')) || '#a67c52'
  var ink = (script && script.getAttribute('data-ink')) || '#1a1714'
  var openLabel = (script && script.getAttribute('data-label')) || 'Chat with Desk & Day'
  var z = (script && script.getAttribute('data-z-index')) || '2147483000'
  var embedUrl = origin + '/?embed=1&widget=1'

  var root = document.createElement('div')
  root.id = 'deskday-widget-root'
  root.setAttribute('data-deskday-widget', 'true')
  document.documentElement.appendChild(root)

  var style = document.createElement('style')
  style.textContent =
    '#deskday-widget-root{all:initial;font-family:Manrope,system-ui,sans-serif}' +
    '#deskday-widget-root *{box-sizing:border-box}' +
    '#deskday-launcher{' +
    'position:fixed;bottom:20px;' +
    (position === 'left' ? 'left:20px;' : 'right:20px;') +
    'z-index:' +
    z +
    ';' +
    'width:60px;height:60px;border-radius:50%;border:none;cursor:pointer;' +
    'display:grid;place-items:center;color:#fff;' +
    'background:linear-gradient(145deg,' +
    color +
    ',' +
    ink +
    ');' +
    'box-shadow:0 14px 32px rgba(0,0,0,.28);' +
    'transition:transform .18s ease,box-shadow .18s ease}' +
    '#deskday-launcher:hover{transform:translateY(-2px) scale(1.03)}' +
    '#deskday-launcher svg{width:26px;height:26px;fill:none;stroke:currentColor;stroke-width:2}' +
    '#deskday-panel{' +
    'position:fixed;bottom:92px;' +
    (position === 'left' ? 'left:20px;' : 'right:20px;') +
    'z-index:' +
    z +
    ';' +
    'width:min(400px,calc(100vw - 24px));height:min(680px,calc(100dvh - 120px));' +
    'border-radius:22px;overflow:hidden;display:none;' +
    'box-shadow:0 24px 60px rgba(0,0,0,.28);' +
    'border:1px solid rgba(26,23,20,.1);background:#faf7f2}' +
    '#deskday-panel.open{display:block;animation:deskdayIn .22s ease}' +
    '#deskday-panel iframe{width:100%;height:100%;border:0;display:block;background:#faf7f2}' +
    '@keyframes deskdayIn{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:none}}' +
    '@media (max-width:480px){' +
    '#deskday-panel{left:0!important;right:0!important;bottom:0;width:100vw;height:100dvh;border-radius:0}' +
    '#deskday-launcher{bottom:16px;' +
    (position === 'left' ? 'left:16px' : 'right:16px') +
    '}}'

  root.appendChild(style)

  var panel = document.createElement('div')
  panel.id = 'deskday-panel'
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-label', openLabel)

  var iframe = document.createElement('iframe')
  iframe.title = openLabel
  iframe.src = embedUrl
  iframe.allow = 'clipboard-write'
  iframe.loading = 'lazy'
  panel.appendChild(iframe)

  var btn = document.createElement('button')
  btn.id = 'deskday-launcher'
  btn.type = 'button'
  btn.setAttribute('aria-label', openLabel)
  btn.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a8.5 8.5 0 0 1-8.5 8.5c-1.3 0-2.5-.3-3.6-.8L3 21l1.4-5.6A8.4 8.4 0 0 1 3.5 12 8.5 8.5 0 1 1 21 12Z"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01"/></svg>'

  var open = false
  function setOpen(next) {
    open = next
    panel.classList.toggle('open', open)
    btn.setAttribute('aria-expanded', open ? 'true' : 'false')
    btn.innerHTML = open
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a8.5 8.5 0 0 1-8.5 8.5c-1.3 0-2.5-.3-3.6-.8L3 21l1.4-5.6A8.4 8.4 0 0 1 3.5 12 8.5 8.5 0 1 1 21 12Z"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01"/></svg>'
  }

  btn.addEventListener('click', function () {
    setOpen(!open)
  })

  window.addEventListener('message', function (event) {
    if (event.origin !== origin) return
    if (event.data && event.data.type === 'deskday-close') setOpen(false)
  })

  root.appendChild(panel)
  root.appendChild(btn)

  window.DeskDayWidget = {
    open: function () {
      setOpen(true)
    },
    close: function () {
      setOpen(false)
    },
    toggle: function () {
      setOpen(!open)
    },
    origin: origin,
  }
})()
