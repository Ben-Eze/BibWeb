// Handles localStorage, import/export logic
// Exports: loadFromStorage(nodes, edges), saveToStorage(nodes, edges)
const STORAGE_KEY = 'paper-web-data-v1';

export function loadFromStorage(nodes, edges, network) {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const obj = JSON.parse(raw);
    nodes.clear();
    edges.clear();
    if (obj.nodes) {
      nodes.add(obj.nodes);
      console.log('Loaded nodes:', obj.nodes.length);
      console.log('Nodes with positions:', obj.nodes.filter(n => typeof n.x === 'number' && typeof n.y === 'number').length);
      
      // If the stored data has positions, apply them after network stabilization
      if (network && obj.nodes.some(node => typeof node.x === 'number' && typeof node.y === 'number')) {
        let positionsRestored = false; // Flag to ensure it only runs once
        
        const restorePositions = () => {
          if (positionsRestored) return; // Prevent multiple executions
          positionsRestored = true;
          
          console.log('Restore positions function called');
          try {
            const positionUpdates = [];
            obj.nodes.forEach(node => {
              if (typeof node.x === 'number' && typeof node.y === 'number' && !isNaN(node.x) && !isNaN(node.y)) {
                // Preserve the original physics/locked state of the node
                const originalPhysics = node.physics !== undefined ? node.physics : true;
                positionUpdates.push({
                  id: node.id,
                  x: node.x,
                  y: node.y,
                  physics: originalPhysics // Preserve original physics state
                });
                console.log(`Will restore node ${node.id} to position (${node.x}, ${node.y}), physics: ${originalPhysics}`);
              }
            });
            console.log('Position updates array:', positionUpdates);
            if (positionUpdates.length > 0) {
              console.log('Updating nodes with positions...');
              nodes.update(positionUpdates);
              console.log('Successfully restored node positions');
            } else {
              console.log('No valid positions found to restore');
            }
          } catch (e) {
            console.error('Failed to restore node positions', e);
          }
        };

        // Single timing approach - use stabilized event or fallback timeout
        console.log('Setting up position restoration...');
        
        if (typeof network.on === 'function') {
          const stabilizedHandler = () => {
            console.log('Network stabilized, restoring positions');
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
    if (obj.edges) edges.add(obj.edges);
  } catch (e) {
    console.error('Failed to load storage', e);
  }
}

export function saveToStorage(nodes, edges, network) {
  const nodeData = nodes.get();
  
  // If network is provided, get current positions and add them to node data
  if (network && typeof network.getPositions === 'function') {
    try {
      const positions = network.getPositions();
      nodeData.forEach(node => {
        const pos = positions[node.id];
        if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
          node.x = pos.x;
          node.y = pos.y;
        }
      });
    } catch (e) {
      console.error('Failed to save node positions', e);
    }
  }
  
  const data = { nodes: nodeData, edges: edges.get() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
