const DE = {
  // ── Editor Labels ─────────────────────────────────────────────────────────
  "Mobile": "Mobil",
  "Desktop": "Desktop",
  "Floating": "Schwebend",
  "Docked": "Angedockt",
  "Icon Size": "Symbolgröße",
  "Label Font Size": "Beschriftungsgröße",
  "Background Color (CSS)": "Hintergrundfarbe (CSS)",
  "Glassmorphism (Blur)": "Glasmorphismus (Unschärfe)",
  "Show Breadcrumb": "Breadcrumb anzeigen",
  "Bottom Offset": "Abstand unten",
  "Floating on Mobile": "Schwebend auf Mobilgeräten",
  "Floating on Desktop": "Schwebend auf Desktop",
  "Max Width": "Maximale Breite",
  "Respect Sidebar": "Seitenleiste berücksichtigen",
  "Breakpoint (px)": "Breakpoint (px)",

  // ── Editor Helpers ────────────────────────────────────────────────────────
  "Width and height of route icons in pixels": "Breite und Höhe der Routensymbole in Pixeln",
  "Font size of labels in pixels": "Schriftgröße der Beschriftungen in Pixeln",
  "CSS value or variable, e.g. var(--sidebar-background-color)": "CSS-Wert oder Variable, z.\u00A0B. var(--sidebar-background-color)",
  "Background blur in floating mode (glassmorphism effect)": "Hintergrundunschärfe im schwebenden Modus (Glasmorphismus-Effekt)",
  "Show active sub-route name above the footer bar": "Aktiven Unterrouten-Namen über der Fußleiste anzeigen",
  "Distance from bottom of screen in pixels": "Abstand vom unteren Bildschirmrand in Pixeln",
  "Floating mode on mobile (< breakpoint)": "Schwebender Modus auf Mobilgeräten (< Breakpoint)",
  "Floating mode on desktop (>= breakpoint)": "Schwebender Modus auf Desktop (>= Breakpoint)",
  "In floating mode: card is centered when the section is wider": "Im schwebenden Modus: Karte wird zentriert, wenn der Bereich breiter ist",
  "In docked mode: position offset by sidebar": "Im angedockten Modus: Position um Seitenleiste versetzt",
  "CSS value, e.g. 0, 56px, env(safe-area-inset-bottom)": "CSS-Wert, z.\u00A0B. 0, 56px, env(safe-area-inset-bottom)",
  "CSS value, e.g. 600px, 80%, calc(100vw - 200px)": "CSS-Wert, z.\u00A0B. 600px, 80%, calc(100vw - 200px)",
  "Threshold for mobile/desktop distinction": "Schwellenwert für Mobil-/Desktop-Unterscheidung",

  // ── Route Labels ──────────────────────────────────────────────────────────
  "Icon": "Symbol",
  "Label": "Beschriftung",
  "Show Label": "Beschriftung anzeigen",
  "Navigation Path": "Navigationspfad",
  "Icon Color": "Symbolfarbe",
  "Active Color": "Aktive Farbe",
  "Visibility": "Sichtbarkeit",
  "On Tap": "Beim Tippen",
  "On Hold": "Beim Halten",
  "On Double Tap": "Beim Doppeltippen",
  "On Swipe": "Beim Wischen",
  "Badge Content": "Badge-Inhalt",
  "Badge Color": "Badge-Farbe",
  "Highlight on Active Sub-Route": "Bei aktiver Unterroute hervorheben",
  "Tap Action": "Tippen-Aktion",
  "Hold Action": "Halten-Aktion",
  "Double Tap Action": "Doppeltippen-Aktion",
  "Swipe-Up Action": "Hochwischen-Aktion",

  // ── Route Helpers ─────────────────────────────────────────────────────────
  "MDI icon or Jinja2 template": "MDI-Symbol oder Jinja2-Vorlage",
  "CSS color or Jinja2 template": "CSS-Farbe oder Jinja2-Vorlage",
  "Icon background color when route is active": "Symbol-Hintergrundfarbe bei aktiver Route",
  "Jinja2 template: route is shown when result is truthy (true/on/yes/non-empty)": "Jinja2-Vorlage: Route wird angezeigt, wenn Ergebnis wahr ist (true/on/yes/nicht leer)",
  "Text in badge (Jinja2 template supported)": "Text im Badge (Jinja2-Vorlage unterstützt)",
  "Badge background color (Jinja2 template supported)": "Badge-Hintergrundfarbe (Jinja2-Vorlage unterstützt)",
  "Default: path → navigate, sub-routes → open popup": "Standard: Pfad → navigieren, Unterrouten → Popup öffnen",
  "Default: no action": "Standard: keine Aktion",
  "Default: open popup (if sub-routes exist)": "Standard: Popup öffnen (wenn Unterrouten vorhanden)",
  "Highlight route when a sub-route is active": "Route hervorheben, wenn eine Unterroute aktiv ist",

  // ── UI Strings: Tabs ──────────────────────────────────────────────────────
  "Routes": "Routen",
  "Settings": "Einstellungen",

  // ── UI Strings: Collapsible Titles ────────────────────────────────────────
  "Appearance": "Aussehen",
  "Position & Behavior": "Position & Verhalten",
  "Basic": "Basis",
  "Haptic Feedback": "Haptisches Feedback",
  "Actions": "Aktionen",
  "Badge": "Badge",
  "Layout": "Layout",
  "Popup Menu Routes": "Popup-Menü-Routen",

  // ── UI Strings: Action Options ────────────────────────────────────────────
  "Default": "Standard",
  "Home Assistant Action": "Home Assistant Aktion",
  "Open Popup Menu": "Popup-Menü öffnen",
  "Toggle Main Menu": "Hauptmenü umschalten",
  "Restart Menu": "Neustarten-Menü",
  "No Action": "Keine Aktion",

  // ── Restart Dialog ────────────────────────────────────────────────────────
  "Advanced Options": "Erweiterte Optionen",
  "Cancel": "Abbrechen",
  "restart_reload": "Schnelles Neuladen",
  "restart_reload_desc": "Lädt neue YAML-Konfigurationen ohne Neustart.",
  "restart_restart": "Home Assistant neu starten",
  "restart_restart_desc": "Unterbricht alle laufenden Automationen und Skripte.",
  "restart_reboot": "System neu starten",
  "restart_reboot_desc": "Startet das System neu, auf dem Home Assistant und alle Apps ausgeführt werden.",
  "restart_shutdown": "System herunterfahren",
  "restart_shutdown_desc": "Fährt das System mit Home Assistant und allen Apps herunter.",
  "restart_safe_mode": "Home Assistant im abgesicherten Modus neu starten",
  "restart_safe_mode_desc": "Startet Home Assistant neu, um ohne benutzerdefinierte Integrationen und Frontend-Module zu starten.",
  "restart_restart_confirm_title": "Home Assistant neu starten?",
  "restart_restart_confirm_desc": "Dadurch werden alle laufenden Automationen und Skripte unterbrochen.",
  "restart_restart_confirm_action": "Neu starten",
  "restart_reboot_confirm_title": "System neu starten?",
  "restart_reboot_confirm_desc": "Dadurch wird das System neu gestartet, auf dem Home Assistant und alle Apps ausgeführt werden.",
  "restart_reboot_confirm_action": "Neu starten",
  "restart_shutdown_confirm_title": "System herunterfahren?",
  "restart_shutdown_confirm_desc": "Dadurch wird das System mit Home Assistant und allen Apps heruntergefahren.",
  "restart_shutdown_confirm_action": "Herunterfahren",
  "restart_safe_mode_confirm_title": "Im abgesicherten Modus neu starten?",
  "restart_safe_mode_confirm_desc": "Home Assistant wird ohne benutzerdefinierte Integrationen und Frontend-Module neu gestartet.",
  "restart_safe_mode_confirm_action": "Neu starten",

  // ── UI Strings: Buttons ───────────────────────────────────────────────────
  "+ Add Route": "+ Route hinzufügen",
  "+ Add Sub-Route": "+ Unterroute hinzufügen",

  // ── UI Strings: Tooltips ──────────────────────────────────────────────────
  "Edit": "Bearbeiten",
  "Duplicate": "Duplizieren",
  "Remove": "Entfernen",

  // ── UI Strings: Default Labels ────────────────────────────────────────────
  "Route": "Route",
  "Sub-Route": "Unterroute",
};

export default DE;
