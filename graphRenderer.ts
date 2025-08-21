import { MarkdownPostProcessorContext, setIcon } from 'obsidian';
import { select } from 'd3-selection';
import { zoom, zoomIdentity, D3ZoomEvent } from 'd3-zoom';
import { drag, D3DragEvent } from 'd3-drag';
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, SimulationLinkDatum, SimulationNodeDatum } from 'd3-force';

interface NodeDatum extends SimulationNodeDatum { id: string; label: string; depth: number; rootId: string }
type LinkDatum = SimulationLinkDatum<NodeDatum> & { source: string | NodeDatum; target: string | NodeDatum };

type PluginBridge = { 
	openOutlineGraphView?: (source: string) => Promise<void> | void;
	settings?: { showForceControls: boolean };
};

export async function renderOutlineBlock(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext, plugin?: PluginBridge): Promise<void> {
	const wrapper = document.createElement('div');
	wrapper.style.position = 'relative';
	wrapper.style.width = '100%';
	wrapper.style.height = '100%';

	const container = createOutlineElement();
	wrapper.appendChild(container);

	// Bottom-right icon button: open in a dedicated view (avoid overlapping native controls)
	const openBtn = document.createElement('button');
	openBtn.className = 'outline-graph-open-btn';
	openBtn.ariaLabel = 'Open in View';
	openBtn.title = 'Open in a dedicated view';
	openBtn.style.position = 'absolute';
	openBtn.style.right = '8px';
	openBtn.style.bottom = '8px';
	openBtn.style.top = 'auto';
	openBtn.style.padding = '0';
	openBtn.style.width = '28px';
	openBtn.style.height = '28px';
	openBtn.style.display = 'flex';
	openBtn.style.alignItems = 'center';
	openBtn.style.justifyContent = 'center';
	openBtn.style.border = 'none';
	openBtn.style.background = 'var(--background-primary)';
	openBtn.style.color = 'var(--text-normal)';
	openBtn.style.borderRadius = '4px';
	openBtn.style.cursor = 'pointer';
	openBtn.style.zIndex = '1';
	openBtn.style.opacity = '0';
	openBtn.style.transition = 'opacity 150ms ease';
	openBtn.style.pointerEvents = 'none';
	setIcon(openBtn, 'maximize-2');
	openBtn.addEventListener('click', () => {
		if (plugin?.openOutlineGraphView) plugin.openOutlineGraphView(source);
	});
	wrapper.appendChild(openBtn);

	wrapper.addEventListener('mouseenter', () => {
		openBtn.style.opacity = '1';
		openBtn.style.pointerEvents = 'auto';
	});
	wrapper.addEventListener('mouseleave', () => {
		openBtn.style.opacity = '0';
		openBtn.style.pointerEvents = 'none';
	});

	el.appendChild(wrapper);

	// Defer until mounted to ensure container size is available
	requestAnimationFrame(() => {
		mountOutlineGraph(container, source, plugin?.settings?.showForceControls ?? true);
	});
}

export function createOutlineElement(): HTMLElement {
	const container = document.createElement('div');
	container.className = 'outline-block-rendered outline-graph';
	container.style.width = '100%';
	container.style.height = '320px';
	container.style.position = 'relative';
	return container;
}

function parseMarkdownListToGraph(source: string): { nodes: NodeDatum[]; links: LinkDatum[] } {
	const lines = source.split(/\r?\n/);
	const nodes: NodeDatum[] = [];
	const links: LinkDatum[] = [];
	const levelStack: string[] = []; // stack of last node id per level
	const idToRootId: Record<string, string> = {};
	let indentUnit: number | null = null; // detected indent unit (2 or 4 spaces typical)
	let idCounter = 0;

	const createId = () => `n${++idCounter}`;

	const getIndentWidth = (ws: string): number => {
		let width = 0;
		for (let i = 0; i < ws.length; i++) {
			const ch = ws.charAt(i);
			if (ch === '\t') {
				// treat tab as 4-space advance
				width += 4;
			} else if (ch === ' ') {
				width += 1;
			} else {
				// other whitespace, ignore
			}
		}
		return width;
	};

	for (const rawLine of lines) {
		// Skip empty lines
		if (!rawLine.trim()) continue;
		
		// Get indentation and content
		const match = rawLine.match(/^(\s*)(.*)$/);
		if (!match) continue;
		const indentWs = match[1] ?? '';
		const content = (match[2] ?? '').trim();

		// Determine indent unit on first indented item; prefer 4 then 2, else exact width
		const width = getIndentWidth(indentWs);
		if (width > 0 && indentUnit == null) {
			indentUnit = (width % 4 === 0) ? 4 : (width % 2 === 0) ? 2 : width;
		}
		const unit = indentUnit ?? 0;
		const level = unit > 0 ? Math.max(0, Math.floor(width / unit)) : 0;

		const id = createId();
		let rootId = id;
		if (level > 0) {
			const parentId = levelStack[level - 1];
			rootId = idToRootId[parentId] ?? parentId;
		}
		idToRootId[id] = rootId;
		nodes.push({ id, label: content || '(Empty)', depth: level, rootId });

		// Maintain level stack
		levelStack[level] = id;
		levelStack.length = level + 1;

		if (level > 0) {
			const parentId = levelStack[level - 1];
			if (parentId) {
				links.push({ source: parentId, target: id });
			}
		}
	}

	return { nodes, links };
}

function renderForceGraph(container: HTMLElement, nodes: NodeDatum[], links: LinkDatum[], showForceControls: boolean = true): void {
	// Clear container
	container.textContent = '';

	const rect = container.getBoundingClientRect();
	const width = Math.max(200, Math.floor(rect.width || 600));
	const height = Math.max(160, Math.floor(rect.height || 320));

	const svg = select(container)
		.append('svg')
		.attr('class', 'outline-graph-svg')
		.attr('width', width)
		.attr('height', height)
		.style('background', 'transparent')
		.style('cursor', 'grab');

	// Root group for pan/zoom
	const root = svg.append('g').attr('class', 'root');

	const link = root
		.append('g')
		.attr('class', 'links')
		.selectAll('line')
		.data(links)
		.enter()
		.append('line')
		.attr('stroke', 'var(--background-modifier-border)')
		.attr('stroke-opacity', 0.6)
		.attr('stroke-width', 1);

	const node = root
		.append('g')
		.attr('class', 'nodes')
		.selectAll('g')
		.data(nodes)
		.enter()
		.append('g')
		.style('cursor', 'pointer');

	node
		.append('circle')
		.attr('r', 4)
		.attr('fill', 'var(--text-muted)');

	node
		.append('text')
		.text((d: NodeDatum) => d.label)
		.attr('x', 6)
		.attr('y', 3)
		.attr('fill', 'var(--text-normal)')
		.attr('font-size', '10px');

	const band = Math.max(80, height / (Math.max(...nodes.map(n => n.depth)) + 2));
	const cx = width / 2;
	const cy = height / 2;
	const roots = nodes.filter(n => n.depth === 0);
	const rootCount = Math.max(1, roots.length);
	const baseR = Math.max(80, Math.min(width, height) / 2 - 60);
	const layerSpacing = Math.max(60, Math.min(width, height) / 10);

	// Disjoint force-directed layout inspired by Observable
	// Group nodes by their root
	const groups = new Map<string, NodeDatum[]>();
	roots.forEach(root => {
		groups.set(root.id, [root]);
	});
	
	// Add children to their root groups
	nodes.forEach(node => {
		if (node.depth > 0) {
			const group = groups.get(node.rootId);
			if (group) group.push(node);
		}
	});

	// Calculate group positions in a circle
	const groupPositions = new Map<string, { x: number; y: number }>();
	const groupCount = groups.size;
	let groupIndex = 0;
	
	for (const [rootId, groupNodes] of groups) {
		const angle = (2 * Math.PI * groupIndex) / groupCount;
		const groupX = cx + baseR * Math.cos(angle);
		const groupY = cy + baseR * Math.sin(angle);
		groupPositions.set(rootId, { x: groupX, y: groupY });
		groupIndex++;
	}

	// Create separate simulations for each group
	const simulations: any[] = [];
	
	for (const [rootId, groupNodes] of groups) {
		// Get links within this group
		const groupLinks = links.filter(link => {
			const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
			const targetId = typeof link.target === 'string' ? link.target : link.target.id;
			return groupNodes.some(n => n.id === sourceId) && groupNodes.some(n => n.id === targetId);
		});

		// Create simulation for this group
		const groupSim = forceSimulation<NodeDatum>(groupNodes)
			.force('link', forceLink<NodeDatum, LinkDatum>(groupLinks).id(d => d.id).distance(50).strength(0.3))
			.force('charge', forceManyBody().strength(-100))
			.force('collision', forceCollide(12));

		// Position the group
		const groupPos = groupPositions.get(rootId)!;
		groupSim.force('center', forceCenter(groupPos.x, groupPos.y));
		
		simulations.push(groupSim);
	}

	// Combine all nodes for the main simulation
	const allNodes = Array.from(groups.values()).flat();
	const allLinks = links.filter(link => {
		const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
		const targetId = typeof link.target === 'string' ? link.target : link.target.id;
		return allNodes.some(n => n.id === sourceId) && allNodes.some(n => n.id === targetId);
	});

	// Define forces for the main simulation
	const linkForce = forceLink<NodeDatum, LinkDatum>(allLinks)
		.id((d: NodeDatum) => d.id)
		.distance(70)
		.strength(0.4);
	const chargeForce = forceManyBody().strength(-160);
	const centerXForce = forceX<NodeDatum>(cx).strength(0.15);
	const centerYForce = forceY<NodeDatum>(cy).strength(0.15);

	const sim = forceSimulation<NodeDatum>(allNodes)
		.force('link', linkForce)
		.force('charge', chargeForce)
		.force('centerX', centerXForce)
		.force('centerY', centerYForce)
		.force('center', forceCenter(cx, cy))
		.force('collision', forceCollide(14));

	// Node drag behavior: drag node when pointer is on node; pan when dragging blank area
	const dragBehavior = drag<SVGGElement, NodeDatum>()
		.on('start', (event: D3DragEvent<SVGGElement, NodeDatum, NodeDatum>, d: NodeDatum) => {
			// prevent zoom/pan while dragging a node
			if (event.sourceEvent) (event.sourceEvent as Event).stopPropagation();
			if (!event.active) sim.alphaTarget(0.3).restart();
			d.fx = d.x;
			d.fy = d.y;
			svg.style('cursor', 'grabbing');
		})
		.on('drag', (event: D3DragEvent<SVGGElement, NodeDatum, NodeDatum>, d: NodeDatum) => {
			d.fx = event.x;
			d.fy = event.y;
		})
		.on('end', (event: D3DragEvent<SVGGElement, NodeDatum, NodeDatum>, d: NodeDatum) => {
			if (!event.active) sim.alphaTarget(0);
			d.fx = null as any;
			d.fy = null as any;
			svg.style('cursor', 'grab');
		});

	(node as any).call(dragBehavior as any);

	sim.on('tick', () => {
		link
			.attr('x1', (d: LinkDatum) => (typeof d.source === 'object' ? (d.source.x as number ?? 0) : 0))
			.attr('y1', (d: LinkDatum) => (typeof d.source === 'object' ? (d.source.y as number ?? 0) : 0))
			.attr('x2', (d: LinkDatum) => (typeof d.target === 'object' ? (d.target.x as number ?? 0) : 0))
			.attr('y2', (d: LinkDatum) => (typeof d.target === 'object' ? (d.target.y as number ?? 0) : 0));

		node.attr('transform', (d: any) => `translate(${d.x ?? 0},${d.y ?? 0})`);
	});

	// Start all group simulations
	simulations.forEach(sim => sim.alpha(1).restart());

	// Resize-aware: re-center and relayout on container size changes
	if ('ResizeObserver' in window) {
		const ro = new ResizeObserver(entries => {
			for (const entry of entries) {
				const cr = entry.contentRect;
				svg.attr('width', Math.max(200, Math.floor(cr.width)));
				svg.attr('height', Math.max(160, Math.floor(cr.height)));
				sim.force('center', forceCenter(Math.max(200, Math.floor(cr.width)) / 2, Math.max(160, Math.floor(cr.height)) / 2));
				sim.alpha(0.3).restart();
			}
		});
		ro.observe(container);
	}

	// Bind zoom/pan behavior
	const zoomBehavior = zoom<SVGSVGElement, unknown>()
		.scaleExtent([0.25, 4])
		.on('zoom', (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
			root.attr('transform', event.transform.toString());
		})
		.on('start', () => {
			svg.style('cursor', 'grabbing');
		})
		.on('end', () => {
			svg.style('cursor', 'grab');
		});

	svg.call(zoomBehavior as any).call(zoomBehavior.transform as any, zoomIdentity);

	// Force controls (approximate Obsidian Graph parameters) - only show if enabled
	if (showForceControls) {
	const controls = document.createElement('div');
	controls.style.position = 'absolute';
	controls.style.left = '8px';
	controls.style.top = '8px';
	controls.style.padding = '8px';
	controls.style.borderRadius = '6px';
	controls.style.background = 'var(--background-primary)';
	controls.style.border = '1px solid var(--background-modifier-border)';
	controls.style.color = 'var(--text-normal)';
	controls.style.fontSize = '12px';
	controls.style.minWidth = '180px';
	controls.style.opacity = '0.95';
	controls.style.display = 'flex';
	controls.style.flexDirection = 'column';
	controls.style.gap = '6px';

	// Header with collapse toggle
	const header = document.createElement('div');
	header.style.display = 'flex';
	header.style.alignItems = 'center';
	header.style.justifyContent = 'space-between';
	const title = document.createElement('div');
	title.textContent = 'Forces';
	title.style.fontWeight = '600';
	const toggle = document.createElement('button');
	toggle.style.border = 'none';
	toggle.style.background = 'transparent';
	toggle.style.cursor = 'pointer';
	toggle.style.width = '24px';
	toggle.style.height = '24px';
	toggle.style.display = 'flex';
	toggle.style.alignItems = 'center';
	toggle.style.justifyContent = 'center';
	toggle.style.color = 'var(--text-normal)';

	header.appendChild(title);
	header.appendChild(toggle);
	controls.appendChild(header);

	const content = document.createElement('div');
	content.style.display = 'block';
	content.style.gap = '8px';
	content.style.display = 'flex';
	content.style.flexDirection = 'column';
	controls.appendChild(content);

	const addSlider = (labelText: string, min: number, max: number, step: number, value: number, onInput: (v: number) => void) => {
		const row = document.createElement('div');
		row.style.display = 'flex';
		row.style.flexDirection = 'column';
		row.style.gap = '4px';
		row.style.marginBottom = '8px';
		const label = document.createElement('label');
		label.textContent = labelText;
		const input = document.createElement('input');
		input.type = 'range';
		input.min = String(min);
		input.max = String(max);
		input.step = String(step);
		input.value = String(value);
		input.addEventListener('input', () => {
			const v = Number(input.value);
			onInput(v);
			sim.alpha(0.3).restart();
		});
		row.appendChild(label);
		row.appendChild(input);
		content.appendChild(row);
	};

	// Center force: implemented via forceX/forceY towards center
	addSlider('Center force', 0, 1, 0.01, 0.15, (v) => {
		centerXForce.strength(v);
		centerYForce.strength(v);
		simulations.forEach(sim => sim.alpha(0.3).restart());
	});

	// Repel force: d3.forceManyBody negative strength
	addSlider('Repel force', 0, 400, 1, 160, (v) => {
		chargeForce.strength(-v);
		simulations.forEach(sim => sim.alpha(0.3).restart());
	});

	// Link force strength
	addSlider('Link force', 0, 1, 0.01, 0.4, (v) => {
		(linkForce as any).strength(v);
		simulations.forEach(sim => sim.alpha(0.3).restart());
	});

	// Link distance
	addSlider('Link distance', 20, 300, 1, 70, (v) => {
		(linkForce as any).distance(v);
		simulations.forEach(sim => sim.alpha(0.3).restart());
	});

	// Only show controls on hover to reduce clutter
	controls.style.pointerEvents = 'none';
	controls.style.transition = 'opacity 150ms ease';
	container.appendChild(controls);
	container.addEventListener('mouseenter', () => {
		controls.style.opacity = '0.95';
		controls.style.pointerEvents = 'auto';
	});
	container.addEventListener('mouseleave', () => {
		controls.style.opacity = '0';
		controls.style.pointerEvents = 'none';
	});

	// Collapse logic
	let collapsed = false;
	const updateCollapsed = () => {
		if (collapsed) {
			content.style.display = 'none';
			setIcon(toggle, 'chevron-right');
		} else {
			content.style.display = 'flex';
			setIcon(toggle, 'chevron-up');
		}
	};
	toggle.addEventListener('click', (e) => {
		e.stopPropagation();
		collapsed = !collapsed;
		updateCollapsed();
	});
	updateCollapsed();
	}
}

export function mountOutlineGraph(container: HTMLElement, source: string, showForceControls: boolean = true): void {
	const { nodes, links } = parseMarkdownListToGraph(source);
	renderForceGraph(container, nodes, links, showForceControls);
}
