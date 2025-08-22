import { ItemView, WorkspaceLeaf } from 'obsidian';
import { createOutlineElement, mountOutlineGraph } from './graphRenderer';

export const OUTLINE_GRAPH_VIEW_TYPE = 'outline-graph-view';

export class OutlineGraphView extends ItemView {
	public source: string;

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
		container.classList.add('outline-graph-view-container');
		this.containerEl.empty();
		this.containerEl.appendChild(container);
		mountOutlineGraph(container, this.source);
	}

	async onClose() {}
}


