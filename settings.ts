import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';

export interface OutlineGraphSettings {
	mySetting: string;
}

export const DEFAULT_SETTINGS: OutlineGraphSettings = {
	mySetting: 'default'
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
			.setName('Setting #1')
			.setDesc("It's a secret")
			.addText((text) =>
				text
					.setPlaceholder('Enter your secret Here')
					.setValue(this.plugin.settings.mySetting)
					.onChange(async (value) => {
						this.plugin.settings.mySetting = value;
						await this.plugin.saveSettings();
					})
			);
	}
}


