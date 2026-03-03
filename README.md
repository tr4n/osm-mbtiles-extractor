# OSM MBTiles Extractor

**OSM MBTiles Extractor** is an open-source, client-side browser tool that allows you to easily download and extract offline map data (MBTiles) completely locally, without needing to upload anything to a server.

## 🌟 Key Features

The tool provides two main features:

1. **Download Map**:
   - Offers a hierarchical list and a worldwide search tool to select specific regions (countries, cities, continents).
   - Easily download `.mbtiles` files generated from OpenStreetMap (OSM) data directly from MapTiler servers.
   - Supports interactive bounding box preview on the map before downloading.

2. **Extract by Zoom Level**:
   - Allows drag-and-drop or file selection of existing `.mbtiles` files from your computer.
   - Filters and removes map image data that falls outside the desired Minimum and Maximum zoom levels.
   - Helps create "Lite" map versions to save storage space on mobile devices or personal servers.

## 🚀 Technologies Used

This tool is designed to be fully client-side, processing heavy databases right in the user's browser:
- **[SQL.js (WebAssembly)](https://sql.js.org/)**: Used to parse and edit the SQLite/MBTiles database directly in browser RAM, exporting data at high speed.
- **[MapLibre GL JS](https://maplibre.org/)**: Provides spatial rendering and draws the preview boundary boxes for regional maps.
- **Tailwind CSS**: Ensures a professional, beautiful, and highly responsive user interface.

## 🛠 How to Use (Local & GitHub Pages)

### Run Online
Simply open the GitHub Pages link that points to the `index.html` file. The intuitive interface will guide you through the process.

## 💡 Hardware Considerations
Because the tool loads and interacts with an SQLite database entirely within the browser via WebAssembly, it relies heavily on your computer's RAM.
- **File Size**: It is recommended to compress `.mbtiles` files under **1GB to 2GB**. 
- **Processing Time**: The "Extract" feature may cause temporary browser freezing (from a few seconds up to a few minutes depending on file size) because the browser dedicates CPU power to the SQLite VACUUM optimization algorithm. Please be patient until the completion notification appears.
