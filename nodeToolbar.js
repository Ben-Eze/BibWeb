// Handles node toolbar logic and UI
// Exports: setupNodeToolbar(network, nodes, edges)
export function setupNodeToolbar(network, nodes, edges) {
  // Create node toolbar in document.body for reliability
  let nodeToolbar = document.getElementById('nodeToolbar');
  if (!nodeToolbar) {
    nodeToolbar = document.createElement('div');
    nodeToolbar.id = 'nodeToolbar';
    nodeToolbar.className = 'hidden';
    nodeToolbar.innerHTML = `
      <button id="addRefBtn" title="Add referenced paper">Add reference</button>
      <button id="editBtn" title="Edit node">Edit</button>
      <button id="deleteBtn" title="Delete node">Delete</button>
    `;
    document.body.appendChild(nodeToolbar);
  }

  let currentNodeId = null;

  network.on('click', params => {
    if (params.nodes && params.nodes.length === 1) {
      const nodeId = params.nodes[0];
      currentNodeId = nodeId;
      showToolbarNearNode(nodeId);
    } else {
      hideToolbar();
      currentNodeId = null;
    }
  });

  function showToolbarNearNode(nodeId) {
    const pos = network.getPositions([nodeId])[nodeId];
    const canvasPos = network.canvasToDOM({ x: pos.x, y: pos.y });
    nodeToolbar.style.left = `${canvasPos.x + 16}px`;
    nodeToolbar.style.top = `${canvasPos.y - 10}px`;
    nodeToolbar.classList.remove('hidden');
    nodeToolbar.style.display = 'block';
  }
  function hideToolbar() {
    nodeToolbar.classList.add('hidden');
    nodeToolbar.style.display = 'none';
  }

  // toolbar buttons
  nodeToolbar.querySelector('#addRefBtn').addEventListener('click', ()=>{
    if(!currentNodeId) return;
    const title = prompt('Referenced paper title (required):');
    if(!title || !title.trim()) return;
    // Find or add referenced paper
    const stripHtmlTags = str => (!str ? '' : str.replace(/<[^>]*>/g, ''));
    const findNodeByTitle = title => {
      if(!title) return null;
      const t = title.trim().toLowerCase();
      if(!t) return null;
      const found = nodes.get().find(n => (n.title||'').trim().toLowerCase() === t);
      return found || null;
    };
    let target;
    const existing = findNodeByTitle(title);
    if(existing){
      target = existing;
    } else {
      const authors = prompt('Authors for referenced paper (optional):') || '';
      const nextId = () => {
        let all = nodes.getIds();
        let id = 1;
        while(all.includes(id)) id++;
        return id;
      };
      const formatLabel = node => {
        const authors = node.authors ? `\n${escapeHtml(node.authors)}` : '';
        return `${escapeHtml(node.title)}${authors}`;
      };
      const escapeHtml = s => (!s ? '' : s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'));
      target = {
        id: nextId(),
        title: stripHtmlTags(title.trim()),
        authors: stripHtmlTags(authors.trim()),
        label: formatLabel({title: title.trim(), authors: authors.trim()}),
        shape: 'box'
      };
      nodes.add(target);
      network.focus(target.id, {scale:1.2, animation:true});
    }
    // create directed edge from current -> target unless exists
    const existsEdge = edges.get().find(e => e.from === currentNodeId && e.to === target.id);
    if(!existsEdge){
      edges.add({from: currentNodeId, to: target.id});
    } else {
      alert('This reference already exists.');
    }
    if (typeof window._saveToStorage === 'function') window._saveToStorage();
    hideToolbar();
  });
  nodeToolbar.querySelector('#editBtn').addEventListener('click', ()=>{
    if(!currentNodeId) return;
    const node = nodes.get(currentNodeId);
    const title = prompt('Edit title:', node.title);
    if(!title || !title.trim()) return;
    const authors = prompt('Edit authors:', node.authors || '') || '';
    node.title = title.trim();
    node.authors = authors.trim();
    const escapeHtml = s => (!s ? '' : s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'));
    const formatLabel = node => {
      const authors = node.authors ? `\n${escapeHtml(node.authors)}` : '';
      return `${escapeHtml(node.title)}${authors}`;
    };
    node.label = formatLabel(node);
    nodes.update(node);
    if (typeof window._saveToStorage === 'function') window._saveToStorage();
    hideToolbar();
  });
  nodeToolbar.querySelector('#deleteBtn').addEventListener('click', ()=>{
    if(!currentNodeId) return;
    const node = nodes.get(currentNodeId);
    if(!confirm(`Delete "${node.title}"? This removes the node and its edges.`)) return;
    nodes.remove(currentNodeId);
    // edges automatically removed by vis when node removed, but ensure cleanup
    const remEdges = edges.get().filter(e => e.from===currentNodeId || e.to===currentNodeId).map(e=>e.id).filter(Boolean);
    if(remEdges.length) edges.remove(remEdges);
    if (typeof window._saveToStorage === 'function') window._saveToStorage();
    hideToolbar();
  });
}
