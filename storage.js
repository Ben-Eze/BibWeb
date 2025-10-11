// Handles localStorage, import/export logic
// Exports: loadFromStorage(nodes, edges), saveToStorage(nodes, edges)
const STORAGE_KEY = 'paper-web-data-v1';
const ASSETS_STORAGE_KEY = 'paper-web-assets-v1';
const MAX_ASSET_SIZE = 5 * 1024 * 1024; // 5MB limit for localStorage

export function loadFromStorage(nodes, edges, network) {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const obj = JSON.parse(raw);
    nodes.clear();
    edges.clear();
    
    // Restore session assets from localStorage
    const assetsRaw = localStorage.getItem(ASSETS_STORAGE_KEY);
    if (assetsRaw && typeof window._restoreSessionAssets === 'function') {
      try {
        const assetsData = JSON.parse(assetsRaw);
        window._restoreSessionAssets(assetsData);
      } catch (e) {
        console.error('Failed to restore session assets', e);
      }
    }
    
    if (obj.nodes) {
      nodes.add(obj.nodes);
      
      // If the stored data has positions, apply them after network stabilization
      if (network && obj.nodes.some(node => typeof node.x === 'number' && typeof node.y === 'number')) {
        let positionsRestored = false; // Flag to ensure it only runs once
        
        const restorePositions = () => {
          if (positionsRestored) return; // Prevent multiple executions
          positionsRestored = true;
          
          // Set global flag to prevent auto-save during restoration
          window._restoringPositions = true;
          
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
              }
            });
            if (positionUpdates.length > 0) {
              nodes.update(positionUpdates);
            }
          } catch (e) {
            console.error('Failed to restore node positions', e);
          } finally {
            // Clear the flag after a delay to allow stabilization
            setTimeout(() => {
              window._restoringPositions = false;
            }, 1000);
          }
        };

        // Single timing approach - use stabilized event or fallback timeout
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
  
  // Save session assets to localStorage (async, fire-and-forget)
  if (typeof window._getSessionAssetsForStorage === 'function') {
    console.log('[Storage] Starting async asset save...');
    window._getSessionAssetsForStorage().then(assetsData => {
      try {
        const assetCount = Object.keys(assetsData).length;
        console.log('[Storage] Saving', assetCount, 'assets to localStorage');
        localStorage.setItem(ASSETS_STORAGE_KEY, JSON.stringify(assetsData));
        console.log('[Storage] Assets saved successfully');
      } catch (e) {
        console.error('Failed to save session assets', e);
        // If localStorage is full, warn the user
        if (e.name === 'QuotaExceededError') {
          console.warn('localStorage quota exceeded. Assets not saved. Please export as ZIP to preserve files.');
        }
      }
    }).catch(e => {
      console.error('Failed to serialize session assets', e);
    });
  } else {
    console.warn('[Storage] _getSessionAssetsForStorage function not available');
  }
}
