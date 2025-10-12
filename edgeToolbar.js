// Handles edge toolbar logic and UI
// Exports: setupEdgeToolbar(network, nodes, edges)
export function setupEdgeToolbar(network, nodes, edges) {
  // Create edge toolbar in document.body for reliability
  let edgeToolbar = document.getElementById('edgeToolbar');
  if (!edgeToolbar) {
    edgeToolbar = document.createElement('div');
    edgeToolbar.id = 'edgeToolbar';
    edgeToolbar.className = 'hidden';
    edgeToolbar.innerHTML = `
      <button id="labelEdgeBtn" title="Label edge">Label</button>
      <button id="deleteEdgeBtn" title="Delete edge">Delete</button>
    `;
    document.body.appendChild(edgeToolbar);
  }

  let currentEdgeId = null;

  // Function to update toolbar position
  function updateToolbarPosition() {
    if (!currentEdgeId || edgeToolbar.classList.contains('hidden')) return;
    
    const edge = edges.get(currentEdgeId);
    if (!edge) {
      hideToolbar();
      return;
    }
    
    // Get edge midpoint in DOM coordinates
    const fromPos = network.getPositions([edge.from])[edge.from];
    const toPos = network.getPositions([edge.to])[edge.to];
    if (!fromPos || !toPos) {
      hideToolbar();
      return;
    }
    
    const midX = (fromPos.x + toPos.x) / 2;
    const midY = (fromPos.y + toPos.y) / 2;
    const canvasPos = network.canvasToDOM({ x: midX, y: midY });
    
    // Update toolbar position
    edgeToolbar.style.left = `${canvasPos.x - edgeToolbar.offsetWidth / 2}px`;
    edgeToolbar.style.top = `${canvasPos.y - edgeToolbar.offsetHeight / 2}px`;
  }

  // Update toolbar position on various events
  network.on('dragging', updateToolbarPosition);
  network.on('zoom', updateToolbarPosition);
  network.on('animationFinished', updateToolbarPosition);

  network.on('click', params => {
    // Only show edge toolbar if an edge is clicked and no node is clicked
    if (params.edges && params.edges.length === 1 && (!params.nodes || params.nodes.length === 0)) {
      const edgeId = params.edges[0];
      currentEdgeId = edgeId;
      showToolbarNearEdge(edgeId);
    } else {
      hideToolbar();
      currentEdgeId = null;
    }
  });

  function showToolbarNearEdge(edgeId) {
    const edge = edges.get(edgeId);
    if (!edge) return;
    
    // Show toolbar
    edgeToolbar.style.position = 'absolute';
    edgeToolbar.classList.remove('hidden');
    edgeToolbar.style.display = 'block';
    
    // Update position
    updateToolbarPosition();
  }
  function hideToolbar() {
    edgeToolbar.classList.add('hidden');
    edgeToolbar.style.display = 'none';
  }

  // toolbar buttons
  edgeToolbar.querySelector('#labelEdgeBtn').addEventListener('click', () => {
    if (!currentEdgeId) return;
    const label = prompt('Edge label:');
    edges.update({ id: currentEdgeId, label: label || '' });
    hideToolbar();
  });
  edgeToolbar.querySelector('#deleteEdgeBtn').addEventListener('click', () => {
    if (!currentEdgeId) return;
    if (confirm('Delete this edge?')) {
      edges.remove(currentEdgeId);
      hideToolbar();
      if (typeof window._saveToStorage === 'function') window._saveToStorage();
    }
  });
}
