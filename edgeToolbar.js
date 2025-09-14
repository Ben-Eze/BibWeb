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
    // Get edge midpoint in DOM coordinates
    const fromPos = network.getPositions([edge.from])[edge.from];
    const toPos = network.getPositions([edge.to])[edge.to];
    const midX = (fromPos.x + toPos.x) / 2;
    const midY = (fromPos.y + toPos.y) / 2;
    const canvasPos = network.canvasToDOM({ x: midX, y: midY });
    // Ensure toolbar is positioned absolutely at the midpoint
    edgeToolbar.style.position = 'absolute';
    edgeToolbar.style.left = `${canvasPos.x - edgeToolbar.offsetWidth / 2}px`;
    edgeToolbar.style.top = `${canvasPos.y - edgeToolbar.offsetHeight / 2}px`;
    edgeToolbar.classList.remove('hidden');
    edgeToolbar.style.display = 'block';
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
