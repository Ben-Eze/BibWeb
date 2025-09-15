// Handles documentToolbar logic: layout switching, add paper, export/import
// Exports: setupDocumentToolbar(network, nodes, edges)

export function setupDocumentToolbar(network, nodes, edges) {
  // Ensure any currently selected nodes are reset to default visuals before deselecting
  function restoreSelectedThenUnselect() {
    if (typeof network.getSelectedNodes === 'function') {
      const selected = network.getSelectedNodes();
      if (Array.isArray(selected) && selected.length) {
        selected.forEach((nodeId) => {
          // restore node size and font to defaults (keep in sync with network.js defaults)
          nodes.update({
            id: nodeId,
            widthConstraint: { minimum: 240, maximum: 240 },
            heightConstraint: { minimum: 30 },
            font: { size: 16 },
          });
          // restore connected edge lengths
          edges.get().forEach((edge) => {
            if (edge.from === nodeId || edge.to === nodeId) {
              edges.update({ id: edge.id, length: 400 });
            }
          });
        });
      }
    }
    if (window._applySpacing) window._applySpacing(false);
    if (typeof network.unselectAll === 'function') network.unselectAll();
  }
  document.getElementById('clearBtn').addEventListener('click', () => {
    if (confirm('Clear the entire graph? This cannot be undone.')) {
      nodes.clear();
      edges.clear();
      // Remove overlay DOMs
      const container = document.getElementById('nodeOverlayContainer');
      if (container) {
        while (container.firstChild) container.removeChild(container.firstChild);
      }
      window._saveToStorage();
      network.fit();
    }
  });
  document.getElementById('switchPhysics').onclick = function () {
    // Reset any selected papers first, then deselect
    restoreSelectedThenUnselect();
    // Get current positions
    const currentPositions = network.getPositions();
    // Set node positions to current
    Object.entries(currentPositions).forEach(([id, pos]) => {
      nodes.update({ id: Number(id), x: pos.x, y: pos.y, fixed: false });
    });

  // Remove hierarchical layout forcibly
  network.setOptions({ layout: { hierarchical: false } });
  network.setOptions({ layout: {} });
  // enable physics; spacing parameters are controlled centrally in network.js
  network.setOptions({ physics: { enabled: true } });
  // mark mode
  network.__layoutMode = 'physics';
  if (network && network.stabilize) network.stabilize();
  };
  document.getElementById('switchHierUD').onclick = function () {
    // Reset any selected papers first, then deselect
    restoreSelectedThenUnselect();
    network.setOptions({
    physics: { enabled: false },
      layout: {
        hierarchical: {
          direction: 'UD',
          sortMethod: 'directed',
      nodeSpacing: 120,
      levelSeparation: 120,
          treeSpacing: 100,
          blockShifting: false,
          edgeMinimization: false,
        }
      }
    });
  // mark mode
  network.__layoutMode = 'hierarchical';
  if (network.redraw) network.redraw();
  // apply hierarchical spacing immediately (use default selection=false)
  if (window._applySpacing) window._applySpacing(false);
  };
  //   document.getElementById('switchHierLR').onclick = function() {
  //     network.setOptions({
  //       physics: true,
  //       layout: {
  //         hierarchical: {
  //           direction: 'LR',
  //           sortMethod: 'directed',
  //           nodeSpacing: 120,
  //           levelSeparation: 120,
  //           treeSpacing: 100,
  //           blockShifting: false,
  //           edgeMinimization: false,
  //         }
  //       }
  //     });
  //   };

  document.getElementById('addPaperBtn').addEventListener('click', () => {
    if (window._showPaperForm) {
      window._showPaperForm('add', {}, (formData) => {
        window._addOrGetPaper(formData);
        window._saveToStorage();
      });
    } else {
      // Fallback to old prompt method
      const title = prompt('Paper title (required):');
      if (!title || !title.trim()) return;
      const authors = prompt('Authors (optional):') || '';
      window._addOrGetPaper({ title: title.trim(), authors: authors.trim() });
      window._saveToStorage();
    }
  });

  document.getElementById('lockAllBtn').addEventListener('click', () => {
    const allNodes = nodes.get();
    const updates = allNodes.map(node => ({ id: node.id, physics: false }));
    nodes.update(updates);
    // Force update lock button appearances
    if (window._updateLockStates) window._updateLockStates();
    window._saveToStorage();
  });

  document.getElementById('unlockAllBtn').addEventListener('click', () => {
    const allNodes = nodes.get();
    const updates = allNodes.map(node => ({ id: node.id, physics: true }));
    nodes.update(updates);
    // Force update lock button appearances
    if (window._updateLockStates) window._updateLockStates();
    window._saveToStorage();
  });

  document.getElementById('exportBtn').addEventListener('click', () => {
    const data = { nodes: nodes.get(), edges: edges.get() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'paper-web-export.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('importFile').click();
  });

  document.getElementById('importFile').addEventListener('change', (ev) => {
    const f = ev.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (parsed.nodes) nodes.clear(), nodes.add(parsed.nodes);
        if (parsed.edges) edges.clear(), edges.add(parsed.edges);
        window._saveToStorage();
      } catch (err) { alert('Invalid JSON'); }
    };
    reader.readAsText(f);
  });
}
