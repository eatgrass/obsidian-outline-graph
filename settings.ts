import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';

export interface OutlineGraphSettings {
	showForceControls: boolean;
}

export const DEFAULT_SETTINGS: OutlineGraphSettings = {
	showForceControls: true
};

export type OutlineGraphPluginLike = Plugin & {
	settings: OutlineGraphSettings;
	saveSettings: () => Promise<void>;
};

export class OutlineGraphSettingTab extends PluginSettingTab {
	plugin: OutlineGraphPluginLike;

	constructor(app: App, plugin: OutlineGraphPluginLike) {
		super(app, plugin);
		this.plugin = plugin;
	}

		display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Show Force Controls')
			.setDesc('Display the force control panel on graph hover')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showForceControls)
					.onChange(async (value) => {
						this.plugin.settings.showForceControls = value;
						await this.plugin.saveSettings();
					})
			);
	}
}


