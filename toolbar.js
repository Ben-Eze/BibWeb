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
      // Reinitialize node overlays after clearing
      if (window._setupNodeOverlays) {
        window._setupNodeOverlays();
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

  document.getElementById('combineNotesBtn').addEventListener('click', () => {
    const allNodes = nodes.get();
    const allEdges = edges.get();
    
    // Filter nodes that have notes
    const nodesWithNotes = allNodes.filter(node => node.notes && node.notes.trim().length > 0);
    
    if (nodesWithNotes.length === 0) {
      alert('No papers have notes to combine.');
      return;
    }
    
    // Create a hierarchical ordering based on the network structure
    const getHierarchicalOrder = () => {
      // Find root nodes (nodes with no incoming edges)
      const nodeIds = new Set(allNodes.map(n => n.id));
      const hasIncomingEdge = new Set();
      
      allEdges.forEach(edge => {
        hasIncomingEdge.add(edge.to);
      });
      
      const rootNodes = allNodes.filter(node => !hasIncomingEdge.has(node.id));
      const orderedNodes = [];
      const visited = new Set();
      
      // Depth-first traversal from root nodes
      const dfs = (nodeId, depth = 0) => {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);
        
        const node = allNodes.find(n => n.id === nodeId);
        if (node && node.notes && node.notes.trim().length > 0) {
          orderedNodes.push({ ...node, depth });
        }
        
        // Find children of this node
        const children = allEdges
          .filter(edge => edge.from === nodeId)
          .map(edge => edge.to)
          .sort(); // Sort for consistent ordering
        
        children.forEach(childId => dfs(childId, depth + 1));
      };
      
      // Start DFS from all root nodes
      rootNodes.forEach(root => dfs(root.id));
      
      // Add any remaining nodes with notes that weren't reached
      nodesWithNotes.forEach(node => {
        if (!visited.has(node.id)) {
          orderedNodes.push({ ...node, depth: 0 });
        }
      });
      
      return orderedNodes;
    };
    
    const orderedNodes = getHierarchicalOrder();
    
    // Generate the combined markdown
    let combinedMarkdown = '# Combined Paper Notes\n\n';
    
    orderedNodes.forEach((node, index) => {
      combinedMarkdown += '_____________________\n';
      combinedMarkdown += `#### ${node.title}\n`;
      if (node.authors) {
        combinedMarkdown += `**Authors:** ${node.authors}\n`;
      }
      if (node.doi) {
        combinedMarkdown += `**DOI:** ${node.doi}\n`;
      }
      if (node.link) {
        combinedMarkdown += `**Link:** ${node.link}\n`;
      }
      combinedMarkdown += '\n';
      combinedMarkdown += node.notes;
      combinedMarkdown += '\n\n';
    });
    
    // Create a new window to display the combined notes
    const newWindow = window.open('', '_blank', 'width=800,height=600');
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Combined Paper Notes</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              line-height: 1.6;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 20px;
              padding-bottom: 10px;
              border-bottom: 1px solid #eee;
            }
            .copy-btn {
              background: #007bff;
              color: white;
              border: none;
              padding: 8px 16px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 14px;
            }
            .copy-btn:hover {
              background: #0056b3;
            }
            .content {
              white-space: pre-wrap;
              font-family: 'Courier New', monospace;
              background: #f8f9fa;
              padding: 20px;
              border-radius: 4px;
              border: 1px solid #e9ecef;
            }
            .success-message {
              color: green;
              font-size: 12px;
              margin-left: 10px;
              opacity: 0;
              transition: opacity 0.3s;
            }
            .success-message.show {
              opacity: 1;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Combined Paper Notes</h1>
            <div>
              <button class="copy-btn" onclick="copyToClipboard()">Copy to Clipboard</button>
              <span class="success-message" id="successMessage">Copied!</span>
            </div>
          </div>
          <div class="content" id="content">${combinedMarkdown.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
          <script>
            function copyToClipboard() {
              const content = document.getElementById('content').textContent;
              navigator.clipboard.writeText(content).then(() => {
                const msg = document.getElementById('successMessage');
                msg.classList.add('show');
                setTimeout(() => msg.classList.remove('show'), 2000);
              }).catch(err => {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = content;
                document.body.appendChild(textArea);
                textArea.select();
                try {
                  document.execCommand('copy');
                  const msg = document.getElementById('successMessage');
                  msg.classList.add('show');
                  setTimeout(() => msg.classList.remove('show'), 2000);
                } catch (err) {
                  alert('Copy failed. Please select all text and copy manually.');
                }
                document.body.removeChild(textArea);
              });
            }
          </script>
        </body>
        </html>
      `);
      newWindow.document.close();
    } else {
      // Fallback if popup is blocked
      alert('Popup blocked. Please allow popups for this site to view combined notes.');
    }
  });

  document.getElementById('exportBtn').addEventListener('click', () => {
    const data = { nodes: nodes.get(), edges: edges.get() };
    
    // Get current node positions and add them to the export data
    try {
      const positions = network.getPositions();
      data.nodes.forEach(node => {
        const pos = positions[node.id];
        if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
          node.x = pos.x;
          node.y = pos.y;
        }
      });
    } catch (e) {
      console.error('Failed to export node positions', e);
    }
    
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
        if (parsed.nodes) {
          nodes.clear();
          nodes.add(parsed.nodes);
          
          // If imported data has positions, apply them after network is ready
          if (parsed.nodes.some(node => typeof node.x === 'number' && typeof node.y === 'number')) {
            let positionsRestored = false; // Flag to ensure it only runs once
            
            const restorePositions = () => {
              if (positionsRestored) return; // Prevent multiple executions
              positionsRestored = true;
              
              try {
                const positionUpdates = [];
                parsed.nodes.forEach(node => {
                  if (typeof node.x === 'number' && typeof node.y === 'number' && !isNaN(node.x) && !isNaN(node.y)) {
                    // Preserve the original physics/locked state of the node
                    const originalPhysics = node.physics !== undefined ? node.physics : true;
                    positionUpdates.push({
                      id: node.id,
                      x: node.x,
                      y: node.y,
                      physics: originalPhysics // Preserve original physics state
                    });
                  }
                });
                if (positionUpdates.length > 0) {
                  nodes.update(positionUpdates);
                }
              } catch (e) {
                console.error('Failed to restore imported node positions', e);
              }
            };

            // Single timing approach
            if (typeof network.on === 'function') {
              const stabilizedHandler = () => {
                network.off('stabilized', stabilizedHandler);
                setTimeout(restorePositions, 100);
              };
              network.on('stabilized', stabilizedHandler);
            } else {
              // Fallback timeout
              setTimeout(restorePositions, 500);
            }
          }
        }
        if (parsed.edges) {
          edges.clear();
          edges.add(parsed.edges);
        }
        window._saveToStorage();
      } catch (err) { 
        alert('Invalid JSON'); 
      }
    };
    reader.readAsText(f);
  });
}
