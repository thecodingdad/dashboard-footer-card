# Dashboard Footer Card

A sticky navigation footer card for Home Assistant dashboards with route/submenu support, haptic feedback, dynamic badges, and customizable styling including glassmorphism effects.

[![hacs_badge](https://img.shields.io/badge/HACS-Default-41BDF5.svg)](https://github.com/hacs/integration)
[![GitHub Release](https://img.shields.io/github/v/release/thecodingdad/dashboard-footer-card)](https://github.com/thecodingdad/dashboard-footer-card/releases)

## Features

- Navigation routes with icons and labels
- Sub-route menus (popup menus per main route)
- Breadcrumb display for active sub-routes
- Dynamic badge content and colors (Jinja2 templates)
- Icon and label visibility toggles
- Custom tap/hold/double-tap/swipe actions per route
- Floating mode on mobile/desktop with customizable breakpoint
- Glassmorphism blur effect
- Sidebar awareness and offset control
- EN/DE multilanguage support

## Prerequisites

- Home Assistant 2024.1.0 or newer
- HACS (recommended for installation)

## Installation

### HACS (Recommended)

1. Open HACS in your Home Assistant instance
2. Go to **Frontend**
3. Click "Explore & Download Repositories"
4. Search for "Dashboard Footer Card"
5. Click "Download"
6. Reload your browser / clear cache

### Manual Installation

1. Download the latest release from [GitHub Releases](https://github.com/thecodingdad/dashboard-footer-card/releases)
2. Copy the `dist/` contents to `config/www/community/dashboard-footer-card/`
3. Add the resource in **Settings** → **Dashboards** → **Resources**:
   - URL: `/local/community/dashboard-footer-card/dashboard-footer-card.js`
   - Type: JavaScript Module
4. Reload your browser

## Usage

```yaml
type: custom:dashboard-footer-card
routes:
  - icon: mdi:home
    label: Home
    path: /dashboard-home
  - icon: mdi:lightbulb
    label: Lights
    path: /dashboard-lights
    badge:
      content: "{{ states.light | selectattr('state','eq','on') | list | count }}"
      color: orange
  - icon: mdi:cog
    label: Settings
    path: /dashboard-settings
    sub_routes:
      - icon: mdi:wrench
        label: System
        path: /dashboard-system
floating_mobile: true
blur: true
```

## Configuration

### Card Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `routes` | array | required | Navigation items (see route options below) |
| `icon_size` | string | — | Icon size (CSS value) |
| `font_size` | string | — | Label font size (CSS value) |
| `background` | string | — | Footer background color (CSS) |
| `blur` | boolean | false | Enable glassmorphism blur effect |
| `show_breadcrumb` | boolean | false | Show breadcrumb for sub-routes |
| `floating_mobile` | boolean | false | Floating layout on mobile |
| `floating_desktop` | boolean | false | Floating layout on desktop |
| `breakpoint` | number | 768 | Mobile/desktop breakpoint in px |
| `bottom_offset` | string | — | Bottom offset (CSS value) |
| `max_width` | string | — | Maximum width in floating mode |

### Route Options

| Option | Type | Description |
|--------|------|-------------|
| `icon` | string | MDI icon |
| `label` | string | Display label |
| `path` | string | Navigation path |
| `icon_color` | string | Icon color |
| `active_color` | string | Active state color |
| `visible` | boolean | Show/hide route |
| `badge` | object | Badge configuration (content, color) |
| `sub_routes` | array | Sub-menu items |
| `tap_action` | object | Action on tap |
| `hold_action` | object | Action on hold |
| `double_tap_action` | object | Action on double tap |

## Multilanguage Support

This card supports English and German.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
