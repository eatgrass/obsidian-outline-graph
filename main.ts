import { Plugin } from 'obsidian';
import { renderOutlineBlock } from './graphRenderer';
import { OutlineGraphSettingTab, OutlineGraphSettings, DEFAULT_SETTINGS } from './settings';


export default class OutlineGraphPlugin extends Plugin {
	settings: OutlineGraphSettings;

	async onload() {

		await this.loadSettings();

		// 注册 outline 代码块渲染器（当前返回 HelloWorld）
		this.registerMarkdownCodeBlockProcessor('outline', async (source, el, ctx) => {
			await renderOutlineBlock(source, el, ctx);
		});


		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new OutlineGraphSettingTab(this.app, this as any));


	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}


 

