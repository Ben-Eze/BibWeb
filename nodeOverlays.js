// Per-node floating overlays that mirror node size/position and host title + toolbar
export function setupNodeOverlays(network, nodes, edges) {
  const overlayMap = new Map(); // nodeId -> HTMLElement

  // Container inside the network element to ensure correct coordinate space
  const host = (network && network.body && network.body.container) ? network.body.container : document.getElementById('network');
  let container = document.getElementById('nodeOverlayContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'nodeOverlayContainer';
    container.style.position = 'absolute';
    container.style.left = '0';
    container.style.top = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.pointerEvents = 'none'; // let canvas interactions pass through by default
    container.style.zIndex = '5';
    container.style.setProperty('--zoom-scale', String(network.getScale ? network.getScale() : 1));
    if (host) host.appendChild(container);
    else document.body.appendChild(container);
  }

  function createOverlay(node) {
    const el = document.createElement('div');
    el.className = 'node-overlay';
    el.dataset.nodeId = String(node.id);
    el.style.position = 'absolute';
    el.style.pointerEvents = 'none'; // default off; enable only on toolbar
    el.innerHTML = `
      <div class="node-overlay__card">
        <div class="node-overlay__title" title="${escapeHtml(node.title || '')}">${escapeHtml(node.title || '')}${node.authors ? `<div class="node-overlay__authors">${escapeHtml(node.authors)}</div>` : ''}</div>
        <div class="node-overlay__spacer"></div>
        <div class="node-overlay__toolbar">
          <button class="btn-add" title="Add referenced paper">Add reference</button>
          <button class="btn-edit" title="Edit node">Edit</button>
          <button class="btn-del" title="Delete node">Delete</button>
        </div>
      </div>
    `;
    // Toolbar needs pointer events
  const toolbar = el.querySelector('.node-overlay__toolbar');
  toolbar.style.pointerEvents = 'auto';
  // hide toolbar by default; it will be shown when the node is selected
  // visibility is primarily controlled by CSS class .is-selected

    // Wire actions
    toolbar.querySelector('.btn-add').addEventListener('click', (e) => {
      e.stopPropagation();
      const currentNodeId = node.id;
      const title = prompt('Referenced paper title (required):');
      if (!title || !title.trim()) return;
      const stripHtmlTags = str => (!str ? '' : str.replace(/<[^>]*>/g, ''));
      const findNodeByTitle = t => {
        if (!t) return null;
        const tt = t.trim().toLowerCase();
        if (!tt) return null;
        const found = nodes.get().find(n => (n.title || '').trim().toLowerCase() === tt);
        return found || null;
      };
      let target;
      const existing = findNodeByTitle(title);
      if (existing) {
        target = existing;
      } else {
        const authors = prompt('Authors for referenced paper (optional):') || '';
        const nextId = () => {
          let all = nodes.getIds();
          let id = 1;
          while (all.includes(id)) id++;
          return id;
        };
        target = {
          id: nextId(),
          title: stripHtmlTags(title.trim()),
          authors: stripHtmlTags(authors.trim()),
          label: '',
          shape: 'box'
        };
        nodes.add(target);
        network.focus(target.id, { scale: 1.2, animation: true });
      }
      // create directed edge from current -> target unless exists
      const existsEdge = edges.get().find(e => e.from === node.id && e.to === target.id);
      if (!existsEdge) {
        edges.add({ from: node.id, to: target.id });
      } else {
        alert('This reference already exists.');
      }
      if (typeof window._saveToStorage === 'function') window._saveToStorage();
    });
    toolbar.querySelector('.btn-edit').addEventListener('click', (e) => {
      e.stopPropagation();
      const n = nodes.get(node.id);
      const title = prompt('Edit title:', n.title || '');
      if (!title || !title.trim()) return;
      const authors = prompt('Edit authors:', n.authors || '') || '';
      n.title = title.trim();
      n.authors = authors.trim();
      n.label = '';
      nodes.update(n);
      // update overlay title/authors now
      const titleEl = el.querySelector('.node-overlay__title');
      titleEl.setAttribute('title', escapeHtml(n.title));
      titleEl.innerHTML = `${escapeHtml(n.title)}${n.authors ? `<div class="node-overlay__authors">${escapeHtml(n.authors)}</div>` : ''}`;
      if (typeof window._saveToStorage === 'function') window._saveToStorage();
    });
    toolbar.querySelector('.btn-del').addEventListener('click', (e) => {
      e.stopPropagation();
      const n = nodes.get(node.id);
      if (!confirm(`Delete "${n.title}"? This removes the node and its edges.`)) return;
      nodes.remove(node.id);
      const remEdges = edges.get().filter(e => e.from === node.id || e.to === node.id).map(e => e.id).filter(Boolean);
      if (remEdges.length) edges.remove(remEdges);
      removeOverlay(node.id);
      if (typeof window._saveToStorage === 'function') window._saveToStorage();
    });

    container.appendChild(el);
    overlayMap.set(node.id, el);
    return el;
  }

  function removeOverlay(nodeId) {
    const el = overlayMap.get(nodeId);
    if (el && el.parentElement) el.parentElement.removeChild(el);
    overlayMap.delete(nodeId);
  }

  function ensureOverlaysForAllNodes() {
    const ids = nodes.getIds();
    // create missing
    ids.forEach(id => {
      if (!overlayMap.has(id)) createOverlay(nodes.get(id));
    });
    // remove stale
    Array.from(overlayMap.keys()).forEach(id => {
      if (!ids.includes(id)) removeOverlay(id);
    });
  }

  function updatePositions() {
    // Reposition/resize overlays to match bounding boxes
  overlayMap.forEach((el, id) => {
  const bb = network.getBoundingBox(id);
  if (!bb) return;
  const center = network.getPositions([id])[id];
  const widthCanvas = bb.right - bb.left;
  const heightCanvas = bb.bottom - bb.top;
  const halfW = widthCanvas / 2;
  const halfH = heightCanvas / 2;
  const tlDom = network.canvasToDOM({ x: center.x - halfW, y: center.y - halfH });
  const brDom = network.canvasToDOM({ x: center.x + halfW, y: center.y + halfH });
  const width = Math.max(0, brDom.x - tlDom.x);
  const height = Math.max(0, brDom.y - tlDom.y);

  // First set size
  el.style.width = `${width}px`;
  el.style.height = `${height}px`;

  // Then align by DOM center using the actual rendered size to avoid rounding drift
  const centerDom = network.canvasToDOM({ x: center.x, y: center.y });
  const ow = el.offsetWidth || width;
  const oh = el.offsetHeight || height;
  el.style.left = `${Math.round(centerDom.x - ow / 2)}px`;
  el.style.top = `${Math.round(centerDom.y - oh / 2)}px`;
    });
  }

  // Initial set
  ensureOverlaysForAllNodes();
  updatePositions();

  // Keep overlays in sync with node dataset
  nodes.on('add', () => { ensureOverlaysForAllNodes(); updatePositions(); });
  nodes.on('update', (e, _props) => {
    // update titles/authors in overlays if changed
    if (e && e.items) {
      e.items.forEach(id => {
        const el = overlayMap.get(id);
        if (!el) return;
        const n = nodes.get(id);
        const titleEl = el.querySelector('.node-overlay__title');
        if (titleEl && n) {
          titleEl.setAttribute('title', escapeHtml(n.title || ''));
          titleEl.innerHTML = `${escapeHtml(n.title || '')}${n.authors ? `<div class="node-overlay__authors">${escapeHtml(n.authors)}` + `</div>` : ''}`;
        }
      });
    }
    updatePositions();
  });
  nodes.on('remove', (e) => {
    if (e && e.items) e.items.forEach(removeOverlay);
  });

  // Reposition overlays when the network draws/changes
  const reposition = () => {
    updatePositions();
  };
  function updateZoomVar() {
    const s = network.getScale ? network.getScale() : 1;
    container.style.setProperty('--zoom-scale', String(s));
  }
  network.on('afterDrawing', () => { reposition(); updateZoomVar(); });
  network.on('dragEnd', reposition);
  network.on('zoom', () => { reposition(); updateZoomVar(); });
  network.on('resize', () => { reposition(); updateZoomVar(); });

  // Selection handling: show toolbar only for selected nodes
  function hideAllToolbars() {
    overlayMap.forEach((el) => el.classList.remove('is-selected'));
  }
  network.on('selectNode', (params) => {
    hideAllToolbars();
    if (params && Array.isArray(params.nodes)) {
      params.nodes.forEach((id) => {
        const el = overlayMap.get(id);
        if (el) el.classList.add('is-selected');
      });
    }
  });
  network.on('deselectNode', () => {
    hideAllToolbars();
  });

  function escapeHtml(s) {
    return (!s ? '' : s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'));
  }
}
