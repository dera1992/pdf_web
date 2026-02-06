# Annotation Architecture

## Goals
- Provide rich annotation tools while keeping interactions performant and consistent.
- Maintain accurate positioning across zoom levels and view modes.
- Enable real-time collaboration and conflict resolution.

## Core Concepts
- **Annotation Layer**: Canvas or SVG overlay aligned with PDF pages.
- **Annotation Model**: Normalized data in Redux store with versioning.
- **Persistence**: Store annotations in backend with document + page + coordinates.

## Data Model (Frontend)
```
Annotation {
  id: string
  documentId: string
  page: number
  type: 'highlight' | 'underline' | 'strike' | 'draw' | 'note' | 'shape' | 'stamp' | 'signature' | 'form'
  rects: [{ x, y, width, height }]
  points: [{ x, y }]
  style: { color, opacity, thickness, fontSize }
  content: string
  author: { id, name }
  createdAt: ISODate
  updatedAt: ISODate
  revision: number
}
```

## Rendering Strategy
- Use **pdfjs-dist** for PDF page rendering.
- Overlay **SVG** for vector annotations; **Canvas** for freehand drawing.
- Use view transform utilities to convert between page and screen coordinates.

## Tooling
- **Highlight/Underline/Strikethrough**: text selection-based rectangles.
- **Freehand**: capture pointer events, smooth paths, and store point arrays.
- **Shapes**: rectangle, arrow with resize handles.
- **Sticky notes**: anchored to page coordinates with popover editor.
- **Signatures**: image-based annotation or vector path.
- **Form fill**: PDF field overlays aligned with pdfjs text layer.

## Collaboration
- Emit annotation create/update/delete events over WebSocket.
- Use optimistic updates with revision checks.
- Conflict handling: latest revision wins with user notification.

## Security
- Validate permissions for editing or deleting annotations.
- Audit trail for each annotation change.

## Performance
- Virtualize page overlays and annotations for large documents.
- Throttle pointer events for freehand drawing.
