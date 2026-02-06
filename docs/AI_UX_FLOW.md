# AI UX Flow

## Overview
The AI assistant provides contextual insights, summaries, and Q&A for the active document. It lives in the right sidebar and respects document permissions.

## Entry Points
- Sidebar tab: **AI Assistant**
- Context menu: **Ask about selection**
- Keyboard shortcut: `/` or `Cmd/Ctrl + K`

## Primary Flows
### Ask a Question
1. User types a question in the AI input box.
2. System sends question + selected context (page range, selected text).
3. AI returns an answer with citations and page references.
4. User can expand to see supporting text.

### Summarize Section
1. User selects a page range or highlights text.
2. Click **Summarize** in the AI panel.
3. AI returns a summary with bullets and key takeaways.

### Explain Concepts
1. User selects text or uses “Explain this” prompt.
2. AI provides a simplified explanation and optional glossary.

## UI Elements
- Prompt input with suggestions.
- Result card with citations.
- Actions: copy, insert into comment, export to notes.

## Safety & Privacy
- Respect document permissions and role-based access.
- Show a notice when external AI services are used.

## Error Handling
- If AI fails, show retry and fallback to in-document search.
