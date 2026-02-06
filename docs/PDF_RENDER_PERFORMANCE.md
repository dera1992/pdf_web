# PDF Rendering Performance

## Rendering Stack
- **pdfjs-dist** for core PDF rendering.
- Use **TextLayer** and **AnnotationLayer** for selection and form fields.

## Performance Strategies
- **Lazy loading**: render pages on viewport entry.
- **Page cache**: keep a limited number of rendered pages in memory.
- **Viewport scaling**: adjust render resolution based on zoom level and device pixel ratio.
- **Incremental rendering**: render low-res preview first, then refine.

## Smooth Interactions
- Debounce zoom changes.
- Throttle scroll events and use requestAnimationFrame.
- Preload adjacent pages for continuous scroll.

## Large Document Handling
- Use virtualized lists for page views.
- Avoid full-document text extraction on open; do it per page.

## Monitoring
- Track render time per page.
- Log memory usage and frame drops.
