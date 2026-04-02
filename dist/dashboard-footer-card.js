/**
 * Dashboard Footer Card for Home Assistant
 * ==========================================
 * v2.4.0 — English UI translation
 *
 * Config options:
 *   type: custom:dashboard-footer-card
 *   routes:                              # list of navigation routes
 *     - icon: mdi:home                   # icon (supports Jinja2 templates)
 *       label: Home                      # label text
 *       show_label: true                 # show/hide label (default: true)
 *       path: /dashboard-home/home       # navigation path (ha-navigation-picker)
 *       icon_color: ''                   # icon color (supports Jinja2 templates)
 *       active_color: var(--primary-color) # highlight color when route is active
 *       visibility: ''                   # Jinja2 template — route shown when truthy
 *       haptic_tap: false                # haptic feedback per action
 *       haptic_hold: false
 *       haptic_double_tap: false
 *       haptic_swipe: false
 *       tap_action: default              # default|ha-action|open-popup|toggle-menu|none
 *       tap_action_data: {}              # HA action object (when tap_action=ha-action)
 *       hold_action: default
 *       hold_action_data: {}
 *       double_tap_action: default
 *       double_tap_action_data: {}
 *       swipe_action: default            # swipe-up action (main routes only)
 *       swipe_action_data: {}
 *       badge_content: ''               # badge text (supports Jinja2 templates)
 *       badge_color: 'var(--error-color)' # badge bg color (supports Jinja2 templates)
 *       highlight_for_subroutes: true    # highlight when a sub-route is active
 *       sub_routes:                      # popup menu routes (same options minus sub_routes/swipe_action)
 *         - icon: mdi:cog
 *           label: Settings
 *           show_label: true
 *           path: /config
 *           icon_color: ''
 *           active_color: ''
 *           visibility: ''
 *           badge_content: ''
 *           badge_color: ''
 *           haptic_tap: false
 *           haptic_hold: false
 *           haptic_double_tap: false
 *           tap_action: default
 *           hold_action: default
 *           double_tap_action: default
 *   icon_size: 24                        # icon size in px (width & height)
 *   font_size: 10                        # label font size in px
 *   background: ''                       # CSS color/var
 *   blur: false                          # glassmorphism blur in floating mode
 *   show_breadcrumb: false               # show active sub-route name above footer
 *   floating_mobile: false               # floating on mobile (< breakpoint)
 *   floating_desktop: false              # floating on desktop (>= breakpoint)
 *   breakpoint: 768                      # px threshold mobile/desktop
 *   respect_sidebar: true                # offset left by sidebar width (non-floating)
 *   bottom_offset: 0                     # bottom offset in px
 *   max_width: ''                        # floating mode: cap width and center
 *   hide_in_edit: false                  # hide the fixed footer in edit mode
 */

const VERSION = '1.0.0';

const { t } = await import(`./i18n/index.js?v=${VERSION}`);

// ── LitElement from HA bundle ────────────────────────────────────────────────

const LitElement = Object.getPrototypeOf(customElements.get('ha-panel-lovelace'));
const { html, css } = LitElement.prototype;

// ── Constants ────────────────────────────────────────────────────────────────

const FLOATING_GAP       = 16;
const HOLD_DELAY_MS      = 500;
const DOUBLE_TAP_MS      = 250;
const SWIPE_MIN_DISTANCE = 30;
const SWIPE_MAX_TAN      = 0.577; // tan(30deg) — ±30° cone from vertical
const ANCESTOR_WALK_MAX  = 25;

// ── Helpers ──────────────────────────────────────────────────────────────────

function isTemplate(str) {
  return typeof str === 'string' && (str.includes('{{') || str.includes('{%'));
}

function isVisibilityTruthy(value) {
  if (value == null || value === '') return true;
  const v = String(value).trim().toLowerCase();
  return v !== '' && v !== 'false' && v !== 'off' && v !== 'no' && v !== 'none' && v !== '0';
}

function hasSubRoutes(route) {
  return Array.isArray(route?.sub_routes) && route.sub_routes.length > 0;
}
function toCSSValue(val) {
  if (val == null || val === '' || val === 0) return null;
  const s = String(val).trim();
  if (s === '0') return null;
  return isFinite(Number(s)) ? `${Number(s)}px` : s;
}

function isSwipeUp(startX, startY, endX, endY) {
  const deltaY = startY - endY;
  const deltaX = Math.abs(endX - startX);
  return deltaY > SWIPE_MIN_DISTANCE && deltaX < deltaY * SWIPE_MAX_TAN;
}

function walkAncestors(startEl, fn) {
  let el = startEl;
  for (let i = 0; i < ANCESTOR_WALK_MAX; i++) {
    if (!el) break;
    if (fn(el)) return true;
    const root = el.getRootNode?.();
    el = root instanceof ShadowRoot ? root.host : el.parentElement;
  }
  return false;
}

function matchesPath(routePath, currentPath) {
  return routePath && (currentPath === routePath || currentPath.startsWith(routePath + '/'));
}

function cleanRouteConfig(route, actionKeys) {
  const optionalStrings = ['icon_color', 'active_color', 'visibility', 'badge_content', 'badge_color', 'path'];
  for (const key of optionalStrings) {
    if (!route[key]) delete route[key];
  }
  delete route.haptic;
  for (const key of actionKeys) {
    if (!route[key] || route[key] === 'default') {
      delete route[key];
      delete route[`${key}_data`];
    } else if (route[key] !== 'ha-action') {
      delete route[`${key}_data`];
    }
  }
  return route;
}

// ── Restart dialog ──────────────────────────────────────────────────────────

const RESTART_ACTIONS = [
  { key: 'reload',    icon: 'mdi:auto-fix',    bg: 'rgb(95,138,73)',  color: '#fff' },
  { key: 'restart',   icon: 'mdi:refresh',     bg: 'rgb(255,213,0)',  color: 'rgb(102,85,0)' },
];
const RESTART_ADVANCED = [
  { key: 'reboot',    icon: 'mdi:power-cycle', bg: 'rgb(186,27,27)',  color: '#fff' },
  { key: 'shutdown',  icon: 'mdi:power',       bg: 'rgb(11,29,41)',   color: '#fff' },
  { key: 'safe_mode', icon: 'mdi:lifebuoy',    bg: 'rgb(228,134,41)', color: '#fff' },
];

function _createRestartItem(action, hass, tr) {
  const item = document.createElement('ha-md-list-item');
  item.type = 'button';
  const iconWrap = document.createElement('div');
  iconWrap.slot = 'start';
  Object.assign(iconWrap.style, {
    borderRadius: 'var(--ha-border-radius-circle)', width: '40px', height: '40px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: action.bg, color: action.color,
  });
  const icon = document.createElement('ha-icon');
  icon.icon = action.icon;
  iconWrap.appendChild(icon);
  item.appendChild(iconWrap);
  const headline = document.createElement('div');
  headline.slot = 'headline';
  headline.textContent = tr(hass, `restart_${action.key}`);
  item.appendChild(headline);
  const desc = document.createElement('div');
  desc.slot = 'supporting-text';
  desc.textContent = tr(hass, `restart_${action.key}_desc`);
  item.appendChild(desc);
  const chevron = document.createElement('ha-icon-next');
  chevron.slot = 'end';
  item.appendChild(chevron);
  return item;
}

async function _execRestartAction(key, hass) {
  switch (key) {
    case 'reload':    return hass.callService('homeassistant', 'reload_all');
    case 'restart':   return hass.callService('homeassistant', 'restart');
    case 'reboot':    return hass.callService('hassio', 'host_reboot');
    case 'shutdown':  return hass.callService('hassio', 'host_shutdown');
    case 'safe_mode': return hass.callWS({ type: 'supervisor/api', endpoint: '/core/restart', method: 'post', data: { safe_mode: true } });
  }
}

function _openRestartDialog(hass, tr) {
  const dialog = document.createElement('ha-adaptive-dialog');
  dialog.hass = hass;
  dialog.headerTitle = tr(hass, 'Restart Menu');
  dialog.style.cssText = '--dialog-content-padding: 0;';
  const content = document.createElement('div');

  const buildMenu = () => {
    content.innerHTML = '';
    dialog.headerTitle = tr(hass, 'Restart Menu');
    const mainList = document.createElement('ha-md-list');
    for (const action of RESTART_ACTIONS) {
      const item = _createRestartItem(action, hass, tr);
      item.addEventListener('click', () => showConfirm(action.key));
      mainList.appendChild(item);
    }
    content.appendChild(mainList);
    const panel = document.createElement('ha-expansion-panel');
    panel.header = tr(hass, 'Advanced Options');
    panel.style.cssText = 'border-top: 1px solid var(--divider-color); margin-bottom: 10px; box-shadow: none; --expansion-panel-content-padding: 0; --expansion-panel-summary-padding: 0 20px; --ha-card-border-radius: 0;';
    const advList = document.createElement('ha-md-list');
    for (const action of RESTART_ADVANCED) {
      const item = _createRestartItem(action, hass, tr);
      item.addEventListener('click', () => showConfirm(action.key));
      advList.appendChild(item);
    }
    panel.appendChild(advList);
    content.appendChild(panel);
  };

  const showConfirm = (key) => {
    if (key === 'reload') { _execRestartAction(key, hass); closeDialog(); return; }
    content.innerHTML = '';
    dialog.headerTitle = tr(hass, `restart_${key}`);
    const wrap = document.createElement('div');
    wrap.style.cssText = 'padding: 0 24px 24px;';
    const title = document.createElement('h2');
    title.style.cssText = 'margin: 0 0 8px; font-size: var(--ha-font-size-xl, 22px); font-weight: var(--ha-font-weight-normal, 400); color: var(--primary-text-color);';
    title.textContent = tr(hass, `restart_${key}_confirm_title`);
    wrap.appendChild(title);
    const desc = document.createElement('p');
    desc.style.cssText = 'margin: 0; color: var(--secondary-text-color); font-size: var(--ha-font-size-m, 14px); line-height: var(--ha-line-height-normal, 1.5);';
    desc.textContent = tr(hass, `restart_${key}_confirm_desc`);
    wrap.appendChild(desc);
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px;';
    const cancelBtn = document.createElement('ha-button');
    cancelBtn.setAttribute('variant', 'brand');
    cancelBtn.setAttribute('appearance', 'plain');
    cancelBtn.textContent = tr(hass, 'Cancel');
    cancelBtn.addEventListener('click', () => buildMenu());
    btnRow.appendChild(cancelBtn);
    const okBtn = document.createElement('ha-button');
    okBtn.setAttribute('variant', 'danger');
    okBtn.setAttribute('appearance', 'accent');
    okBtn.textContent = tr(hass, `restart_${key}_confirm_action`);
    okBtn.addEventListener('click', () => { _execRestartAction(key, hass); closeDialog(); });
    btnRow.appendChild(okBtn);
    wrap.appendChild(btnRow);
    content.appendChild(wrap);
  };

  buildMenu();
  dialog.appendChild(content);
  const haRoot = document.querySelector('home-assistant');
  (haRoot?.shadowRoot ?? document.body).appendChild(dialog);
  dialog.open = true;
  history.pushState({ dialog: 'restart' }, '');

  let closed = false;
  const closeDialog = () => {
    if (closed) return;
    closed = true;
    dialog.open = false;
    if (history.state?.dialog === 'restart') history.back();
  };
  const onPopState = () => { window.removeEventListener('popstate', onPopState); closeDialog(); };
  window.addEventListener('popstate', onPopState);
  const onClose = () => { closeDialog(); window.removeEventListener('popstate', onPopState); dialog.remove(); };
  dialog.addEventListener('closed', onClose);
  dialog.addEventListener('close', onClose);
}

// ── Card class (LitElement) ──────────────────────────────────────────────────

class DashboardFooterCard extends LitElement {
  static get properties() {
    return {
      hass:             { attribute: false },
      _config:          { state: true },
      _openPopupIndex:  { state: true },
      _templateState:   { state: true },
    };
  }

  static get styles() {
    return css`
      :host { display: block; }
      .spacer { display: block; }
      ha-card {
        padding: 0;
        transition: none;
        animation: none;
      }

      .footer-card {
        padding: 4px 8px;
        box-sizing: border-box;
        padding-bottom: max(4px, env(safe-area-inset-bottom, 0px));
      }
      .footer-card.fixed {
        position: fixed;
        z-index: 4;
        border-radius: 0;
        box-shadow: 0 -2px 8px rgba(0,0,0,0.18);
        border-left: none;
        border-right: none;
        border-bottom: none;
      }
      .footer-card.fixed.floating-style {
        border-radius: var(--ha-card-border-radius, 12px);
        box-shadow: var(--ha-card-box-shadow, 0 2px 8px rgba(0,0,0,0.15));
        border: var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, var(--divider-color, #e0e0e0));
      }
      .footer-card.blur-bg {
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        background: color-mix(in srgb, var(--ha-card-background, #fff) 75%, transparent);
      }
      .footer-card.edit-mode {
        width: 100%;
      }

      .breadcrumb {
        text-align: center;
        font-size: 11px;
        color: var(--secondary-text-color);
        padding: 2px 0 0;
        font-family: var(--mdc-typography-font-family, Roboto, sans-serif);
        font-weight: 400;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .breadcrumb:empty { display: none; }

      .routes-row {
        display: flex;
        justify-content: space-around;
        align-items: flex-end;
        width: 100%;
        position: relative;
      }

      .route {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 4px 2px 2px;
        cursor: pointer;
        position: relative;
        flex: 1;
        min-width: 0;
        -webkit-tap-highlight-color: transparent;
        user-select: none;
        touch-action: pan-x;
        border: none;
        background: none;
        outline: none;
        z-index: 1;
      }
      .route:hover .route-icon-wrap {
        background: color-mix(in srgb, var(--primary-text-color) 8%, transparent);
      }
      .route.active:hover .route-icon-wrap {
        background: transparent;
      }

      .route-icon-wrap {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: visible;
        width: calc(var(--dfc-icon-size, 24px) + 16px);
        height: calc(var(--dfc-icon-size, 24px) + 8px);
        border-radius: calc((var(--dfc-icon-size, 24px) + 8px) / 2);
        transition: background 0.2s, color 0.2s;
      }
      .route-icon-wrap ha-icon {
        --mdc-icon-size: var(--dfc-icon-size, 24px);
        color: var(--dfc-route-icon-color, var(--state-inactive-color, var(--disabled-color)));
        transition: color 0.2s;
        position: relative;
        z-index: 1;
      }
      .no-transitions .route-icon-wrap,
      .no-transitions .route-icon-wrap ha-icon,
      .no-transitions .route-label {
        transition: none !important;
      }
      .route.active .route-icon-wrap {
        background: var(--dfc-route-active-bg, color-mix(in srgb, var(--primary-color) 15%, transparent));
      }
      .route.active .route-icon-wrap ha-icon {
        color: var(--dfc-route-active-color, var(--primary-color));
      }

      .ripple-container {
        position: absolute;
        inset: 0;
        border-radius: inherit;
        overflow: hidden;
        pointer-events: none;
        z-index: 0;
      }
      @keyframes dfc-ripple {
        to { transform: scale(2.5); opacity: 0; }
      }
      .ripple {
        position: absolute;
        border-radius: 50%;
        background: currentColor;
        opacity: 0.18;
        transform: scale(0);
        animation: dfc-ripple 0.45s ease-out forwards;
        pointer-events: none;
      }

      @keyframes dfc-pulse {
        0%, 100% { box-shadow: 0 0 0 2px var(--primary-color, #03a9f4); }
        50%      { box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary-color, #03a9f4) 40%, transparent); }
      }
      .route.editing .route-icon-wrap {
        animation: dfc-pulse 1.5s ease-in-out infinite;
        border-radius: calc((var(--dfc-icon-size, 24px) + 8px) / 2);
      }

      .route-label {
        font-size: var(--dfc-font-size, 10px);
        line-height: 1.2;
        margin-top: 2px;
        color: var(--primary-text-color);
        font-family: var(--mdc-typography-font-family, Roboto, sans-serif);
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
      }
      .route.active .route-label {
        color: var(--primary-text-color);
      }

      .route-badge {
        position: absolute;
        top: -2px;
        right: -4px;
        min-width: 16px;
        height: 16px;
        padding: 0 4px;
        border-radius: 8px;
        font-size: 10px;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        background: var(--dfc-badge-bg, var(--error-color, #f44336));
        box-sizing: border-box;
        pointer-events: none;
        z-index: 2;
      }
      .route-badge:empty { display: none; }

      .popup-overlay {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        z-index: 5;
        background: transparent;
      }
      .popup-menu {
        position: fixed;
        z-index: 6;
        background: var(--card-background-color, var(--ha-card-background, #fff));
        border-radius: var(--ha-card-border-radius, 12px);
        box-shadow: 0 4px 16px rgba(0,0,0,0.22);
        padding: 8px 0;
        min-width: 180px;
        max-width: 280px;
        overflow: hidden;
        animation: dfc-popup-in 0.15s ease-out;
      }
      @keyframes dfc-popup-in {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .popup-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 16px;
        cursor: pointer;
        transition: background 0.12s;
        border: none;
        background: none;
        width: 100%;
        outline: none;
        -webkit-tap-highlight-color: transparent;
      }
      .popup-item:hover,
      .popup-item:focus-visible {
        background: color-mix(in srgb, var(--primary-text-color) 10%, transparent);
      }
      .popup-item:active { opacity: 0.7; }
      .popup-item ha-icon {
        --mdc-icon-size: 22px;
        color: var(--secondary-text-color);
        flex-shrink: 0;
      }
      .popup-item.active ha-icon { color: var(--primary-color); }
      .popup-item-label {
        font-size: 14px;
        color: var(--primary-text-color);
        font-family: var(--mdc-typography-font-family, Roboto, sans-serif);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .popup-item-icon-wrap {
        position: relative;
        display: flex;
        align-items: center;
        flex-shrink: 0;
      }
      .popup-item-badge {
        position: absolute;
        top: -6px;
        right: -8px;
        min-width: 14px;
        height: 14px;
        padding: 0 4px;
        border-radius: 7px;
        background: var(--dfc-badge-bg, var(--error-color, #f44336));
        color: #fff;
        font-size: 9px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: var(--mdc-typography-font-family, Roboto, sans-serif);
        box-sizing: border-box;
      }
      .popup-item-badge:empty { display: none; }
      .popup-item.active .popup-item-label {
        font-weight: 500;
      }
    `;
  }

  constructor() {
    super();
    this._config          = null;
    this._resizeObserver  = null;
    this._lovelaceHandler = null;
    this._locationHandler = null;
    this._lastEditMode    = false;
    this._lastFloating    = false;
    this._templateUnsubs  = [];
    this._openPopupIndex  = null;
    this._templateState   = this._loadTemplateCache();
    this._listenersAttached = false;
  }

  // ── HA card API ──────────────────────────────────────────────────────────

  static getStubConfig() {
    return {
      routes: [
        { icon: 'mdi:home', label: 'Home', path: '/lovelace/0' },
        { icon: 'mdi:cog', label: 'Settings', path: '/config' },
      ],
      floating_mobile: false, floating_desktop: false,
      breakpoint: 768, respect_sidebar: true, bottom_offset: 0,
    };
  }

  static getConfigElement() {
    return document.createElement('dashboard-footer-card-editor');
  }

  static getCardSize() { return 1; }
  static getGridOptions() { return { rows: 1, columns: 12, min_rows: 1 }; }

  setConfig(config) {
    if (!config) throw new Error('[dashboard-footer-card] Invalid configuration.');
    this._config = { breakpoint: 768, respect_sidebar: true, ...config };
  }

  connectedCallback() {
    super.connectedCallback();
    // Suppress CSS transitions and remove stale ripples on reconnect.
    // HA caches views with display:none, pausing active CSS animations/transitions.
    this._suppressTransitions = true;
    this.updateComplete?.then(() => {
      this.shadowRoot?.querySelectorAll('.ripple').forEach(r => r.remove());
    });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      this._suppressTransitions = false;
      this.requestUpdate();
    }));
    this._setupPositionTracking();
    this._lovelaceHandler = () => setTimeout(() => {
      this.requestUpdate();
      this._setupPositionTracking();
    }, 50);
    window.addEventListener('ll-rebuild', this._lovelaceHandler);
    window.addEventListener('lovelace-changed', this._lovelaceHandler);
    this._locationHandler = () => this.requestUpdate();
    window.addEventListener('popstate', this._locationHandler);
    window.addEventListener('location-changed', this._locationHandler);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopPositionTracking();
    this._unsubscribeAllTemplates();
    window.removeEventListener('ll-rebuild', this._lovelaceHandler);
    window.removeEventListener('lovelace-changed', this._lovelaceHandler);
    window.removeEventListener('popstate', this._locationHandler);
    window.removeEventListener('location-changed', this._locationHandler);
    this._lovelaceHandler = null;
    this._locationHandler = null;
    this._listenersAttached = false;
  }

  updated(changedProps) {
    // Re-subscribe templates when config changes
    if (changedProps.has('_config') || changedProps.has('hass')) {
      const configChanged = changedProps.has('_config');
      const hassFirstSet = changedProps.has('hass') && !changedProps.get('hass');
      if (configChanged || hassFirstSet) {
        this._unsubscribeAllTemplates();
        this._subscribeAllTemplates();
      }
    }

    // Imperative position update after render
    const editMode = this._isInEditMode();
    this._lastEditMode = editMode;
    if (!editMode) {
      this._updateFixedPosition();
    }

    // Attach pointer listeners once after first render
    if (!this._listenersAttached) {
      this._attachAllRouteListeners();
      this._listenersAttached = true;
    }

    // Apply CSS vars
    this._applyCSSVars();
  }

  // ── Render ─────────────────────────────────────────────────────────────

  render() {
    if (!this._config || !this.hass) return html``;

    const editMode       = this._isInEditMode();
    const floating       = !editMode && this._isFloating();
    const routes         = this._config.routes ?? [];
    const showBlur       = !!this._config.blur && floating;
    const showBreadcrumb = !!this._config.show_breadcrumb;
    const editingIdx     = this._isInsideCardEditor() ? this._config._editingRouteIndex : undefined;
    const breadcrumbText = showBreadcrumb ? this._findActiveBreadcrumbLabel() : '';

    let cardClass = editMode
      ? 'footer-card edit-mode'
      : floating ? 'footer-card fixed floating-style' : 'footer-card fixed';
    if (showBlur) cardClass += ' blur-bg';
    if (this._suppressTransitions) cardClass += ' no-transitions';

    const bottomCSS   = toCSSValue(this._config.bottom_offset);
    const maxWidthCSS = toCSSValue(this._config.max_width);
    const fixedStyle  = !editMode
      ? `${bottomCSS ? `bottom:${bottomCSS};` : ''}${maxWidthCSS && floating ? `max-width:${maxWidthCSS};` : ''}`
      : '';

    return html`
      ${!editMode ? html`<div class="spacer"></div>` : ''}
      <ha-card class="${cardClass}" style="${fixedStyle}">
        ${showBreadcrumb ? html`<div class="breadcrumb">${breadcrumbText}</div>` : ''}
        <div class="routes-row">
          ${routes.map((route, i) => this._renderRoute(route, i, editingIdx))}
        </div>
      </ha-card>
      ${this._renderPopup()}
    `;
  }

  _renderRoute(route, index, editingIdx) {
    const active    = this._shouldHighlight(route);
    const ts        = this._templateState;
    const icon      = ts[`icon_${index}`] ?? (isTemplate(route.icon) ? 'mdi:circle' : (route.icon || 'mdi:circle'));
    const iconColor = ts[`icon_color_${index}`] ?? (!isTemplate(route.icon_color) ? route.icon_color : null);
    const badgeText = ts[`badge_${index}`] ?? (!isTemplate(route.badge_content) ? route.badge_content : '') ?? '';
    const badgeColor = ts[`badge_color_${index}`] ?? (!isTemplate(route.badge_color) ? route.badge_color : null);
    const visible   = ts[`vis_${index}`] !== undefined
      ? isVisibilityTruthy(ts[`vis_${index}`])
      : (!route.visibility || !isTemplate(route.visibility) ? isVisibilityTruthy(route.visibility) : true);

    const classes = ['route'];
    if (active) classes.push('active');
    if (editingIdx === index) classes.push('editing');

    const activeStyle = (active && route.active_color)
      ? `--dfc-route-active-color:${route.active_color};--dfc-route-active-bg:color-mix(in srgb, ${route.active_color} 15%, transparent);`
      : '';

    return html`
      <div class="${classes.join(' ')}"
           data-index="${index}"
           style="${activeStyle}${visible ? '' : 'display:none;'}"
           @pointerdown="${(e) => this._onPointerDown(e, route, index)}"
           @pointermove="${this._onPointerMove}"
           @pointerup="${(e) => this._onPointerUp(e, route, index)}"
           @pointerleave="${this._onPointerLeave}"
           @pointercancel="${(e) => this._onPointerCancel(e, route, index)}"
           @contextmenu="${(e) => { if (route.hold_action) e.preventDefault(); }}">
        <div class="route-icon-wrap">
          <span class="ripple-container"></span>
          <ha-icon .icon="${icon}" style="${iconColor ? `color:${iconColor}` : ''}"></ha-icon>
          <span class="route-badge"
                style="${badgeColor ? `--dfc-badge-bg:${badgeColor}` : ''}">${badgeText}</span>
        </div>
        ${route.show_label !== false && route.label
          ? html`<span class="route-label">${route.label}</span>`
          : ''}
      </div>
    `;
  }

  _renderPopup() {
    if (this._openPopupIndex == null) return '';
    const route = this._config?.routes?.[this._openPopupIndex];
    if (!hasSubRoutes(route)) return '';

    return html`
      <div class="popup-overlay" @click="${() => this._closePopup()}"></div>
      <div class="popup-menu" id="popup-menu">
        ${route.sub_routes.filter(sr => {
          if (sr.visibility && !isTemplate(sr.visibility) && !isVisibilityTruthy(sr.visibility)) return false;
          return true;
        }).map(sr => this._renderPopupItem(sr))}
      </div>
    `;
  }

  _renderPopupItem(sr) {
    const active      = this._isRouteActive(sr);
    const iconColor   = sr.icon_color && !isTemplate(sr.icon_color) ? sr.icon_color : null;
    const activeColor = sr.active_color && !isTemplate(sr.active_color) ? sr.active_color : null;
    const iconStyle   = (active && activeColor) ? `color:${activeColor}` : (iconColor ? `color:${iconColor}` : '');
    const badgeText   = sr.badge_content && !isTemplate(sr.badge_content) ? sr.badge_content : '';
    const badgeColor  = sr.badge_color && !isTemplate(sr.badge_color) ? sr.badge_color : null;

    return html`
      <button class="popup-item ${active ? 'active' : ''}"
              @pointerdown="${(e) => this._onPointerDown(e, sr)}"
              @pointermove="${this._onPointerMove}"
              @pointerup="${(e) => this._onPointerUp(e, sr)}"
              @pointerleave="${this._onPointerLeave}"
              @pointercancel="${() => this._onPointerCancelSimple()}"
              @contextmenu="${(e) => { if (sr.hold_action) e.preventDefault(); }}">
        <span class="popup-item-icon-wrap">
          <span class="ripple-container"></span>
          <ha-icon .icon="${sr.icon || 'mdi:circle'}" style="${iconStyle}"></ha-icon>
          ${badgeText ? html`
            <span class="popup-item-badge"
                  style="${badgeColor ? `--dfc-badge-bg:${badgeColor}` : ''}">${badgeText}</span>
          ` : ''}
        </span>
        ${sr.show_label !== false
          ? html`<span class="popup-item-label">${sr.label || ''}</span>`
          : ''}
      </button>
    `;
  }

  // ── Pointer event handling ─────────────────────────────────────────────
  // Stored per-element via WeakMap to survive re-renders

  _getPointerState(el) {
    if (!this._ptrStates) this._ptrStates = new WeakMap();
    let s = this._ptrStates.get(el);
    if (!s) {
      s = { holdTimer: null, isHold: false, isSwiped: false,
            tapCount: 0, tapTimer: null,
            startX: null, startY: null, lastX: null, lastY: null };
      this._ptrStates.set(el, s);
    }
    return s;
  }

  _onPointerDown(e, route, routeIndex) {
    const el = e.currentTarget;
    const s = this._getPointerState(el);
    s.isHold = false;
    s.isSwiped = false;
    s.startX = s.lastX = e.clientX;
    s.startY = s.lastY = e.clientY;
    this._createRipple(el, e);
    s.holdTimer = setTimeout(() => {
      s.isHold = true;
      if (route.hold_action) this._handleAction(route, 'hold', routeIndex, el);
    }, HOLD_DELAY_MS);
  }

  _onPointerMove(e) {
    const s = this._getPointerState(e.currentTarget);
    s.lastX = e.clientX;
    s.lastY = e.clientY;
    if (s.startY !== null) {
      if (Math.abs(e.clientY - s.startY) > 10 || Math.abs(e.clientX - s.startX) > 10) {
        clearTimeout(s.holdTimer);
      }
    }
  }

  _onPointerUp(e, route, routeIndex) {
    const el = e.currentTarget;
    const s = this._getPointerState(el);
    clearTimeout(s.holdTimer);
    if (s.isHold) return;
    s.lastX ??= e.clientX;
    s.lastY ??= e.clientY;

    // Swipe detection (main routes only)
    if (s.startY !== null && routeIndex !== undefined && !s.isSwiped) {
      if (isSwipeUp(s.startX, s.startY, s.lastX, s.lastY)) {
        s.isSwiped = true;
        this._handleAction(route, 'swipe', routeIndex, el);
        s.startX = s.startY = s.lastX = s.lastY = null;
        return;
      }
    }
    s.startX = s.startY = s.lastX = s.lastY = null;

    if (route.double_tap_action) {
      s.tapCount++;
      if (s.tapCount === 1) {
        s.tapTimer = setTimeout(() => {
          s.tapCount = 0;
          this._handleAction(route, 'tap', routeIndex, el);
        }, DOUBLE_TAP_MS);
      } else if (s.tapCount === 2) {
        clearTimeout(s.tapTimer);
        s.tapCount = 0;
        this._handleAction(route, 'double_tap', routeIndex, el);
      }
    } else {
      this._handleAction(route, 'tap', routeIndex, el);
    }
  }

  _onPointerLeave(e) {
    clearTimeout(this._getPointerState(e.currentTarget).holdTimer);
  }

  _onPointerCancel(e, route, routeIndex) {
    const s = this._getPointerState(e.currentTarget);
    clearTimeout(s.holdTimer);
    if (s.startY !== null && s.lastY !== null && routeIndex !== undefined && !s.isHold && !s.isSwiped) {
      if (isSwipeUp(s.startX, s.startY, s.lastX, s.lastY)) {
        s.isSwiped = true;
        this._handleAction(route, 'swipe', routeIndex, e.currentTarget);
      }
    }
    s.startX = s.startY = s.lastX = s.lastY = null;
  }

  _onPointerCancelSimple() {
    // Sub-route items don't need swipe handling
  }

  // ── Ripple ─────────────────────────────────────────────────────────────

  _createRipple(el, event) {
    const wrap = el.querySelector('.route-icon-wrap') || el.querySelector('.popup-item-icon-wrap');
    if (!wrap) return;
    const container = wrap.querySelector('.ripple-container');
    if (!container) return;
    const rect = wrap.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
    ripple.style.top  = `${event.clientY - rect.top - size / 2}px`;
    container.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  }

  // ── Stub for backward compat — listeners are now inline in template ────

  _attachAllRouteListeners() {
    // Listeners are bound declaratively via @pointerdown etc. in render()
  }

  // ── Mode detection ─────────────────────────────────────────────────────

  _isFloating() {
    const cfg = this._config ?? {};
    return window.innerWidth >= (cfg.breakpoint ?? 768) ? !!cfg.floating_desktop : !!cfg.floating_mobile;
  }

  _isInEditMode() {
    try {
      const huiRoot = this._getHuiRoot();
      if (huiRoot?.lovelace?.editMode === true || huiRoot?.editMode === true) return true;
    } catch (_) {}
    return walkAncestors(this, (el) => {
      const tag = el.tagName?.toLowerCase() ?? '';
      if (tag === 'ha-dialog' || tag === 'hui-card-options') return true;
      if (el.classList?.contains('edit-mode')) return true;
      if (tag === 'hui-root' && (el.editMode || el.lovelace?.editMode)) return true;
      return false;
    });
  }

  _isInsideCardEditor() {
    return walkAncestors(this, (el) => {
      const tag = el.tagName?.toLowerCase() ?? '';
      return tag === 'hui-dialog-edit-card' || tag === 'ha-dialog';
    });
  }

  // ── Layout tracking ────────────────────────────────────────────────────

  _setupPositionTracking() {
    this._stopPositionTracking();
    if (this._isInEditMode()) return;
    const update = () => this._updateFixedPosition();
    this._resizeObserver = new ResizeObserver(update);
    this._resizeObserver.observe(document.body);
    const observeSidebar = () => {
      try {
        const sidebar = document.querySelector('home-assistant')
          ?.shadowRoot?.querySelector('home-assistant-main')
          ?.shadowRoot?.querySelector('ha-sidebar');
        if (sidebar) { this._resizeObserver.observe(sidebar); return true; }
      } catch (_) {}
      return false;
    };
    if (!observeSidebar()) [100, 500, 1200].forEach(d => setTimeout(observeSidebar, d));
    [0, 50, 300, 800, 1800].forEach(d => setTimeout(update, d));
  }

  _stopPositionTracking() {
    this._resizeObserver?.disconnect();
    this._resizeObserver = null;
  }

  _updateFixedPosition() {
    const editMode    = this._isInEditMode();
    const nowFloating = !editMode && this._isFloating();

    if (nowFloating !== this._lastFloating) {
      this._lastFloating = nowFloating;
      this.requestUpdate();
      return;
    }
    this._lastFloating = nowFloating;

    const card   = this.shadowRoot?.querySelector('.footer-card.fixed');
    const spacer = this.shadowRoot?.querySelector('.spacer');
    if (!card || editMode) return;

    const bottomRaw    = this._config?.bottom_offset;
    const bottomNum    = parseFloat(bottomRaw) || 0;
    const bottomIsCSS  = bottomRaw && !isFinite(Number(String(bottomRaw).trim()));
    let bottom = bottomNum, left, right;

    if (nowFloating) {
      bottom += FLOATING_GAP;
      const bounds = this._getSectionBounds();
      if (bounds?.width > 0) {
        let sLeft  = Math.round(bounds.left);
        let sRight = Math.round(window.innerWidth - bounds.right);
        left  = sRight < 0 ? sLeft - sRight : sLeft;
        right = sRight < 0 ? 0 : sRight;
        if (right < FLOATING_GAP) {
          const offset = FLOATING_GAP - right;
          right += offset; left += offset;
        }
      } else { left = this._getSidebarWidth(); right = 0; }
    } else { left = this._getSidebarWidth(); right = 0; }

    card.style.bottom = bottomIsCSS ? `calc(${bottomRaw}${nowFloating ? ` + ${FLOATING_GAP}px` : ''})` : `${bottom}px`;
    card.style.left   = `${left}px`;
    card.style.right  = `${right}px`;
    const maxWidthCSS = toCSSValue(this._config?.max_width);
    if (nowFloating && maxWidthCSS) {
      card.style.maxWidth = maxWidthCSS;
      card.style.marginLeft = 'auto';
      card.style.marginRight = 'auto';
    } else {
      card.style.maxWidth = '';
      card.style.marginLeft = '';
      card.style.marginRight = '';
    }

    if (spacer) {
      const applyHeight = () => {
        const h = card.getBoundingClientRect().height;
        if (h <= 0) return false;
        spacer.style.height = `${nowFloating ? h + FLOATING_GAP : h}px`;
        return true;
      };
      if (!applyHeight()) requestAnimationFrame(applyHeight);
    }
  }

  _applyCSSVars() {
    const cfg = this._config ?? {};
    if (cfg.background?.trim()) this.style.setProperty('--ha-card-background', cfg.background.trim());
    else this.style.removeProperty('--ha-card-background');
    if (cfg.icon_size) this.style.setProperty('--dfc-icon-size', `${cfg.icon_size}px`);
    else this.style.removeProperty('--dfc-icon-size');
    if (cfg.font_size) this.style.setProperty('--dfc-font-size', `${cfg.font_size}px`);
    else this.style.removeProperty('--dfc-font-size');
  }

  // ── DOM helpers ────────────────────────────────────────────────────────

  _getHuiRoot() {
    return document.querySelector('home-assistant')
      ?.shadowRoot?.querySelector('home-assistant-main')
      ?.shadowRoot?.querySelector('partial-panel-resolver')
      ?.querySelector('ha-panel-lovelace')
      ?.shadowRoot?.querySelector('hui-root') ?? null;
  }

  _getSectionBounds() {
    let result = null;
    const handler = (e) => {
      for (const node of e.composedPath()) {
        if (!(node instanceof Element)) continue;
        const tag = node.tagName.toLowerCase();
        if (tag === 'hui-section' || tag === 'hui-grid-section') { result = node.getBoundingClientRect(); break; }
        if (tag === 'div') {
          const r = node.getBoundingClientRect();
          if (r.width > 50 && r.width < window.innerWidth * 0.99) { result = r; break; }
        }
        if (['hui-masonry-view', 'hui-sections-view', 'hui-panel-view', 'hui-root'].includes(tag)) break;
      }
    };
    this.addEventListener('_dfc-find-section', handler, { once: true });
    this.dispatchEvent(new Event('_dfc-find-section', { bubbles: true, composed: true }));
    return result;
  }

  _getSidebarWidth() {
    const cfg = this._config ?? {};
    if (cfg.respect_sidebar === false || window.innerWidth < (cfg.breakpoint ?? 768)) return 0;
    try {
      return Math.round(
        document.querySelector('home-assistant')
          ?.shadowRoot?.querySelector('home-assistant-main')
          ?.shadowRoot?.querySelector('ha-sidebar')
          ?.getBoundingClientRect().width ?? 0
      );
    } catch (_) { return 0; }
  }

  // ── Route state ────────────────────────────────────────────────────────

  _isRouteActive(route) {
    return matchesPath(route?.path, window.location.pathname);
  }

  _shouldHighlight(route) {
    if (this._isRouteActive(route)) return true;
    if (route.highlight_for_subroutes !== false && route.sub_routes?.some(sr => this._isRouteActive(sr))) return true;
    return false;
  }

  _findActiveBreadcrumbLabel() {
    const current = window.location.pathname;
    for (const route of (this._config?.routes ?? [])) {
      if (!Array.isArray(route.sub_routes)) continue;
      for (const sr of route.sub_routes) {
        if (matchesPath(sr.path, current)) return sr.label || '';
      }
    }
    return '';
  }

  // ── Template subscriptions ─────────────────────────────────────────────

  _unsubscribeAllTemplates() {
    for (const unsub of this._templateUnsubs) {
      try { unsub(); } catch (_) {}
    }
    this._templateUnsubs = [];
  }

  _loadTemplateCache() {
    try {
      return JSON.parse(localStorage.getItem('dfc-template-cache')) || {};
    } catch (_) { return {}; }
  }

  _saveTemplateCache() {
    try {
      localStorage.setItem('dfc-template-cache', JSON.stringify(this._templateState));
    } catch (_) {}
  }

  async _subscribeTemplate(template, key) {
    if (!this.hass?.connection || !isTemplate(template)) return;
    try {
      const unsub = await this.hass.connection.subscribeMessage(
        (msg) => {
          if (!msg.error) {
            this._templateState = { ...this._templateState, [key]: String(msg.result ?? '').trim() };
            this._saveTemplateCache();
          }
        },
        { type: 'render_template', template },
      );
      this._templateUnsubs.push(unsub);
    } catch (_) {}
  }

  async _subscribeAllTemplates() {
    const promises = [];
    const validKeys = new Set();
    const routes = this._config?.routes ?? [];
    for (let i = 0; i < routes.length; i++) {
      const r = routes[i];
      if (isTemplate(r.visibility))    { validKeys.add(`vis_${i}`);        promises.push(this._subscribeTemplate(r.visibility, `vis_${i}`)); }
      if (isTemplate(r.icon))          { validKeys.add(`icon_${i}`);       promises.push(this._subscribeTemplate(r.icon, `icon_${i}`)); }
      if (isTemplate(r.icon_color))    { validKeys.add(`icon_color_${i}`); promises.push(this._subscribeTemplate(r.icon_color, `icon_color_${i}`)); }
      if (isTemplate(r.badge_content)) { validKeys.add(`badge_${i}`);      promises.push(this._subscribeTemplate(r.badge_content, `badge_${i}`)); }
      if (isTemplate(r.badge_color))   { validKeys.add(`badge_color_${i}`);promises.push(this._subscribeTemplate(r.badge_color, `badge_color_${i}`)); }
    }
    // Remove stale keys from template state (e.g. from cache or previous config)
    const cleaned = {};
    for (const key of validKeys) {
      if (key in this._templateState) cleaned[key] = this._templateState[key];
    }
    this._templateState = cleaned;
    this._saveTemplateCache();
    await Promise.all(promises);
  }

  // ── Action handling ────────────────────────────────────────────────────

  _handleAction(route, actionType, routeIndex, anchorEl) {
    if (route[`haptic_${actionType}`] ?? route.haptic) this._hapticFeedback();
    const actionConfig = route[`${actionType}_action`];
    const isSubRoute = routeIndex === undefined;

    if (typeof actionConfig === 'string') {
      switch (actionConfig) {
        case 'ha-action': {
          const data = route[`${actionType}_action_data`];
          if (data?.action && data.action !== 'none') this._executeAction(data);
          if (isSubRoute) this._closePopup();
          return;
        }
        case 'open-popup':
          if (anchorEl) this._openPopup(routeIndex, anchorEl);
          return;
        case 'toggle-menu':
          this._dispatchHassEvent('hass-toggle-menu');
          if (isSubRoute) this._closePopup();
          return;
        case 'restart-dialog':
          _openRestartDialog(this.hass, t);
          if (isSubRoute) this._closePopup();
          return;
        case 'none':
          return;
        default: break;
      }
    }

    if (actionConfig?.action && actionConfig.action !== 'none') {
      this._executeAction(actionConfig);
      if (isSubRoute) this._closePopup();
      return;
    }

    if (actionType === 'tap') {
      if (route.path) this._navigate(route.path);
      else if (hasSubRoutes(route) && anchorEl) this._openPopup(routeIndex, anchorEl);
    } else if (actionType === 'swipe') {
      if (hasSubRoutes(route) && anchorEl) this._openPopup(routeIndex, anchorEl);
    }

    if (isSubRoute) this._closePopup();
  }

  _executeAction(action) {
    if (!action || !this.hass) return;
    const act = typeof action === 'string' ? { action } : action;
    switch (act.action) {
      case 'navigate':
        this._navigate(act.navigation_path || ''); break;
      case 'url':
        if (act.url_path) window.open(act.url_path, '_blank'); break;
      case 'call-service':
      case 'perform-action': {
        const svcId = act.perform_action || act.service || '';
        const [domain, service] = svcId.split('.');
        if (domain && service) this.hass.callService(domain, service, act.data || act.service_data || {}, act.target);
        break;
      }
      case 'more-info': {
        const entityId = act.target?.entity_id || act.entity;
        if (entityId) {
          const eid = Array.isArray(entityId) ? entityId[0] : entityId;
          this._dispatchHassEvent('hass-more-info', { entityId: eid });
        }
        break;
      }
      case 'fire-dom-event':
        this.dispatchEvent(new CustomEvent('ll-custom', { bubbles: true, composed: true, detail: act }));
        break;
      case 'none': break;
      default:
        if (act.navigation_path) this._navigate(act.navigation_path); break;
    }
  }

  _navigate(path) {
    if (!path || window.location.pathname === path) return;
    history.pushState(null, '', path);
    window.dispatchEvent(new CustomEvent('location-changed', { bubbles: true, composed: true }));
    setTimeout(() => this.requestUpdate(), 50);
  }

  _hapticFeedback() {
    try { navigator.vibrate?.(50); } catch (_) {}
  }

  _dispatchHassEvent(type, detail = {}) {
    this.dispatchEvent(new CustomEvent(type, { bubbles: true, composed: true, detail }));
  }

  // ── Popup ──────────────────────────────────────────────────────────────

  _openPopup(routeIndex, anchorEl) {
    this._closePopup();
    const route = this._config?.routes?.[routeIndex];
    if (!hasSubRoutes(route)) return;
    this._openPopupIndex = routeIndex;

    // Position after render
    this.updateComplete.then(() => {
      const menu = this.shadowRoot?.getElementById('popup-menu');
      if (!menu) return;
      const anchorRect = anchorEl.getBoundingClientRect();
      const menuRect   = menu.getBoundingClientRect();
      let left = anchorRect.left + anchorRect.width / 2 - menuRect.width / 2;
      let bottom = window.innerHeight - anchorRect.top + 8;
      left = Math.max(8, Math.min(left, window.innerWidth - menuRect.width - 8));
      if (bottom + menuRect.height > window.innerHeight - 8) {
        menu.style.top = `${anchorRect.bottom + 8}px`;
        menu.style.bottom = 'auto';
      } else {
        menu.style.bottom = `${bottom}px`;
      }
      menu.style.left = `${left}px`;
    });
  }

  _closePopup() {
    if (this._openPopupIndex != null) this._openPopupIndex = null;
  }
}


// ── Editor styles ────────────────────────────────────────────────────────────

const EDITOR_STYLES = css`
  :host { display: block; }

  .tabs {
    display: flex;
    border-bottom: 1px solid var(--divider-color, rgba(0,0,0,.12));
    margin-bottom: 16px;
  }
  .tab {
    flex: 1;
    padding: 10px 4px;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    cursor: pointer;
    font-family: var(--mdc-typography-button-font-family, Roboto, sans-serif);
    font-size: var(--mdc-typography-button-font-size, 13px);
    font-weight: var(--mdc-typography-button-font-weight, 500);
    color: var(--secondary-text-color, #727272);
    transition: color 150ms, border-color 150ms;
    text-transform: var(--mdc-typography-button-text-transform, uppercase);
    letter-spacing: var(--mdc-typography-button-letter-spacing, 0.0892857143em);
    -webkit-tap-highlight-color: transparent;
  }
  .tab.active {
    color: var(--primary-color, #03a9f4);
    border-bottom-color: var(--primary-color, #03a9f4);
  }
  .tab-panel        { display: none; }
  .tab-panel.active { display: block; }

  .settings-group {
    border: 1px solid var(--divider-color, rgba(0,0,0,.12));
    border-radius: 8px;
    margin-bottom: 12px;
    overflow: hidden;
  }
  .settings-group-title {
    font-size: 11px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--secondary-text-color, #727272);
    padding: 8px 16px;
    background: var(--secondary-background-color, rgba(0,0,0,.04));
    border-bottom: 1px solid var(--divider-color, rgba(0,0,0,.08));
    font-family: var(--mdc-typography-font-family, Roboto, sans-serif);
  }
  .settings-group > div:last-child { padding: 12px; }

  .route-item, .sub-route-item {
    border: 1px solid var(--divider-color, rgba(0,0,0,.12));
    border-radius: 8px;
    margin-bottom: 4px;
    overflow: hidden;
    transition: opacity 0.15s, border-color 0.15s;
  }
  .sub-route-item { border-radius: 6px; }
  .route-item.dragging, .sub-route-item.dragging { opacity: 0.4; pointer-events: none; }

  .route-item-header, .sub-route-item-header {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 4px 4px 4px 0;
  }
  .route-item-header.editor-open,
  .sub-route-item-header.editor-open {
    border-bottom: 1px solid var(--divider-color, rgba(0,0,0,.12));
  }

  .drag-handle {
    cursor: grab;
    color: var(--secondary-text-color, #727272);
    display: flex;
    align-items: center;
    padding: 4px 2px;
    flex-shrink: 0;
  }
  .drag-handle:active { cursor: grabbing; }

  .route-item-label-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    padding: 4px 0;
  }
  .route-item-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--primary-text-color);
    font-family: var(--mdc-typography-font-family, Roboto, sans-serif);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .route-item-sublabel {
    font-size: 11px;
    color: var(--secondary-text-color, #727272);
    font-family: var(--mdc-typography-font-family, Roboto, sans-serif);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .route-icon-btn {
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    color: var(--secondary-text-color, #727272);
    transition: color 0.15s, background 0.15s;
    flex-shrink: 0;
  }
  .route-icon-btn:hover {
    background: var(--secondary-background-color, rgba(0,0,0,.06));
    color: var(--primary-text-color);
  }
  .route-icon-btn.edit-active  { color: var(--primary-color, #03a9f4); }
  .route-icon-btn.delete-btn   { color: var(--error-color, #f44336); }
  .route-icon-btn.delete-btn:hover { color: var(--error-color, #f44336); }

  .route-editor-slot, .sub-route-editor-slot { padding: 8px 12px 12px; }

  .add-route-btn {
    width: 100%;
    margin-top: 4px;
    padding: 10px;
    background: none;
    border: 1px dashed var(--divider-color, rgba(0,0,0,.2));
    border-radius: 8px;
    color: var(--primary-color, #03a9f4);
    cursor: pointer;
    font-size: 13px;
    font-family: var(--mdc-typography-button-font-family, Roboto, sans-serif);
    font-weight: 500;
    letter-spacing: var(--mdc-typography-button-letter-spacing, 0.0892857143em);
  }
  .add-route-btn:hover {
    background: var(--secondary-background-color, rgba(0,0,0,.04));
  }

  .sub-routes-section {
    margin-top: 12px;
    border: 1px solid var(--divider-color, rgba(0,0,0,.12));
    border-radius: 8px;
    overflow: hidden;
  }
  .sub-routes-section-title {
    font-size: 11px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--secondary-text-color, #727272);
    padding: 8px 12px;
    background: var(--secondary-background-color, rgba(0,0,0,.04));
    border-bottom: 1px solid var(--divider-color, rgba(0,0,0,.08));
    font-family: var(--mdc-typography-font-family, Roboto, sans-serif);
  }
  .sub-routes-list { padding: 8px; }

  .action-field { margin-top: 8px; }
  .action-field .action-ha-selector { margin-top: 8px; }

  .visual-selector-label {
    font-size: 12px;
    font-weight: 500;
    color: var(--secondary-text-color, #727272);
    font-family: var(--mdc-typography-font-family, Roboto, sans-serif);
    margin: 14px 0 6px;
  }
  .visual-selector-label:first-child { margin-top: 0; }
  .visual-selector-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 4px;
  }
  .visual-option {
    flex: 1;
    min-width: 70px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 10px 8px 8px;
    border: 2px solid var(--divider-color, rgba(0,0,0,.12));
    border-radius: 12px;
    cursor: pointer;
    background: transparent;
    transition: border-color 0.15s, background 0.15s;
    position: relative;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }
  .visual-option input[type="radio"] {
    position: absolute;
    top: 8px;
    left: 8px;
    margin: 0;
    accent-color: var(--primary-color, #03a9f4);
    pointer-events: none;
  }
  .visual-option.selected {
    border-color: var(--primary-color, #03a9f4);
    background: color-mix(in srgb, var(--primary-color, #03a9f4) 8%, transparent);
  }
  .visual-preview {
    color: var(--secondary-text-color, #727272);
    margin-top: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .visual-option.selected .visual-preview {
    color: var(--primary-color, #03a9f4);
  }
  .visual-option-label {
    font-size: 12px;
    color: var(--primary-text-color, #212121);
    font-family: var(--mdc-typography-font-family, Roboto, sans-serif);
  }

  ha-expansion-panel {
    margin-bottom: 8px;
  }
  .route-item.drop-before, .sub-route-item.drop-before {
    border-top: 2px solid var(--primary-color, #03a9f4);
  }
`;

// ── Editor labels and helpers ────────────────────────────────────────────────

const EDITOR_LABELS = {
  icon_size: 'Icon Size', font_size: 'Label Font Size',
  background: 'Background Color (CSS)', blur: 'Glassmorphism (Blur)',
  show_breadcrumb: 'Show Breadcrumb', bottom_offset: 'Bottom Offset',
  floating_mobile: 'Floating on Mobile', floating_desktop: 'Floating on Desktop',
  max_width: 'Max Width', respect_sidebar: 'Respect Sidebar',
  breakpoint: 'Breakpoint (px)',
};

const EDITOR_HELPERS = {
  icon_size: 'Width and height of route icons in pixels',
  font_size: 'Font size of labels in pixels',
  background: 'CSS value or variable, e.g. var(--sidebar-background-color)',
  blur: 'Background blur in floating mode (glassmorphism effect)',
  show_breadcrumb: 'Show active sub-route name above the footer bar',
  bottom_offset: 'CSS value, e.g. 0, 56px, env(safe-area-inset-bottom)',
  floating_mobile: 'Floating mode on mobile (< breakpoint)',
  floating_desktop: 'Floating mode on desktop (>= breakpoint)',
  max_width: 'CSS value, e.g. 600px, 80%, calc(100vw - 200px)',
  respect_sidebar: 'In docked mode: position offset by sidebar',
  breakpoint: 'Threshold for mobile/desktop distinction',
};

const ROUTE_LABELS = {
  icon: 'Icon', label: 'Label', show_label: 'Show Label', path: 'Navigation Path',
  icon_color: 'Icon Color', active_color: 'Active Color', visibility: 'Visibility',
  haptic_tap: 'On Tap', haptic_hold: 'On Hold', haptic_double_tap: 'On Double Tap',
  haptic_swipe: 'On Swipe', badge_content: 'Badge Content', badge_color: 'Badge Color',
  highlight_for_subroutes: 'Highlight on Active Sub-Route',
  tap_action: 'Tap Action', hold_action: 'Hold Action',
  double_tap_action: 'Double Tap Action', swipe_action: 'Swipe-Up Action',
  tap_action_data: 'Tap Action', hold_action_data: 'Hold Action',
  double_tap_action_data: 'Double Tap Action', swipe_action_data: 'Swipe-Up Action',
};

const ROUTE_HELPERS = {
  icon: 'MDI icon or Jinja2 template', icon_color: 'CSS color or Jinja2 template',
  active_color: 'Icon background color when route is active',
  visibility: 'Jinja2 template: route is shown when result is truthy (true/on/yes/non-empty)',
  badge_content: 'Text in badge (Jinja2 template supported)',
  badge_color: 'Badge background color (Jinja2 template supported)',
  tap_action: 'Default: path \u2192 navigate, sub-routes \u2192 open popup',
  hold_action: 'Default: no action', double_tap_action: 'Default: no action',
  swipe_action: 'Default: open popup (if sub-routes exist)',
  tap_action_data: '', hold_action_data: '', double_tap_action_data: '', swipe_action_data: '',
  highlight_for_subroutes: 'Highlight route when a sub-route is active',
};

const SCHEMA_BASIS = [
  { name: 'icon', selector: { icon: {} } }, { name: 'label', selector: { text: {} } },
  { name: 'show_label', selector: { boolean: {} } }, { name: 'path', selector: { navigation: {} } },
];
const SCHEMA_APPEARANCE_ROUTE = [
  { name: 'icon_color', selector: { text: {} } }, { name: 'active_color', selector: { ui_color: {} } },
  { name: 'visibility', selector: { text: {} } }, { name: 'highlight_for_subroutes', selector: { boolean: {} } },
];
const SCHEMA_APPEARANCE_SUBROUTE = SCHEMA_APPEARANCE_ROUTE.filter(s => s.name !== 'highlight_for_subroutes');
const SCHEMA_BADGE = [
  { name: 'badge_content', selector: { text: {} } }, { name: 'badge_color', selector: { ui_color: {} } },
];
const SCHEMA_HAPTIC_ROUTE = [
  { name: 'haptic_tap', selector: { boolean: {} } }, { name: 'haptic_hold', selector: { boolean: {} } },
  { name: 'haptic_double_tap', selector: { boolean: {} } }, { name: 'haptic_swipe', selector: { boolean: {} } },
];
const SCHEMA_HAPTIC_SUBROUTE = SCHEMA_HAPTIC_ROUTE.filter(s => s.name !== 'haptic_swipe');
const MAIN_ROUTE_ACTION_KEYS = ['tap_action', 'hold_action', 'double_tap_action', 'swipe_action'];
const SUB_ROUTE_ACTION_KEYS  = ['tap_action', 'hold_action', 'double_tap_action'];

const SVG_DOCKED = html`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 44" width="72" height="44">
    <rect x="1" y="1" width="70" height="42" rx="4" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 2" fill="none" opacity="0.4"/>
    <rect x="1" y="32" width="70" height="11" fill="currentColor" opacity="0.75"/>
  </svg>`;
const SVG_FLOATING = html`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 44" width="72" height="44">
    <rect x="1" y="1" width="70" height="42" rx="4" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 2" fill="none" opacity="0.4"/>
    <rect x="10" y="30" width="52" height="11" rx="6" fill="currentColor" opacity="0.75"/>
  </svg>`;

const SCHEMA_SETTINGS_APPEARANCE = [
  { name: 'icon_size', selector: { number: { min: 12, max: 64, mode: 'box', unit_of_measurement: 'px' } } },
  { name: 'font_size', selector: { number: { min: 6, max: 24, mode: 'box', unit_of_measurement: 'px' } } },
  { name: 'background', selector: { text: {} } },
  { name: 'blur', selector: { boolean: {} } },
  { name: 'show_breadcrumb', selector: { boolean: {} } },
];
const SCHEMA_SETTINGS_MAX_WIDTH = [
  { name: 'max_width', selector: { text: {} } },
];
const SCHEMA_SETTINGS_POSITION = [
  { name: 'bottom_offset', selector: { text: {} } },
  { name: 'respect_sidebar', selector: { boolean: {} } },
  { name: 'breakpoint', selector: { number: { min: 320, max: 3840, mode: 'box', unit_of_measurement: 'px' } } },
];

const _editorLabel  = (hass, s) => t(hass, EDITOR_LABELS[s.name] ?? s.name);
const _editorHelper = (hass, s) => t(hass, EDITOR_HELPERS[s.name] ?? '');
const _routeLabel   = (hass, s) => t(hass, ROUTE_LABELS[s.name] ?? s.name);
const _routeHelper  = (hass, s) => t(hass, ROUTE_HELPERS[s.name] ?? '');


// ── Visual Editor (LitElement) ───────────────────────────────────────────────

class DashboardFooterCardEditor extends LitElement {
  static get properties() {
    return {
      hass:              { attribute: false },
      _config:           { state: true },
      _activePanel:      { state: true },
      _openRouteIdx:     { state: true },
      _openSubRouteIdx:  { state: true },
    };
  }

  static get styles() { return EDITOR_STYLES; }

  constructor() {
    super();
    this._config = {};
    this._activePanel = 'routes';
    this._openRouteIdx = null;
    this._openSubRouteIdx = null;
    this._ignoreNextSetConfig = false;
    this._dragSourceIdx = null;
    this._dragIsSubRoute = false;
    this._dragSubRouteParent = null;
    this._dropTargetIdx = null;
  }

  setConfig(config) {
    if (this._ignoreNextSetConfig) {
      this._ignoreNextSetConfig = false;
      return;
    }
    const cfg = { ...config };
    delete cfg._editingRouteIndex;
    this._config = cfg;
  }

  _fireConfigChanged() {
    this._ignoreNextSetConfig = true;
    this.dispatchEvent(new CustomEvent('config-changed', {
      bubbles: true, composed: true, detail: { config: this._config },
    }));
  }

  _formData() {
    const cfg = this._config;
    const data = {
      icon_size: cfg.icon_size ?? '', font_size: cfg.font_size ?? '',
      background: cfg.background ?? '', blur: cfg.blur ?? false,
      show_breadcrumb: cfg.show_breadcrumb ?? false, bottom_offset: cfg.bottom_offset ?? '',
      floating_mobile: cfg.floating_mobile ?? false, floating_desktop: cfg.floating_desktop ?? false,
      respect_sidebar: cfg.respect_sidebar ?? true, breakpoint: cfg.breakpoint ?? 768,
    };
    data.max_width = cfg.max_width ?? '';
    return data;
  }

  _setEditingRouteIndex(index) {
    if (index != null) {
      this._config = { ...this._config, _editingRouteIndex: index };
    } else {
      const cfg = { ...this._config };
      delete cfg._editingRouteIndex;
      this._config = cfg;
    }
    this._fireConfigChanged();
  }

  // ── Rendering ──────────────────────────────────────────────────────────

  render() {
    if (!this._config) return html``;
    return html`
      <div class="tabs">
        <button class="tab ${this._activePanel === 'routes' ? 'active' : ''}"
                @click=${() => { this._activePanel = 'routes'; }}>${t(this.hass, 'Routes')}</button>
        <button class="tab ${this._activePanel === 'settings' ? 'active' : ''}"
                @click=${() => { this._activePanel = 'settings'; }}>${t(this.hass, 'Settings')}</button>
      </div>
      <div class="tab-panel ${this._activePanel === 'routes' ? 'active' : ''}">
        <div class="routes-list"
             @dragover=${(e) => this._onListDragOver(e, false)}
             @dragleave=${(e) => this._onListDragLeave(e, false)}>
          ${(this._config.routes ?? []).map((route, i) => this._renderRouteItem(route, i))}
        </div>
        <button class="add-route-btn" @click=${this._addRoute}>${t(this.hass, '+ Add Route')}</button>
      </div>
      <div class="tab-panel ${this._activePanel === 'settings' ? 'active' : ''}">
        ${this._renderSettings()}
      </div>
    `;
  }

  _renderSettings() {
    const data = this._formData();
    const floatMobile  = !!this._config.floating_mobile;
    const floatDesktop = !!this._config.floating_desktop;
    const isFloating   = floatMobile || floatDesktop;
    return html`
      ${this._renderCollapsible('settings-appearance', t(this.hass, 'Appearance'), true, html`
        <ha-form .hass=${this.hass} .data=${data} .schema=${SCHEMA_SETTINGS_APPEARANCE}
          .computeLabel=${(s) => _editorLabel(this.hass, s)} .computeHelper=${(s) => _editorHelper(this.hass, s)}
          @value-changed=${this._onSettingsChanged}></ha-form>
      `)}
      ${this._renderCollapsible('settings-layout', t(this.hass, 'Layout'), false, html`
        <div class="visual-selector-label">${t(this.hass, 'Mobile')}</div>
        <div class="visual-selector-row">
          ${this._renderVisualOption('floating_mobile', false, floatMobile, t(this.hass, 'Docked'), SVG_DOCKED)}
          ${this._renderVisualOption('floating_mobile', true, floatMobile, t(this.hass, 'Floating'), SVG_FLOATING)}
        </div>
        <div class="visual-selector-label">${t(this.hass, 'Desktop')}</div>
        <div class="visual-selector-row">
          ${this._renderVisualOption('floating_desktop', false, floatDesktop, t(this.hass, 'Docked'), SVG_DOCKED)}
          ${this._renderVisualOption('floating_desktop', true, floatDesktop, t(this.hass, 'Floating'), SVG_FLOATING)}
        </div>
        ${isFloating ? html`
          <ha-form .hass=${this.hass} .data=${data} .schema=${SCHEMA_SETTINGS_MAX_WIDTH}
            .computeLabel=${(s) => _editorLabel(this.hass, s)} .computeHelper=${(s) => _editorHelper(this.hass, s)}
            @value-changed=${this._onSettingsChanged}></ha-form>
        ` : ''}
      `)}
      ${this._renderCollapsible('settings-position', t(this.hass, 'Position & Behavior'), false, html`
        <ha-form .hass=${this.hass} .data=${data} .schema=${SCHEMA_SETTINGS_POSITION}
          .computeLabel=${(s) => _editorLabel(this.hass, s)} .computeHelper=${(s) => _editorHelper(this.hass, s)}
          @value-changed=${this._onSettingsChanged}></ha-form>
      `)}
    `;
  }

  _renderVisualOption(name, value, current, label, svgTemplate) {
    const selected = value === current;
    return html`
      <label class="visual-option ${selected ? 'selected' : ''}"
             @click=${() => this._setVisualOption(name, value)}>
        <input type="radio" name="${name}" value="${value}" .checked=${selected}>
        <div class="visual-preview">${svgTemplate}</div>
        <span class="visual-option-label">${label}</span>
      </label>
    `;
  }

  _setVisualOption(name, value) {
    this._config = { ...this._config, [name]: value };
    this._fireConfigChanged();
  }

  _renderCollapsible(key, title, defaultOpen, content) {
    const ICONS = {
      basis: 'mdi:tune', appearance: 'mdi:palette-outline',
      badge: 'mdi:numeric', haptic: 'mdi:vibrate',
      actions: 'mdi:gesture-tap', subroutes: 'mdi:menu',
      layout: 'mdi:page-layout-body', position: 'mdi:dock-bottom',
    };
    const parts = key.split('-');
    const icon = ICONS[parts[parts.length - 1]] || '';
    return html`
      <ha-expansion-panel .header=${title} leftChevron outlined ?expanded=${defaultOpen}>
        ${icon ? html`<ha-icon slot="leading-icon" icon="${icon}"></ha-icon>` : ''}
        ${content}
      </ha-expansion-panel>
    `;
  }

  _renderRouteItem(route, index) {
    const isOpen = this._openRouteIdx === index;
    return html`
      <div class="route-item" data-index="${index}"
           @dragstart=${(e) => this._onDragStart(e, index, false)}
           @dragend=${(e) => this._onDragEnd(e, index, false)}>
        <div class="route-item-header ${isOpen ? 'editor-open' : ''}">
          <span class="drag-handle"
                @mousedown=${(e) => { e.target.closest('.route-item')?.setAttribute('draggable', 'true'); }}>
            <ha-icon icon="mdi:drag"></ha-icon>
          </span>
          <div class="route-item-label-wrap">
            <span class="route-item-label">${route.label || route.icon || t(this.hass, 'Route')}</span>
            ${route.path ? html`<span class="route-item-sublabel">${route.path}</span>` : ''}
          </div>
          <button class="route-icon-btn ${isOpen ? 'edit-active' : ''}" title="${t(this.hass, 'Edit')}"
                  @click=${() => this._toggleRouteEditor(index)}>
            <ha-icon icon="mdi:pencil"></ha-icon>
          </button>
          <button class="route-icon-btn" title="${t(this.hass, 'Duplicate')}"
                  @click=${() => this._duplicateRoute(index)}>
            <ha-icon icon="mdi:content-copy"></ha-icon>
          </button>
          <button class="route-icon-btn delete-btn" title="${t(this.hass, 'Remove')}"
                  @click=${() => this._deleteRoute(index)}>
            <ha-icon icon="mdi:delete"></ha-icon>
          </button>
        </div>
        ${isOpen ? html`
          <div class="route-editor-slot">
            ${this._renderRouteEditor(route, index, false)}
          </div>
        ` : ''}
      </div>
    `;
  }

  _routeFormData(route, isSubRoute) {
    const data = {
      icon: route.icon ?? '', label: route.label ?? '',
      show_label: route.show_label ?? true, path: route.path ?? '',
      icon_color: route.icon_color ?? '', active_color: route.active_color ?? '',
      visibility: route.visibility ?? '',
      haptic_tap: route.haptic_tap ?? route.haptic ?? false,
      haptic_hold: route.haptic_hold ?? route.haptic ?? false,
      haptic_double_tap: route.haptic_double_tap ?? route.haptic ?? false,
      badge_content: route.badge_content ?? '', badge_color: route.badge_color ?? '',
    };
    if (!isSubRoute) {
      data.haptic_swipe = route.haptic_swipe ?? false;
      data.highlight_for_subroutes = route.highlight_for_subroutes ?? true;
    }
    return data;
  }

  _renderRouteEditor(route, index, isSubRoute, routeIndex) {
    const prefix = isSubRoute ? `sr-${routeIndex}-${index}` : `r-${index}`;
    const schemaAppearance = isSubRoute ? SCHEMA_APPEARANCE_SUBROUTE : SCHEMA_APPEARANCE_ROUTE;
    const schemaHaptic = isSubRoute ? SCHEMA_HAPTIC_SUBROUTE : SCHEMA_HAPTIC_ROUTE;
    const actionKeys = isSubRoute ? SUB_ROUTE_ACTION_KEYS : MAIN_ROUTE_ACTION_KEYS;
    const data = this._routeFormData(route, isSubRoute);

    return html`
      ${this._renderCollapsible(`${prefix}-basis`, t(this.hass, 'Basic'), true, html`
        <ha-form .hass=${this.hass} .data=${data} .schema=${SCHEMA_BASIS}
          .computeLabel=${(s) => _routeLabel(this.hass, s)} .computeHelper=${(s) => _routeHelper(this.hass, s)}
          @value-changed=${(e) => this._onRouteFormChanged(e, index,
            ['icon', 'label', 'show_label', 'path'], isSubRoute, routeIndex)}
        ></ha-form>
      `)}
      ${this._renderCollapsible(`${prefix}-appearance`, t(this.hass, 'Appearance'), false, html`
        <ha-form .hass=${this.hass} .data=${data} .schema=${schemaAppearance}
          .computeLabel=${(s) => _routeLabel(this.hass, s)} .computeHelper=${(s) => _routeHelper(this.hass, s)}
          @value-changed=${(e) => this._onRouteFormChanged(e, index,
            schemaAppearance.map(s => s.name), isSubRoute, routeIndex)}
        ></ha-form>
      `)}
      ${this._renderCollapsible(`${prefix}-badge`, t(this.hass, 'Badge'), false, html`
        <ha-form .hass=${this.hass} .data=${data} .schema=${SCHEMA_BADGE}
          .computeLabel=${(s) => _routeLabel(this.hass, s)} .computeHelper=${(s) => _routeHelper(this.hass, s)}
          @value-changed=${(e) => this._onRouteFormChanged(e, index,
            ['badge_content', 'badge_color'], isSubRoute, routeIndex)}
        ></ha-form>
      `)}
      ${this._renderCollapsible(`${prefix}-haptic`, t(this.hass, 'Haptic Feedback'), false, html`
        <ha-form .hass=${this.hass} .data=${data} .schema=${schemaHaptic}
          .computeLabel=${(s) => _routeLabel(this.hass, s)} .computeHelper=${(s) => _routeHelper(this.hass, s)}
          @value-changed=${(e) => this._onRouteFormChanged(e, index,
            schemaHaptic.map(s => s.name), isSubRoute, routeIndex)}
        ></ha-form>
      `)}
      ${this._renderCollapsible(`${prefix}-actions`, t(this.hass, 'Actions'), false, html`
        ${actionKeys.map(ak => this._renderActionField(route, ak, index, isSubRoute, routeIndex))}
      `)}
      ${!isSubRoute ? this._renderCollapsible(`${prefix}-subroutes`, t(this.hass, 'Popup Menu Routes'), false, html`
        <div class="sub-routes-list" data-route="${index}"
             @dragover=${(e) => this._onListDragOver(e, true)}
             @dragleave=${(e) => this._onListDragLeave(e, true)}>
          ${(route.sub_routes ?? []).map((sr, si) => this._renderSubRouteItem(sr, si, index))}
        </div>
        <button class="add-route-btn" @click=${() => this._addSubRoute(index)}>${t(this.hass, '+ Add Sub-Route')}</button>
      `) : ''}
    `;
  }

  _renderActionField(route, actionKey, index, isSubRoute, routeIndex) {
    const options = [
      { value: 'default', label: t(this.hass, 'Default') },
      { value: 'ha-action', label: t(this.hass, 'Home Assistant Action') },
      ...(!isSubRoute ? [{ value: 'open-popup', label: t(this.hass, 'Open Popup Menu') }] : []),
      { value: 'toggle-menu', label: t(this.hass, 'Toggle Main Menu') },
      { value: 'restart-dialog', label: t(this.hass, 'Restart Menu') },
      { value: 'none', label: t(this.hass, 'No Action') },
    ];
    let currentType = route[actionKey] || 'default';
    if (typeof currentType !== 'string' || !options.some(o => o.value === currentType)) {
      currentType = currentType?.action ? 'ha-action' : 'default';
    }
    const dataKey = `${actionKey}_data`;
    return html`
      <div class="action-field">
        <ha-form .hass=${this.hass}
          .data=${{ [actionKey]: currentType }}
          .schema=${[{ name: actionKey, selector: { select: { options, mode: 'dropdown' } } }]}
          .computeLabel=${(s) => _routeLabel(this.hass, s)} .computeHelper=${(s) => _routeHelper(this.hass, s)}
          @value-changed=${(e) => this._onActionTypeChanged(e, actionKey, dataKey, index, isSubRoute, routeIndex)}
        ></ha-form>
        ${currentType === 'ha-action' ? html`
          <div class="action-ha-selector">
            <ha-form .hass=${this.hass}
              .data=${{ [dataKey]: route[dataKey] ?? {} }}
              .schema=${[{ name: dataKey, selector: { ui_action: {} } }]}
              .computeLabel=${(s) => _routeLabel(this.hass, s)} .computeHelper=${(s) => _routeHelper(this.hass, s)}
              @value-changed=${(e) => this._onActionDataChanged(e, dataKey, index, isSubRoute, routeIndex)}
            ></ha-form>
          </div>
        ` : ''}
      </div>
    `;
  }

  _renderSubRouteItem(sr, si, routeIndex) {
    const isOpen = this._openRouteIdx === routeIndex && this._openSubRouteIdx === si;
    return html`
      <div class="sub-route-item" data-index="${si}"
           @dragstart=${(e) => this._onDragStart(e, si, true, routeIndex)}
           @dragend=${(e) => this._onDragEnd(e, si, true, routeIndex)}>
        <div class="sub-route-item-header ${isOpen ? 'editor-open' : ''}">
          <span class="drag-handle"
                @mousedown=${(e) => { e.target.closest('.sub-route-item')?.setAttribute('draggable', 'true'); }}>
            <ha-icon icon="mdi:drag"></ha-icon>
          </span>
          <div class="route-item-label-wrap">
            <span class="route-item-label">${sr.label || sr.icon || t(this.hass, 'Sub-Route')}</span>
            ${sr.path ? html`<span class="route-item-sublabel">${sr.path}</span>` : ''}
          </div>
          <button class="route-icon-btn ${isOpen ? 'edit-active' : ''}" title="${t(this.hass, 'Edit')}"
                  @click=${() => this._toggleSubRouteEditor(si)}>
            <ha-icon icon="mdi:pencil"></ha-icon>
          </button>
          <button class="route-icon-btn" title="${t(this.hass, 'Duplicate')}"
                  @click=${() => this._duplicateSubRoute(si, routeIndex)}>
            <ha-icon icon="mdi:content-copy"></ha-icon>
          </button>
          <button class="route-icon-btn delete-btn" title="${t(this.hass, 'Remove')}"
                  @click=${() => this._deleteSubRoute(si, routeIndex)}>
            <ha-icon icon="mdi:delete"></ha-icon>
          </button>
        </div>
        ${isOpen ? html`
          <div class="sub-route-editor-slot">
            ${this._renderRouteEditor(sr, si, true, routeIndex)}
          </div>
        ` : ''}
      </div>
    `;
  }

  // ── Event handlers ─────────────────────────────────────────────────────

  _onSettingsChanged(e) {
    e.stopPropagation();
    const updated = { ...this._config, ...e.detail.value };
    for (const key of ['max_width', 'icon_size', 'font_size', 'bottom_offset']) {
      if (!updated[key] && updated[key] !== 0) delete updated[key];
    }
    this._config = updated;
    this._fireConfigChanged();
  }

  _onRouteFormChanged(e, index, keys, isSubRoute, routeIndex) {
    e.stopPropagation();
    const val = e.detail.value;
    const currentRoute = isSubRoute
      ? this._config.routes[routeIndex].sub_routes[index]
      : this._config.routes[index];
    const updated = { ...currentRoute };
    for (const key of keys) {
      if (val[key] !== undefined) updated[key] = val[key];
      else delete updated[key];
    }
    const actionKeys = isSubRoute ? SUB_ROUTE_ACTION_KEYS : MAIN_ROUTE_ACTION_KEYS;
    cleanRouteConfig(updated, actionKeys);
    this._applyRouteUpdate(index, updated, isSubRoute, routeIndex);
  }

  _onActionTypeChanged(e, actionKey, dataKey, index, isSubRoute, routeIndex) {
    e.stopPropagation();
    const newType = e.detail.value[actionKey];
    const currentRoute = isSubRoute
      ? this._config.routes[routeIndex].sub_routes[index]
      : this._config.routes[index];
    const updated = { ...currentRoute, [actionKey]: newType };
    if (newType !== 'ha-action') delete updated[dataKey];
    const actionKeys = isSubRoute ? SUB_ROUTE_ACTION_KEYS : MAIN_ROUTE_ACTION_KEYS;
    cleanRouteConfig(updated, actionKeys);
    this._applyRouteUpdate(index, updated, isSubRoute, routeIndex);
  }

  _onActionDataChanged(e, dataKey, index, isSubRoute, routeIndex) {
    e.stopPropagation();
    const currentRoute = isSubRoute
      ? this._config.routes[routeIndex].sub_routes[index]
      : this._config.routes[index];
    const updated = { ...currentRoute, [dataKey]: e.detail.value[dataKey] };
    this._applyRouteUpdate(index, updated, isSubRoute, routeIndex);
  }

  _applyRouteUpdate(index, newRoute, isSubRoute, routeIndex) {
    const routes = [...(this._config.routes ?? [])];
    if (isSubRoute) {
      const subs = [...(routes[routeIndex].sub_routes ?? [])];
      subs[index] = newRoute;
      routes[routeIndex] = { ...routes[routeIndex], sub_routes: subs };
    } else {
      routes[index] = newRoute;
    }
    this._config = { ...this._config, routes };
    this._fireConfigChanged();
  }

  _toggleRouteEditor(index) {
    if (this._openRouteIdx === index) {
      this._openRouteIdx = null;
      this._openSubRouteIdx = null;
      this._setEditingRouteIndex(null);
    } else {
      this._openRouteIdx = index;
      this._openSubRouteIdx = null;
      this._setEditingRouteIndex(index);
    }
  }

  _toggleSubRouteEditor(si) {
    this._openSubRouteIdx = this._openSubRouteIdx === si ? null : si;
  }

  _addRoute() {
    const routes = [...(this._config.routes ?? [])];
    routes.push({ icon: 'mdi:circle', label: 'New', path: '', show_label: true });
    this._config = { ...this._config, routes };
    this._fireConfigChanged();
  }

  _duplicateRoute(index) {
    const routes = [...(this._config.routes ?? [])];
    const clone = JSON.parse(JSON.stringify(routes[index]));
    clone.label = (clone.label || 'Route') + ' (Copy)';
    routes.splice(index + 1, 0, clone);
    if (this._openRouteIdx != null && this._openRouteIdx > index) this._openRouteIdx++;
    this._config = { ...this._config, routes };
    this._fireConfigChanged();
  }

  _deleteRoute(index) {
    const routes = (this._config.routes ?? []).filter((_, i) => i !== index);
    if (this._openRouteIdx === index) {
      this._openRouteIdx = null;
      this._openSubRouteIdx = null;
      this._setEditingRouteIndex(null);
    } else if (this._openRouteIdx > index) {
      this._openRouteIdx--;
    }
    this._config = { ...this._config, routes };
    this._fireConfigChanged();
  }

  _addSubRoute(routeIndex) {
    const routes = [...(this._config.routes ?? [])];
    const subs = [...(routes[routeIndex].sub_routes ?? [])];
    subs.push({ icon: 'mdi:circle', label: 'New', path: '' });
    routes[routeIndex] = { ...routes[routeIndex], sub_routes: subs };
    this._config = { ...this._config, routes };
    this._fireConfigChanged();
  }

  _duplicateSubRoute(si, routeIndex) {
    const routes = [...(this._config.routes ?? [])];
    const subs = [...(routes[routeIndex].sub_routes ?? [])];
    const clone = JSON.parse(JSON.stringify(subs[si]));
    clone.label = (clone.label || 'Sub-Route') + ' (Copy)';
    subs.splice(si + 1, 0, clone);
    routes[routeIndex] = { ...routes[routeIndex], sub_routes: subs };
    if (this._openSubRouteIdx != null && this._openSubRouteIdx > si) this._openSubRouteIdx++;
    this._config = { ...this._config, routes };
    this._fireConfigChanged();
  }

  _deleteSubRoute(si, routeIndex) {
    const routes = [...(this._config.routes ?? [])];
    const subs = (routes[routeIndex].sub_routes ?? []).filter((_, i) => i !== si);
    routes[routeIndex] = { ...routes[routeIndex], sub_routes: subs.length ? subs : undefined };
    if (!routes[routeIndex].sub_routes) delete routes[routeIndex].sub_routes;
    if (this._openSubRouteIdx === si) this._openSubRouteIdx = null;
    else if (this._openSubRouteIdx > si) this._openSubRouteIdx--;
    this._config = { ...this._config, routes };
    this._fireConfigChanged();
  }

  // ── Drag & Drop ────────────────────────────────────────────────────────

  _onDragStart(e, index, isSubRoute, routeIndex) {
    if (isSubRoute) e.stopPropagation();
    else if (this._dragIsSubRoute) { e.preventDefault(); return; }
    this._dragSourceIdx = index;
    this._dragIsSubRoute = isSubRoute;
    this._dragSubRouteParent = routeIndex ?? null;
    this._dropTargetIdx = null;
    e.dataTransfer.effectAllowed = 'move';
    const item = e.target.closest(isSubRoute ? '.sub-route-item' : '.route-item');
    if (item) setTimeout(() => item.classList.add('dragging'), 0);
    if (!isSubRoute) {
      this._openRouteIdx = null;
      this._openSubRouteIdx = null;
      this._setEditingRouteIndex(null);
    } else {
      this._openSubRouteIdx = null;
    }
  }

  _onListDragOver(e, isSubRoute) {
    if (this._dragSourceIdx == null) return;
    if (isSubRoute !== this._dragIsSubRoute) return;
    if (isSubRoute) e.stopPropagation();
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const selector = isSubRoute ? '.sub-route-item' : '.route-item';
    const container = e.currentTarget;
    const items = [...container.querySelectorAll(`:scope > ${selector}`)];
    items.forEach(el => el.classList.remove('drop-before'));
    let targetIdx = items.length;
    for (let i = 0; i < items.length; i++) {
      const rect = items[i].getBoundingClientRect();
      if (e.clientY < rect.top + rect.height / 2) {
        targetIdx = parseInt(items[i].dataset.index);
        items[i].classList.add('drop-before');
        break;
      }
    }
    this._dropTargetIdx = targetIdx;
  }

  _onListDragLeave(e, isSubRoute) {
    const selector = isSubRoute ? '.sub-route-item' : '.route-item';
    e.currentTarget.querySelectorAll(selector).forEach(el => el.classList.remove('drop-before'));
  }

  _onDragEnd(e, index, isSubRoute, routeIndex) {
    if (isSubRoute) e.stopPropagation();
    const item = e.target.closest(isSubRoute ? '.sub-route-item' : '.route-item');
    if (item) {
      item.classList.remove('dragging');
      item.setAttribute('draggable', 'false');
    }
    const selector = isSubRoute ? '.sub-route-item' : '.route-item';
    this.shadowRoot.querySelectorAll(selector).forEach(el => el.classList.remove('drop-before'));

    const sourceIdx = this._dragSourceIdx;
    const targetIdx = this._dropTargetIdx;
    this._dragSourceIdx = null;
    this._dragIsSubRoute = false;
    this._dropTargetIdx = null;

    if (sourceIdx == null || targetIdx == null || sourceIdx === targetIdx) return;

    const routes = [...(this._config.routes ?? [])];
    if (isSubRoute) {
      const subs = [...(routes[routeIndex].sub_routes ?? [])];
      const [moved] = subs.splice(sourceIdx, 1);
      const insertAt = targetIdx > sourceIdx ? targetIdx - 1 : targetIdx;
      subs.splice(insertAt, 0, moved);
      routes[routeIndex] = { ...routes[routeIndex], sub_routes: subs };
    } else {
      const [moved] = routes.splice(sourceIdx, 1);
      const insertAt = targetIdx > sourceIdx ? targetIdx - 1 : targetIdx;
      routes.splice(insertAt, 0, moved);
    }
    this._config = { ...this._config, routes };
    this._fireConfigChanged();
  }
}


// ── Registration ─────────────────────────────────────────────────────────────

customElements.define('dashboard-footer-card-editor', DashboardFooterCardEditor);
customElements.define('dashboard-footer-card', DashboardFooterCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'dashboard-footer-card',
  name: 'Dashboard Footer Card',
  description: 'Sticky footer navigation bar with configurable routes, badges, and popup menus',
  preview: true,
});

console.info(
  '%c DASHBOARD-FOOTER-CARD %c ' + VERSION + ' ',
  'color:#fff;background:#1565c0;font-weight:bold;padding:2px 6px;border-radius:4px 0 0 4px;',
  'color:#1565c0;background:#fff;font-weight:bold;padding:2px 6px;border-radius:0 4px 4px 0;',
);
