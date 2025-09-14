Paper Web — simple research graph (distraction-free)
------------------------------------------------------
Files:
 - index.html : main UI
 - style.css  : minimal styles
 - app.js     : application logic using vis-network (CDN)

How it works:
 - Click "+ add paper" to add a standalone paper.
 - Click a node to open a small toolbar: Add reference (creates a directed edge), Edit, Delete.
 - When adding a reference, if a paper with the same title already exists (case-insensitive), it will be reused (single instance guarantee).
 - Data is persisted to browser localStorage. Use Export/Import to move graphs between machines.
 - The code is modular and designed so nodes/edges can later have buttons, annotations, or richer metadata.

Run:
 - Open index.html in a modern browser.
 - No server required.

Notes for future extensions:
 - Add inline node buttons instead of toolbar
 - Add notes, tags, priority/bookmark flags
 - Add keyboard shortcuts, keyboard-first UX
 - Add better deduplication (DOI lookup) and web fetching of metadata
