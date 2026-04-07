# Background Customizer

A Pengu Loader plugin to customize the League of Legends client with dynamic backgrounds. Built by [Erisu](https://github.com/ErisuGreyrat). Best used with my [Acrylic League Theme](https://github.com/ErisuGreyrat/acrylic-league-theme).

## Features

- Set backgrounds from champion skins, universes, skinlines, TFT companions, or custom-uploaded images and videos.
- Save favorite skins and create profiles for quick background switching.
- Randomize backgrounds or enable automatic shuffle cycling (10–300s intervals).
- Search and filter backgrounds by champion, universe, or skinline — jump to any group via the sidebar.
- Adjust opacity (0.1–1.0), transition duration (0.5–5s), and toggle centered splash or TFT content.
- Add custom backgrounds with support for JPG, PNG, GIF, and WebM formats (up to 50MB).
- Auto Clean Memory option that restarts the client UX when a game starts to flush accumulated GPU cache.
- Clean, League-inspired UI built with native Riot components, optimized for the Acrylic League Theme.

## Installation

1. Install [Pengu Loader](https://github.com/PenguLoader/PenguLoader).
2. Clone or download this repository:
   ```bash
   git clone https://github.com/ErisuGreyrat/Pengu-Background-Customizer.git
   ```
   Place `Background-Customizer-V2.js` in your Pengu Loader plugins folder (e.g., `C:\Users\YourName\AppData\Local\Pengu Loader\plugins\`).
3. Optionally, install the [Acrylic League Theme](https://github.com/ErisuGreyrat/acrylic-league-theme):
   ```bash
   git clone https://github.com/ErisuGreyrat/acrylic-league-theme.git
   ```
4. Launch League of Legends via Pengu Loader. Click the **BGC** button in the lobby header to open the customizer.

## Usage

- **Open**: In any lobby, click the **BGC** button in the top header bar to open the customizer.
- **Choose Background**: Browse or search skins by champion, universe, or skinline. Use the sidebar to jump to a group. Click any tile to set it as your background instantly.
- **Favorites**: Click the heart icon on any tile to favorite it. Use the toggle in the bottom bar to filter to favorites only.
- **Auto Shuffle**: Enable auto shuffle from the bottom bar to cycle backgrounds on a timer. Configure the interval in Settings.
- **Add Custom Background**: Go to the Custom Backgrounds tab and click **Add Custom Background** to upload a JPG, PNG, GIF (≤50MB), or WebM video (≤50MB).
- **Settings**: Click the cog icon to adjust opacity, transition duration, centered splash, TFT content, shuffle interval, and memory options.
- **Profiles**: Manage multiple background sets and switch between them instantly from the Profiles panel.
- **Guide**: Click the info icon next to the cog at any time to reopen the getting started guide.

## Compatibility

- **Pengu Loader**: Latest version.
- **League Client**: Tested on live client (2025).
- **Acrylic League Theme**: Recommended for enhanced visuals.
- **Data Source**: [Community Dragon](https://www.communitydragon.org/).

## Troubleshooting

- **No BGC button?** Ensure the plugin is in the correct folder and League is launched via Pengu Loader.
- **Backgrounds not loading?** Check your internet connection and make sure "Enable Background" is toggled on in settings.
- **Client feels slow after long sessions?** Use the **Manual Restart** button in the Memory section of settings, or enable **Auto Clean Memory** to do this automatically when a game starts.
- **Need help?** Open an [issue](https://github.com/ErisuGreyrat/Pengu-Background-Customizer/issues).

## Contributing

Fork the repo, create a branch, make changes, and submit a Pull Request.

## Credits

- **Developer**: [ErisuGreyrat](https://github.com/ErisuGreyrat)
- **Assets**: [Community Dragon](https://www.communitydragon.org/)

> This project was built with the help of Vibe Coding (AI-assisted development).

## License

MIT License. See [LICENSE](LICENSE).
