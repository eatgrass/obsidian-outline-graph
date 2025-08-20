import { ItemView, WorkspaceLeaf } from 'obsidian';
import { createOutlineElement, mountOutlineGraph } from './graphRenderer';

export const OUTLINE_GRAPH_VIEW_TYPE = 'outline-graph-view';

export class OutlineGraphView extends ItemView {
	private source: string;

	constructor(leaf: WorkspaceLeaf, source: string) {
		super(leaf);
		this.source = source;
	}

	getViewType(): string {
		return OUTLINE_GRAPH_VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'Outline Graph';
	}

	async onOpen() {
		const container = createOutlineElement();
		container.style.height = '100%';
		this.containerEl.empty();
		this.containerEl.appendChild(container);
		mountOutlineGraph(container, this.source);
	}

	async onClose() {}
}


