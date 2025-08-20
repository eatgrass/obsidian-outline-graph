import { Plugin, WorkspaceLeaf } from 'obsidian';
import { renderOutlineBlock } from './graphRenderer';
import { OutlineGraphSettingTab, OutlineGraphSettings, DEFAULT_SETTINGS } from './settings';
import { OUTLINE_GRAPH_VIEW_TYPE, OutlineGraphView } from './OutlineGraphView';


export default class OutlineGraphPlugin extends Plugin {
	settings: OutlineGraphSettings;

	async onload() {

		await this.loadSettings();

		// Register outline code block renderer and pass open method
		this.registerMarkdownCodeBlockProcessor('outline', async (source, el, ctx) => {
			await renderOutlineBlock(source, el, ctx, { openOutlineGraphView: (s) => this.openOutlineGraphView(s) });
		});


		// Add settings tab for plugin configuration
		this.addSettingTab(new OutlineGraphSettingTab(this.app, this as any));

		// Register custom view
		this.registerView(OUTLINE_GRAPH_VIEW_TYPE, (leaf) => new OutlineGraphView(leaf, ''));


	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async openOutlineGraphView(source: string): Promise<void> {
		const leaf: WorkspaceLeaf = this.app.workspace.getLeaf(true);
		await leaf.setViewState({ type: OUTLINE_GRAPH_VIEW_TYPE, active: true });
		const view = leaf.view as OutlineGraphView;
		(view as any).source = source;
		await view.onOpen();
	}
}


 

