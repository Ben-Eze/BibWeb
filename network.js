// Handles vis-network setup, node/edge creation, and event handling
// Exports: setupNetwork()
import { setupNodeToolbar } from './nodeToolbar.js';
import { setupEdgeToolbar } from './edgeToolbar.js';
import { setupNodeOverlays } from './nodeOverlays.js';

const SELECTED_WIDTH = 400;
const SELECTED_HEIGHT = Math.round(SELECTED_WIDTH * 1.414); // A4 aspect ratio
const DEFAULT_WIDTH = 240;
const DEFAULT_HEIGHT = 30; // vis-network default
const DEFAULT_LENGTH = 400;
const SELECTED_LENGTH = 600;

// Spacing / physics tuning constants (used for both physics and hierarchical modes)
const DEFAULT_NODE_DISTANCE = 220;
const DEFAULT_SPRING_LENGTH = 220;
const DEFAULT_SPRING_CONSTANT = 0.02;

const SELECTED_NODE_DISTANCE = 380;
const SELECTED_SPRING_LENGTH = 380;
const SELECTED_SPRING_CONSTANT = 0.015; // slightly gentler spring when selected

const HIER_DEFAULT_NODE_SPACING = DEFAULT_WIDTH + 40;
const HIER_DEFAULT_LEVEL_SEPARATION = 2 * DEFAULT_HEIGHT + 60;
const HIER_SELECTED_NODE_SPACING = SELECTED_WIDTH + 20;
const HIER_SELECTED_LEVEL_SEPARATION = SELECTED_HEIGHT + 20;

export function setupNetwork() {
	const nodes = new vis.DataSet([]);
	const edges = new vis.DataSet([]);
	const data = { nodes, edges };
	const container = document.getElementById('network');

	const options = {
		physics: {
			enabled: true,
			stabilization: { iterations: 200 },
			repulsion: {
				nodeDistance: DEFAULT_NODE_DISTANCE,
				springLength: DEFAULT_SPRING_LENGTH,
				springConstant: DEFAULT_SPRING_CONSTANT,
			}
		},
		layout: {},
		nodes: {
			shape: 'box',
			margin: 10,
			widthConstraint: { minimum: DEFAULT_WIDTH, maximum: DEFAULT_WIDTH },
			heightConstraint: { minimum: DEFAULT_HEIGHT },
			font: { multi: 'html' }
		},
		edges: {
			arrows: { to: { enabled: true, scaleFactor: 1 } },
			smooth: { enabled: true, type: 'cubicBezier' }
		},
		interaction: { hover: true, multiselect: false, navigationButtons: true }
	};

	const network = new vis.Network(container, data, options);
	// Track current layout mode to avoid accidental switches during select/deselect
	network.__layoutMode = 'physics';

	// Helper to switch spacing values when a node is selected/deselected,
	// without toggling the current layout mode.
	function applySpacing(selected) {
		if (network.__layoutMode === 'physics') {
			// physics repulsion / spring tuning
			network.setOptions({
				physics: {
					enabled: true,
					repulsion: {
						nodeDistance: selected ? SELECTED_NODE_DISTANCE : DEFAULT_NODE_DISTANCE,
						springLength: selected ? SELECTED_SPRING_LENGTH : DEFAULT_SPRING_LENGTH,
						springConstant: selected ? SELECTED_SPRING_CONSTANT : DEFAULT_SPRING_CONSTANT
					}
				}
			});
			if (network.stabilize) network.stabilize();
		} else if (network.__layoutMode === 'hierarchical') {
			// hierarchical layout spacing
			network.setOptions({
				layout: {
					hierarchical: {
						nodeSpacing: selected ? HIER_SELECTED_NODE_SPACING : HIER_DEFAULT_NODE_SPACING,
						levelSeparation: selected ? HIER_SELECTED_LEVEL_SEPARATION : HIER_DEFAULT_LEVEL_SEPARATION
					}
				}
			});
			if (network.redraw) network.redraw();
		}
	}

	// Expose spacing helper so toolbar can apply immediately on layout switch
	window._applySpacing = (selected = false) => applySpacing(selected);
	let lastSelectedNodes = [];
	let spacingSelected = false;
	network.on('selectNode', function (params) {
		lastSelectedNodes = params.nodes.slice();
		// increase global spacing to make room for expanded node(s) only on first selection
		if (!spacingSelected) {
			applySpacing(true);
			spacingSelected = true;
		}
		params.nodes.forEach(nodeId => {
			nodes.update({
				id: nodeId,
				widthConstraint: { minimum: SELECTED_WIDTH, maximum: SELECTED_WIDTH },
				heightConstraint: { minimum: SELECTED_HEIGHT },
				font: { size: 16 }
			});
			// Update connected edges to be longer
			edges.get().forEach(edge => {
				if (edge.from === nodeId || edge.to === nodeId) {
					edges.update({ id: edge.id, length: SELECTED_LENGTH });
				}
			});
		});
	});
	network.on('deselectNode', function (params) {
		// restore previous nodes to default size
		lastSelectedNodes.forEach(nodeId => {
			nodes.update({
				id: nodeId,
				widthConstraint: { minimum: DEFAULT_WIDTH, maximum: DEFAULT_WIDTH },
				heightConstraint: { minimum: DEFAULT_HEIGHT },
				font: { size: 16 }
			});
			// Restore connected edges to default length
			edges.get().forEach(edge => {
				if (edge.from === nodeId || edge.to === nodeId) {
					edges.update({ id: edge.id, length: DEFAULT_LENGTH });
				}
			});
		});
		// restore global spacing only if we previously expanded it
		if (spacingSelected && lastSelectedNodes.length) {
			applySpacing(false);
			spacingSelected = false;
		}
		lastSelectedNodes = [];
	});

	function addOrGetPaper({ title, authors, notes }) {
		// Remove HTML tags
		const stripHtmlTags = str => (!str ? '' : str.replace(/<[^>]*>/g, ''));
		title = stripHtmlTags(title);
		authors = stripHtmlTags(authors);
		// Find node by title
		const findNodeByTitle = title => {
			if (!title) return null;
			const t = title.trim().toLowerCase();
			if (!t) return null;
			const found = nodes.get().find(n => (n.title || '').trim().toLowerCase() === t);
			return found || null;
		};
		const existing = findNodeByTitle(title);
		if (existing) {
			// optionally update metadata
			if (authors) existing.authors = authors;
			if (notes) existing.notes = notes;
			const escapeHtml = s => (!s ? '' : s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'));
			const formatLabel = node => {
				const authors = node.authors ? `\n${escapeHtml(node.authors)}` : '';
				return `${escapeHtml(node.title)}${authors}`;
			};
			nodes.update({ ...existing, label: formatLabel(existing) });
			return existing;
		}
		// Generate next id
		const nextId = () => {
			let all = nodes.getIds();
			let id = 1;
			while (all.includes(id)) id++;
			return id;
		};
		const escapeHtml = s => (!s ? '' : s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'));
		const formatLabel = node => {
			const authors = node.authors ? `\n${escapeHtml(node.authors)}` : '';
			return `${escapeHtml(node.title)}${authors}`;
		};
		const id = nextId();
		const node = { id, title, authors, notes, label: formatLabel({ title, authors }), shape: 'box' };
		nodes.add(node);
		network.focus(id, { scale: 1.2, animation: true });
		return node;
	}

	function saveToStorage() {
		const data = { nodes: nodes.get(), edges: edges.get() };
		localStorage.setItem('paper-web-data-v1', JSON.stringify(data));
	}

	// Expose for toolbar.js
	window._addOrGetPaper = addOrGetPaper;
	window._saveToStorage = saveToStorage;

	setupNodeToolbar(network, nodes, edges);
	setupEdgeToolbar(network, nodes, edges);
	// Replace labels with overlays
	nodes.update(nodes.get().map(n => ({ id: n.id, label: '' })));
	setupNodeOverlays(network, nodes, edges);

	// Enforce default visuals for any nodes as they are added (including during loadFromStorage)
	nodes.on('add', (e) => {
		if (e && Array.isArray(e.items) && e.items.length) {
			const updates = e.items.map((id) => ({
				id,
				widthConstraint: { minimum: DEFAULT_WIDTH, maximum: DEFAULT_WIDTH },
				heightConstraint: { minimum: DEFAULT_HEIGHT },
				font: { size: 16 },
			}));
			nodes.update(updates);
		}
	});

	// Ensure starting state: default spacing, and no selections (toolbar hidden)
	try { applySpacing(false); } catch {}
	if (typeof network.unselectAll === 'function') network.unselectAll();

		// One-time initial reset after first render to guarantee defaults
		const initialReset = () => {
			try {
				// Reset all nodes to default constraints and font
				const nodeUpdates = nodes.get().map(n => ({
					id: n.id,
					widthConstraint: { minimum: DEFAULT_WIDTH, maximum: DEFAULT_WIDTH },
					heightConstraint: { minimum: DEFAULT_HEIGHT },
					font: { size: 16 }
				}));
				if (nodeUpdates.length) nodes.update(nodeUpdates);

				// Reset all edges to default length
				const edgeUpdates = edges.get().map(e => ({ id: e.id, length: DEFAULT_LENGTH }));
				if (edgeUpdates.length) edges.update(edgeUpdates);

				// Apply default spacing and unselect
				try { applySpacing(false); } catch {}
				if (typeof network.unselectAll === 'function') network.unselectAll();

				// Ensure overlay toolbars are hidden
				const cont = document.getElementById('nodeOverlayContainer');
				if (cont) cont.querySelectorAll('.node-overlay.is-selected').forEach(el => el.classList.remove('is-selected'));
			} finally {
				if (typeof network.off === 'function') network.off('afterDrawing', initialReset);
			}
		};
		if (typeof network.on === 'function') network.on('afterDrawing', initialReset);

	return { network, nodes, edges };
}
