import moment from 'moment';
import { App, MarkdownView, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
import { createDailyNote, getAllDailyNotes, getDailyNote, getDateFromFile } from 'obsidian-daily-notes-interface';

interface Settings {
	days: number;
	createNotes: boolean;
	leafIds: string[];
}

const DEFAULT_SETTINGS: Partial<Settings> = {
	days: 7,
	createNotes: false,
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
			callback: () => {
				let dailyNotes = getAllDailyNotes();
				const days = Math.trunc(this.settings.days);
				const createNotes = this.settings.createNotes;
				const activeFile = app.workspace.getActiveFile();
				const activeView = app.workspace.getActiveViewOfType(MarkdownView);
				let activeLeafId = '';
				if (activeView) {
					activeLeafId = (activeView.leaf as any).id;
				}
				this.closePanes(activeLeafId);

				// Check if the current active file is a daily note
				// If not, open daily notes starting from today
				let startDate = moment();
				let startFromToday = true;
				const noteDate = getDateFromFile(activeFile, 'day');
				if (noteDate) {
					startDate = noteDate;
					startFromToday = false;
				}

				const openPanes = () => {
					for (let i = startFromToday ? 0 : 1; i < days; i++) {
						const date = startDate.clone().add(i, 'day');
						const file = getDailyNote(date, dailyNotes);
						if (file) {
							// Open daily note in a new pane on the right
							const leaf = app.workspace.createLeafInParent(app.workspace.rootSplit, SPLIT_INDEX);
							leaf.openFile(file as TFile);
							const leafId = (leaf as any).id ?? null;
							if (leafId) this.settings.leafIds.push(leafId);
						}
					}
				}

				if (createNotes) {
					let queue = [];
					// Check if there are notes that need to be created
					for (let i = startFromToday ? 0 : 1; i < days; i++) {
						const date = startDate.clone().add(i, 'day');
						const file = getDailyNote(date, dailyNotes);
						if (!file) {
							queue.push(createDailyNote(date));
						}
					}
					if (queue.length) {
						// Create the files async
						Promise.all(queue).then(() => {
							dailyNotes = getAllDailyNotes();
							openPanes();
						});
					} else {
						openPanes();
					}
				} else {
					openPanes();
				}
				
				this.saveSettings();
			}
		});

		this.addCommand({
			id: 'upcoming-close-panes',
			name: 'Close panes',
			callback: () => {
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
			.setName('Days to open')
			.setDesc('How many days ahead to open when running the command.')
			.addText(text =>
				text
          .setPlaceholder(DEFAULT_SETTINGS.days.toString())
					.setValue((this.plugin.settings.days || DEFAULT_SETTINGS.days).toString())
					.onChange(async value => {
						this.plugin.settings.days = Math.abs(parseInt(value, 10));
            await this.plugin.saveSettings();
					})
			);
		
			new Setting(containerEl)
			.setName('Create notes when opening')
			.setDesc('If enabled, daily notes will be created for the upcoming days if they don\'t exist.')
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.createNotes || DEFAULT_SETTINGS.createNotes)
					.onChange(async value => {
						this.plugin.settings.createNotes = value;
            await this.plugin.saveSettings();
					})
			);
		
		const footer = createDiv();
		footer.style.borderTop = '1px solid var(--background-modifier-border)';
		footer.style.paddingTop = '1em';
		const coffeeImg = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAiEAAACZCAMAAADOzxqEAAAAhFBMVEX//////////e//+9//+c//97//9r//9K//8p//8I//7oD/7n//7HD/6mD/6FD/5kD/4zD/4SD/3xD/3QDw0ALhwwTStgfStgbDqQmznAukjw2Vgg+GdRKGdRF3ZxR3ZxNoWhZoWhVZTRhZTRdKQBo6MxwrJh8rJh4cGSEcGSANDCMNDCJnxCgaAAAAAXRSTlMAQObYZgAAEX1JREFUeNrtnel6qzgMhuk2Pd0XDDXGEEINIfT+728egg3e2EJD0yL9mWmbQxz5RZY+C8dxdLu6e3p1wVZo7y+Pt5fOgF3evYGnVm3P//r4uHoCD4G9dTPy8A7uAasY+c/KxzVkH2DCHi35yC0EELDWXq90QP6BU8CUwuYaAAGbgMgtOATMyFelXOQachAwSy7SEgJVDJjNHhodBHwBZjWeilzBGgNmt5eaEJDawbrsIK5egh/AeoPIHfgBrNMqaRW2+8G67dFxrsALYN32CosM2NAyA5UMWJ/dgp4K1msPDvgArM+egBCwXnsBQsCAEDAgBAwIAfvthCCMg0g2gvEH+BcIcV0viD7Z/qvD2GcUeODm9RISbHdfw7bbEgSuXiEhKNp/jbX9FhhZHSEf4/k4MBKAt9dFiDcNkK+vLwzuXhUhW2X2M7aNohC3RqIoYmoGuwN3r4oQ1iwfEe7JMXC4zcQrofpdJyFfLCJdjOAg/KhS2vqFIfh7TYREeibKWLXScNswxnghvGmWpC34e02EoGxshuq57kcdbMDfq6p20eeEGqb+P/D3qghxXbzdj4whPGsB/X1lhFSy+4YNAVLlIe4GFJGVElLZRxBtmQ2UKnUN6hI3OPwiAoevkpDGPEkx07QPD4oZIKTfDhnLHrbvVkPIRxRFeEriWa9Cn5CrroMQvGsbhMhwK5mHyUZUPTvIRVZACDFy0oyxTd15qO7dRcxMYTNYav46IdP3/S3lL9gfJmT7NdMgGfnjhMwFBILIHycE11u5BIebbAoXbBOFdVKSgd//NCHhYZZ51ykm0Sfr73ffMxaFojLewQ7e3yfkkIbs9cCCccRrl9oOrSIB1jWTEPZn/j4huzmtHnhss5mfsBgy2qZ8DKl2VxG60DNIRxAyK9nEI/dnvKIsywLx8ITxujUUv/JGLP8mK8tyGWFpOiH4GwgZjkC0rAyTJC9ry8iKCWEHF8gR5PCL8DwJqRsKd0fy+zmSkLg0LPNXS0iuE1LfQOQ8CeFyyG4T4ol5godDXvVsR941qhWrRaTUCandg8+UELk9dce21WbMQNTBJNowWTshRxFSFitNXf3Dp2e/hhDcIXoc9u7qB++C9pEI2x7OfvhNMhshZbJOQrBBiBFUzoqQ+fsyI57xbpKPuNovDgUw6wwi4eGzp7+HEN6WfLSNSbBqF7SKSO2kcp1P7dV5KdWXneJ8CRn7GIT9IJExcQDpPnETI9KuxxLdG3hBZxzdp4pwuGG7qXyM7ULERsTwV0xInZcGuhxy5oQ0FWxVp/ShsqtSWNGEOFZFwWauvnpCsL7sJL+CEHlWMZbOQwwOPzZ/DKY9uBt0ELJUMYOsFTwKWVkW6bcUmV6lFue0++9GUoZ7EhMeZw/XVLaz5g95DiFeGI2uLdA0QqhRuQSKikhoiCRns8TrndoOmcETjq22PdI2gSaH0inRPxwpeEUV93xOkjLGwkG/CM3YaJXxabUzXg0gJwOCmUYIik1lccyQT0dIdY7ZfuyhMRN3c6hRzTGZmUT27WGTL+ccFaOlVz/ne19UVNashg4Jta4glppTTwm02CdmhCLX72YVtXJPrlwLM4v8442SVKVrFkjjsG/IJyTkIJJ+TiJk9JMQie6TRL7jiPKZE+mnwwZGrnouke5GyQp+GybSzg9SPa3MQSCLu73Drq+VGohZX1eWLdAo1RRCKiVl8nvmFkJSEy0i/Sr/AUImtYuF0w4hYmpa6vFbi8i3BpWnuv4psChJmV2fFgWjskXINE/n7VKGCvmFwfDE9+jigQUDjU1ZIeySVJVYSUqDYK8YHspJCWEDhLw93d1Udv/cnFiEjyIkSLT7QKn+sDRniSE+cs/FHZpcoU5WSVRPS0t90vF7Y2kcfh0PAQVRVUALIPW46QjRXQW4hmfEkJcgpCMne3+6vmjsZvLpEHk90z4mlJl3rqLA83lBbTgJzeCbWhbJepr4TcdE0OC/yAs1NiO+dni0092+ZSPJGmuImEV1sbBtVubtJ4yNd7JcM+SY4TZ9SRH9KUJ6wsLb3eXFhUIImySHuNZ9u0xZIHIFgVwKJ54hzto6KeTlJUF1G1dZpuL1nhrJw2bVKbrczUNAEeNQtD2V1g+ciRkrZEJEIpzUQ6BJ81liu6Sam9eMZZ2ADg95EUIsd8nz7YVqN8NL0hhCyhxLvkyVkJ20N1tuKUAsMxWq6Yf88wEopqCVqb+nnZEh86S00frYh9fUG3IoEMGL1G+QcLaJrbY1ExO/uabfEJIPDvnUhBBrefJyd3Wh2z1vO9qPvbRfdhgxtik8aTFnpqqWd84U1opD1L5LaqhSXpsAZh0xKZdbWOIeFSIUo1QWC9p8QManOBPv3yGpMts1+cdSh5zPaUibQUhTwF7e3j+/VPZ8f3N5YTFByGjBDHcRcvBTJnuMSKuBuaLg7plq3yPU8wDPIIQ0M4DMMkKuT4hyLdy7y4JleouGTUEIEyPPhyXVtMl6QhFG2yF7HUM+vWL2xQWRiyF75EcQHUfI4fGbQkrdlDwtaX/yzSIw7UxDRPBpV6VYVROUaYibGSAdekiqXKvoaeBo1j0krZZBG80YfysqAoXxsYzEhL9fw1+iyER0VqvAHNVdzPr1ECEvUwUzUTcy2jwGgRtJRLn1+A3GpHBioQD35TpUL1Y9acqppujW6YK5PaRmxF7Zvc/otcOP22UpadkUc6wRYkShUL8ma0gLmheh7iEvRUjmujcnIiSw6VGZmqh6hm6QWSQs1EcI0rG0iC6FuA27GkQD5VpElyCwHh/r4dNmQynXZIyiJWSE6I6FE/xmoG45NOQFCMl4fXI7RMg7r3tGJ0uxLS6i2otIibGhkcGmloWkr15K9aWNWDZUOTpc2826audUJRO3cla7WRRad92kNSrkESLlr8PGe2b6nItr4lZfRuqQj2+bmEOIqGDvhwiZJ6lqkQUr90QqzYVRFaZlT9HpllqOEigxRdFDuACRKouWT/yuwF+o0YnINbhVv8JSAsSLEC9TCDElVc8objJpr2B4yAsQsuXTPoKQ7TcSkkn+QXKQ0AnBpbpuoLRkvp45tCsQVV6sbPFgUwo/TGSiTRpWivVcCTAjCFGSnlwwR4ZFd2puBg0PeQFCRGB4GgBkumBmz604IbJ/iDwXWrMeyjVClJ4B4cJMd3Oo/GSrraTIjo0CRaqKUlkqYb05FpEBw8psB5m9j7k01l8lKGJLG0F4TNU7nxDivgwTkh0hqVK7Wq0sy6k8aYW6PCfanAZq0Yj1bJIqVWUqv01geWYnkwOQb5NHqfzHuC+GIHXo0vZybm68hXqh5MuAiI4DYhly3pm1n4gQUaAMEfKPlz27eYTwaZKXZU9GQNsqJdpd72sAYb0QpkobhpLgpWbDD1bCHLbIo02Gkyhk2ghJ1H+gxgRtBzgtNUJCJcD5xv3RMeTlCNkMSmZHSqpa1sLvs0KpFuUbjJWmCto6kwOSde/YpIrjCyN3LBmLSUfbiUxI05aBpYoqtyalGsyxNSooF2vaCsUa1nalFYxRX1uJGIuDoU6ZExLSCKWDhDTy6/GEiO6JRErqkNyFieXCBemNQcKzesjI9HKEKokFlTV0Y3MlswilUpsHlu5mqmURua35J+/ILJqLkVzr9/ATIz9SNpqNNG76EXKzet0FIVf9hDxPFcwC8wlMLGDwJEJiyTmtT0MXU/HqjDegxmYbTazfy5mlB4XKSZ+vJ4tEJ4S6rpdptz1WOkfNdMnaTCoXJ/XrEQriQu0I8sPM1hwhX7NvyEsQsucbtjdDkmpwjKQqObUNpSH/pKmyA1wgo8WTKwP1f3LLbWaoJ6rK0BLSsNd6t16ycuNqJWN66lD/a3OXTRwghHPL+RdUrBsxDVA51ixRKegZ8hKEiBp2kJBo7APdSs4YH+4zhONcycrFDeMXQy7LPLXRRDnWSRcmNXG7rTFT4+QB/s7E3m2i3NR1SJFDSFOhE89rP1pYtJVIcz+E9l4Z43OzRMUhLMcMeTlC0JBkNllSTbumnEr75PEgIAypqoB6/IgehjXpUtQyXmp0pYeWdV/tE83qiU8JH2Rg6SRRRhY060rBci0X1T+Vr7UrFoQvy0yrdqSQGJZHa++zCNmME1XFoTSjv5CZ2We8CCz8JNLUBEzDSXFW7ls2//VfJHaZsj0nC4lsUTvuhiqxKuk79oRYYp2lj1lEPHXdJJp7Ctr0EVTNlK5HC+PSHUNegBARGh57AbmaLKnaDyCiyOLgDBFp3ZeIqDZN/UyNKGa9JO8OVuVO7tvb3IrSyDNI56AT1O4ZlrYzC1V+inox8XIjArpa7xvfcmGmgpqKAJS1VzWHfNRTVbMIIaMks+mSamyutnn7FKYc0Ku7QhFFcPXoalE/FiknKoX+qE5oCbvY78A0M6tP0rG9y5tpaQ8gCiK5AL991k8dLzbCkRpDkGtryit8d8SQT04IHkvIxNPcK82JIS8WjyikYcfDQ/XxiDi1PrwsA5Ige0Wdjupzy5DeOVvYbkePUEoNTZPZZG5c3/RFolyHiAiQSU8l810GnspWiQVvUVYUwthct8YMeRlCtu57LyF3UyXVqn5pkLAtnVz+KuK+PQYJkMx2kWq9Zn3bWKRZ3lQx0/bQt03UyerY1+k82zHCHqZUO2NSaLCoeeBBZFCJvFAmyoLsmkM+9njeeadDjBJV70cfxDyeoIBS2n9Os5z5Hdk+gxPGWCIOx26KmnzsaeIext9wvmfQaHGif6zRX5XN7KA9m1g4ZvqQT0NI5rqX/X3M+Ae+bDctZxNizHjFJVn6UNd2p4/ykrv5TJ62mxMa9803DHkeIbsxktlLx5M1J7Ww/H5Cfsao9phlKJ3GlC3w6eYRwsYREi3+lSFif5Vkf4iQGojYbyNHuMChmfMIEUrYXR8hbz9ASCoUkvwvEXLIRhnW9xTPmZBojKg6cErAKQw3svXMI5rOhhC/+V+ZkHlP0y1HSDCOkAW9yoSY5M06GOGMCHGthLgLHO8+j5BghGR2w7sEFiTEb7ZGg3lneJ0lIeg3EYLHEfI153vPjrCkUQzoAmF4aUJcPQ/xzpgQ0Yf41kPI7dSTMudbexQRW+6E/NPmVO0jYzIh5Owz1TGi6v3M7z07Ok9F7aOJf4MQkVTl6kPgxfkTshtFyHKCGW025cjvL2WkL0Gg8iFF2VJfADCTkBGS2dPUkzK/qZIhy36V0+lMnBFLxOauUEhQtkSl9i2EoD5ClpdUGy7wgl/Dcuq8O8uaJyb4xxKn7vhnTYh4YvtfHyGbHyEEWc81+4Vmns9blN9x2PIyhIwQVSeflPlNhASiZeLXf8NmrreU0fmdY4sRIlKMx3OSVFOlt/T3fyVNoHf7y32YmXvehIhC9q1HDqm7VPfLeZSU9oP1f3kmIq2YeMEvmP0WQvrOMntZXlJVnl2hrvt3EGlSKtFgmJ+e/5mE1HLpl+e+X3Y2qQbf3YM4JSz/kW/oxQkrc7lZG4UsL1i4QHI391vM9mL6321R5PKxaSIhizo0/0sR5GdtLiGf7Vfovt7f395Idnf/9N48VLNHy36uoOpCjj2Y4B8nhPBvxJQ0deXhS1TXw4suMmDnRIgrvkd1t7F8D1Qovrl56RACdj6EfMjfrctkk/+AwdOrJaRZZ/qMgKNXTIiL9wN87CGCrJsQF0V9jOwjyEHWTkhVXG4zOx+fBPgAQrh5GJNINu0hdrC1EwIGhIABIWBgQAgYEAIGhIAtZs/OKzgBrMcenCdwAliP3Tp34ASwHrtyrsAJYN326jjOG7gBrNMeHQeWGbDeRcZxLsENYF324lQG1QxYl/13IOTqHTwB1hNCHOcBXAFmtWtOCOiqYFZ7EIA417DOgJn26rR2C+4A0+3tUiLE+QcOAVPt/dpxABGw0YA4zi3kImBSDnLlGHYNFQ2YsMdLx2YPEEbADjnqf06HXYEAD+a+/XN67PIOmgHWbc+9fNSB5O4JMpJ1li8vj7dm/vE/H+2itXnhTzkAAAAASUVORK5CYII=';
		footer.innerHTML = `<p>Got a suggestion or found a bug? You can open an issue on <a href="https://github.com/charliecm/obsidian-upcoming/issues">Github</a>.</p><p>If you really like this plugin and want to support its development, please consider buying me a coffee 🙂 Thanks!</p><p><a href="https://www.buymeacoffee.com/charliecm"><img src="${coffeeImg}" width="217" height="60" alt="Buy Me A Coffee" /></a></p>`;
		containerEl.appendChild(footer);
  }
}