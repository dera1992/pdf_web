# UI Wireframes

## Overview
This document describes the core UI layouts and interaction patterns for the PDF collaboration platform. Wireframes are organized by primary surfaces: document workspace, upload/landing, and collaboration panels.

## Global Layout
- **Header bar**
  - Left: product logo + document title
  - Center: view controls (single page / continuous / two-up), zoom controls
  - Right: share, comments, user avatars, settings, dark mode toggle
- **Left sidebar**
  - Tabs: Thumbnails, Search, Outline, Annotations
  - Collapsible to maximize workspace
- **Right sidebar**
  - AI Assistant (default)
  - Threaded comments panel
- **Main canvas**
  - PDF rendering surface with overlays for annotations

## Document Workspace
```
+--------------------------------------------------------------------------------+
| Header: Logo | Title | View Controls | Zoom | Share | Comments | Dark Mode      |
+----+-------------------------------+-------------------------------------------+
| L  |                               |                                           |
| e  |                               |                                           |
| f  |         PDF Canvas            |        Right Sidebar (AI / Comments)       |
| t  |                               |                                           |
|    |                               |                                           |
| S  |                               |                                           |
| i  |                               |                                           |
| d  |                               |                                           |
| e  |                               |                                           |
| b  |                               |                                           |
| a  |                               |                                           |
| r  |                               |                                           |
+----+-------------------------------+-------------------------------------------+
| Footer: Page controls | page number | annotation shortcuts                      |
+--------------------------------------------------------------------------------+
```

### Primary Interactions
- **Zooming**: + / - buttons, keyboard shortcuts, scroll + modifier.
- **View switching**: buttons for single page, continuous scroll, and two-up.
- **Annotations**: toolbar floats near selection or pinned to left sidebar.
- **Search**: sidebar search field with instant results and highlights.

## Upload / Landing
- **Drag-and-drop** zone center screen.
- **Recent documents** list below with last modified time and collaborators.
- **Create new** and **open** actions.

## Mobile Layout
- Header collapses into a compact top bar.
- Left sidebar becomes a slide-in drawer.
- Right sidebar becomes a full-screen panel for AI and comments.
- Floating action button for annotation tools.

## Accessibility
- Keyboard navigable controls.
- High-contrast modes and focus outlines.
- Screen reader labels for controls and panels.
