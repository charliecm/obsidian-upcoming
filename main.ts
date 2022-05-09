import dayjs from 'dayjs';
import { App, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';

interface Settings {
  dateFormat: string;
	notesFolder: string;
	days: number;
	leafIds: string[];
}

const DEFAULT_SETTINGS: Partial<Settings> = {
  dateFormat: 'YYYY-MM-DD',
	notesFolder: '',
	days: 7,
	leafIds: []
};

const SPLIT_INDEX = 99; // Split panes at the end

export default class Upcoming extends Plugin {
	settings: Settings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new UpcomingSettingTab(this.app, this));

		this.addCommand({
			id: 'upcoming-open-notes',
			name: 'Open upcoming notes',
			checkCallback: (checking: boolean) => {
				if (checking) return true;
				const dateFormat = this.settings.dateFormat;
				const notesFolder = this.settings.notesFolder;
				const days = Math.trunc(this.settings.days);
				const activeLeafFile = (app.workspace.activeLeaf.view as any).file;
				const activeLeafId = (app.workspace.activeLeaf as any).id;
				this.closePanes(activeLeafId);

				// Check if the current active file is a daily note
				// If not, open daily notes starting from today
				let startDate = dayjs();
				let startFromToday = true;
				if (activeLeafFile.path.startsWith(notesFolder)) {
					const noteDate = dayjs(activeLeafFile.basename, dateFormat);
					if (noteDate.isValid()) {
						startDate = noteDate;
						startFromToday = false;
					}
				}

				for (let i = startFromToday ? 0 : 1; i < days; i++) {
					const noteName = startDate.add(i, 'day').format(dateFormat);
					const path = `${notesFolder}/${noteName}.md`;
					const file = app.vault.getAbstractFileByPath(path);
					if (file) {
						// Open day note in a new pane on the right
						const leaf = app.workspace.createLeafInParent(app.workspace.rootSplit, SPLIT_INDEX);
						leaf.openFile(file as TFile);
						this.settings.leafIds.push((leaf as any).id);
					}
				}
				this.saveSettings();
			}
		});

		this.addCommand({
			id: 'upcoming-close-panes',
			name: 'Close panes',
			checkCallback: (checking: boolean) => {
				if (checking) return true;
				this.closePanes();
			}
		});
	}

	closePanes(excludeId: string = '') {
		this.settings.leafIds.forEach(id => {
			if (id === excludeId) return;
			const leaf = app.workspace.getLeafById(id);
			if (leaf) leaf.detach();
		});
		this.settings.leafIds = [];
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class UpcomingSettingTab extends PluginSettingTab {
  plugin: Upcoming;

  constructor(app: App, plugin: Upcoming) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    let { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName('Date format')
      .setDesc('To identify the daily notes to open.')
      .addText(text =>
        text
          .setPlaceholder('YYYY-MM-DD')
          .setValue(this.plugin.settings.dateFormat)
          .onChange(async value => {
            this.plugin.settings.dateFormat = value;
            await this.plugin.saveSettings();
          })
      );

		// TODO: Search vault folders dropdown
		new Setting(containerEl)
      .setName('Note folder')
      .setDesc('Daily notes will be opened from here.')
			.addText(text =>
        text
          .setPlaceholder('Example: Folder/Subfolder')
          .setValue(this.plugin.settings.notesFolder)
          .onChange(async value => {
            this.plugin.settings.notesFolder = value;
            await this.plugin.saveSettings();
          })
      );

		new Setting(containerEl)
			.setName('Days to open')
			.setDesc('How many days ahead to open when running the command.')
			.addText(text =>
				text
          .setPlaceholder('7')
					.setValue((this.plugin.settings.days || DEFAULT_SETTINGS.days).toString())
					.onChange(async value => {
						this.plugin.settings.days = Math.abs(parseInt(value, 10));
            await this.plugin.saveSettings();
					})
			);
  }
}