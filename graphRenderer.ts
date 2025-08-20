import { MarkdownPostProcessorContext } from 'obsidian';
import { select } from 'd3-selection';
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, SimulationLinkDatum, SimulationNodeDatum } from 'd3-force';

interface NodeDatum extends SimulationNodeDatum { id: string; label: string }
type LinkDatum = SimulationLinkDatum<NodeDatum> & { source: string | NodeDatum; target: string | NodeDatum };

export async function renderOutlineBlock(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext): Promise<void> {
	const container = createOutlineElement();
	el.appendChild(container);

	// 延迟到元素挂载后获取尺寸并渲染
	requestAnimationFrame(() => {
		const { nodes, links } = parseMarkdownListToGraph(source);
		renderForceGraph(container, nodes, links);
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
	const levelStack: string[] = []; // 保存每一层最后一个节点 id
	let idCounter = 0;

	const createId = () => `n${++idCounter}`;

	for (const rawLine of lines) {
		const line = rawLine.replace(/\t/g, '    ');
		// 匹配 markdown 列表项：- * + 或 有序列表 1. 2. 等
		const match = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
		if (!match) continue;
		const indent = match[1] ?? '';
		const content = (match[3] ?? '').trim();
		const level = Math.floor(indent.length / 2); // 2 空格视为一级

		const id = createId();
		nodes.push({ id, label: content || '(空)' });

		// 维护层级栈
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

function renderForceGraph(container: HTMLElement, nodes: NodeDatum[], links: LinkDatum[]): void {
	// 清空
	container.textContent = '';

	const rect = container.getBoundingClientRect();
	const width = Math.max(200, Math.floor(rect.width || 600));
	const height = Math.max(160, Math.floor(rect.height || 320));

	const svg = select(container)
		.append('svg')
		.attr('class', 'outline-graph-svg')
		.attr('width', width)
		.attr('height', height)
		.style('background', 'transparent');

	const link = svg
		.append('g')
		.attr('class', 'links')
		.selectAll('line')
		.data(links)
		.enter()
		.append('line')
		.attr('stroke', 'var(--background-modifier-border)')
		.attr('stroke-opacity', 0.6)
		.attr('stroke-width', 1);

	const node = svg
		.append('g')
		.attr('class', 'nodes')
		.selectAll('g')
		.data(nodes)
		.enter()
		.append('g');

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

	const sim = forceSimulation<NodeDatum>(nodes)
		.force('link', forceLink<NodeDatum, LinkDatum>(links).id((d: NodeDatum) => d.id).distance(70).strength(0.3))
		.force('charge', forceManyBody().strength(-140))
		.force('center', forceCenter(width / 2, height / 2))
		.force('collision', forceCollide(14));

	sim.on('tick', () => {
		link
			.attr('x1', (d: LinkDatum) => (typeof d.source === 'object' ? (d.source.x as number ?? 0) : 0))
			.attr('y1', (d: LinkDatum) => (typeof d.source === 'object' ? (d.source.y as number ?? 0) : 0))
			.attr('x2', (d: LinkDatum) => (typeof d.target === 'object' ? (d.target.x as number ?? 0) : 0))
			.attr('y2', (d: LinkDatum) => (typeof d.target === 'object' ? (d.target.y as number ?? 0) : 0));

		node.attr('transform', (d: any) => `translate(${d.x ?? 0},${d.y ?? 0})`);
	});

	// 自适应容器大小变化
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
}
