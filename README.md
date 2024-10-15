# Obsidian Upcoming

An [Obsidian](https://obsidian.md) plugin that opens upcoming (and/or past) [daily notes](https://help.obsidian.md/Plugins/Daily+notes) in their own panes/tabs/windows, so you can see and plan ahead. Check out the plugin settings before using the provided commands:

- **Open upcoming notes:** If a daily note is in the currently active pane, this command will open upcoming notes relative to that date. Otherwise, it will start from today.
- **Create upcoming notes:** Creates non-existing upcoming notes without opening them.
- **Close notes:** Closes all daily note opened previously by the plugin.

![Demo](https://raw.githubusercontent.com/charliecm/obsidian-upcoming/main/demo.gif)

## How to Install

From inside Obsidian…
1. Go to Settings → **Community plugins**.
2. Disable **Safe mode**.
3. Click **Browse**, search for **Upcoming**, and click **Install**.
4. Click the toggle button to enable the plugin.

For manual installation, download this repo and copy over `main.js` and `manifest.json` to your vault: `VaultFolder/.obsidian/plugins/obsidian-upcoming/`.

## Development

1. Clone this repo.
2. `yarn` to install dependencies.
3. `yarn dev` to start compilation in watch mode.
4. `bash install-built.sh /path/to/your/vault -d` to create symbolic links of built files to your vault for quick development.

## Release

1. Run `yarn build`.
2. Bump version in `manifest.json` and `versions.json`.
3. Add changes in `CHANGELOG.md`.
4. Add a new release in Github with the changelog texts and the built `main.js` and `manifest.json` attached.

## Support

If you really like this plugin and want to support its development, please consider [buying me a coffee](https://www.buymeacoffee.com/charliecm) 🙂 Thanks!

<a href="https://www.buymeacoffee.com/charliecm" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" width="217" height="60" /></a>
