// Handles documentToolbar logic: layout switching, add paper, export/import
// Exports: setupDocumentToolbar(network, nodes, edges)

export function setupDocumentToolbar(network, nodes, edges) {
  document.getElementById('switchPhysics').onclick = function() {
    // Get current positions
    const currentPositions = network.getPositions();
    // Set node positions to current
    Object.entries(currentPositions).forEach(([id, pos]) => {
      nodes.update({id: Number(id), x: pos.x, y: pos.y, fixed: false});
    });

    // Remove hierarchical layout forcibly
    network.setOptions({layout: {hierarchical: false}});
    network.setOptions({layout: {}});
    network.setOptions({
      physics: {
        enabled: true,
        stabilization: {iterations: 200},
        repulsion: {
          nodeDistance: 220,
          springLength: 220,
          springConstant: 0.02,
        }
      }
    });
    network.stabilize();
  };
  document.getElementById('switchHierUD').onclick = function() {
    network.setOptions({
      physics: false,
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
  };
  document.getElementById('switchHierLR').onclick = function() {
    network.setOptions({
      physics: false,
      layout: {
        hierarchical: {
          direction: 'LR',
          sortMethod: 'directed',
          nodeSpacing: 120,
          levelSeparation: 120,
          treeSpacing: 100,
          blockShifting: false,
          edgeMinimization: false,
        }
      }
    });
  };

  document.getElementById('addPaperBtn').addEventListener('click', ()=>{
    const title = prompt('Paper title (required):');
    if(!title || !title.trim()) return;
    const authors = prompt('Authors (optional):') || '';
    // addOrGetPaper should be imported from network.js
    window._addOrGetPaper({title:title.trim(), authors: authors.trim()});
    window._saveToStorage();
  });

  document.getElementById('exportBtn').addEventListener('click', ()=>{
    const data = {nodes: nodes.get(), edges: edges.get()};
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'paper-web-export.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  document.getElementById('importBtn').addEventListener('click', ()=>{
    document.getElementById('importFile').click();
  });

  document.getElementById('importFile').addEventListener('change', (ev)=>{
    const f = ev.target.files[0];
    if(!f) return;
    const reader = new FileReader();
    reader.onload = (e)=>{
      try{
        const parsed = JSON.parse(e.target.result);
        if(parsed.nodes) nodes.clear(), nodes.add(parsed.nodes);
        if(parsed.edges) edges.clear(), edges.add(parsed.edges);
        window._saveToStorage();
      }catch(err){ alert('Invalid JSON'); }
    };
    reader.readAsText(f);
  });
}
