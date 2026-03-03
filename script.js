        let areaMetadata = window.areaMetadata || null;
        let sqlPromise = null;
        let selectedFileMap = null;
        let originalFileName = "";
        let currentTab = 'region'; // 'file', 'region'
        let selectedRegion = null;
        let regionsData = []; // flattened version if needed, or structured tree
        let treeRendered = false;
        let previewMap = null;

        const dropzone = document.getElementById('dropzone');
        const fileInput = document.getElementById('fileInput');
        const processBtn = document.getElementById('processBtn');
        const statusContainer = document.getElementById('statusContainer');
        const statusLog = document.getElementById('statusLog');
        const outputName = document.getElementById('outputName');
        const dropzoneMainText = document.getElementById('dropzoneMainText');
        const dropzoneSubText = document.getElementById('dropzoneSubText');

        // Tabs
        const tabFile = document.getElementById('tabFile');
        const tabRegion = document.getElementById('tabRegion');
        const dropzoneContainer = document.getElementById('dropzoneContainer');
        const regionContainer = document.getElementById('regionContainer');

        // Region elements
        const regionTreeContainer = document.getElementById('regionTreeContainer');
        const regionSearchInput = document.getElementById('regionSearchInput');
        const selectedRegionText = document.getElementById('selectedRegionText');
        const regionLoading = document.getElementById('regionLoading');
        const regionDownloadSection = document.getElementById('regionDownloadSection');
        const regionDownloadBtn = document.getElementById('regionDownloadBtn');
        const configBox = document.getElementById('configBox');

        function updateTabStyles(activeTab) {
            [tabFile, tabRegion].forEach(tab => {
                if (tab === activeTab) {
                    tab.className = "flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-lg bg-white shadow-sm text-blue-600 transition-all border border-gray-200/30";
                } else {
                    tab.className = "flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-lg text-gray-500 hover:text-gray-700 hover:bg-white/50 transition-all";
                }
            });
        }

        tabFile.addEventListener('click', () => {
            currentTab = 'file';
            updateTabStyles(tabFile);
            dropzoneContainer.classList.remove('hidden');
            regionContainer.classList.add('hidden');
            configBox.classList.remove('hidden');
            processBtn.classList.remove('hidden');
            statusContainer.classList.add('hidden');
        });

        tabRegion.addEventListener('click', () => {
            currentTab = 'region';
            updateTabStyles(tabRegion);
            regionContainer.classList.remove('hidden');
            dropzoneContainer.classList.add('hidden');
            configBox.classList.add('hidden');
            processBtn.classList.add('hidden');
            statusContainer.classList.add('hidden');
            if (!treeRendered) renderTree();
        });

        function log(msg) {
            statusContainer.classList.remove('hidden');
            const time = new Date().toLocaleTimeString('vi-VN', { hour12: false });
            statusLog.innerHTML += `<span class="text-gray-500/80 mr-2">[${time}]</span><span class="text-blue-200">${msg}</span>\n`;
            statusLog.parentElement.scrollTop = statusLog.parentElement.scrollHeight;
            console.log(msg);
        }

        function clearLog() {
            statusLog.innerHTML = "";
            statusContainer.classList.add('hidden');
        }

        // Setup Drag & Drop
        dropzone.addEventListener('click', () => fileInput.click());
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('drag-active');
        });
        dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-active'));
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('drag-active');
            if (e.dataTransfer.files.length > 0) handleFileSelection(e.dataTransfer.files[0]);
        });
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) handleFileSelection(e.target.files[0]);
        });

        function handleFileSelection(file) {
            originalFileName = file.name;
            const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);

            // Cập nhật UI Dropzone
            dropzoneMainText.innerHTML = `<span class="text-blue-700 font-bold">${file.name}</span>`;
            dropzoneSubText.innerHTML = `<span class="inline-flex items-center px-2 py-1 rounded bg-blue-100/50 text-blue-700 mt-2 font-medium">Size: ${fileSizeMB} MB</span>`;
            dropzone.classList.add('bg-blue-50/50', 'border-blue-400');
            dropzone.classList.remove('bg-white/50');

            // Auto suggest output name
            updateOutputName();

            const reader = new FileReader();
            reader.onload = function () {
                selectedFileMap = new Uint8Array(reader.result);
            };
            reader.readAsArrayBuffer(file);
        }

        function updateOutputName() {
            let baseName = "map";
            if (currentTab === 'file' && originalFileName) {
                baseName = originalFileName.replace('.mbtiles', '');
            } else if (currentTab === 'region' && selectedRegion) {
                const parts = selectedRegion.name.split('/');
                baseName = parts[parts.length - 1];
            } else {
                let currentName = outputName.value;
                baseName = currentName.split('_')[0] || "map";
            }

            const minZ = document.getElementById('minZoom').value;
            const maxZ = document.getElementById('maxZoom').value;
            outputName.value = `${baseName}_${minZ}-${maxZ}.mbtiles`;
        }

        ['minZoom', 'maxZoom'].forEach(id => {
            document.getElementById(id).addEventListener('change', updateOutputName);
        });



        async function renderTree(filterText = '') {
            regionLoading.classList.remove('hidden');
            if (!areaMetadata) {
                try {
                    const res = await fetch('metadata.json');
                    areaMetadata = await res.json();
                } catch (err) {
                    console.error('Failed to load metadata.json:', err);
                    regionLoading.classList.add('hidden');
                    return;
                }
            }
            setTimeout(() => {
                let filteredMetadata = areaMetadata;
                if (filterText) {
                    filteredMetadata = filterTreeItem(areaMetadata, filterText.toLowerCase());
                    if (!filteredMetadata) {
                        document.getElementById('regionTreeContainer').innerHTML = '<div class="text-gray-500 text-sm italic py-4 text-center">No region found.</div>';
                        regionLoading.classList.add('hidden');
                        treeRendered = true;
                        return;
                    }
                }
                const treeHtml = createTreeHtml(filteredMetadata, '', filterText !== '');
                document.getElementById('regionTreeContainer').innerHTML = treeHtml;

                // Add click events to items
                document.querySelectorAll('.tree-item').forEach(item => {
                    item.addEventListener('click', (e) => {
                        e.stopPropagation();
                        // Remove active class from all
                        document.querySelectorAll('.tree-item').forEach(el => el.classList.remove('bg-blue-100', 'font-semibold'));
                        // Add active class to clicked
                        e.currentTarget.classList.add('bg-blue-100', 'font-semibold');

                        const name = e.currentTarget.dataset.name;
                        const title = e.currentTarget.dataset.title;
                        const path = e.currentTarget.dataset.path;
                        const bboxStr = e.currentTarget.dataset.bbox;
                        let bbox = [];
                        try { bbox = JSON.parse(bboxStr); } catch (err) { }

                        selectedRegion = { name: name, title: title, path: path, bbox: bbox };
                        selectedRegionText.innerHTML = `Selected: <span class="font-semibold text-blue-600">${path}</span> <span class="text-gray-400 font-mono text-xs">(${name})</span>`;

                        // Infer URL based on MapTiler's layout
                        const parts = name.split('/');
                        const mbaseUrl = "https://geodata.maptiler.download/extracts/osm/v3.11/2020-02-10";
                        let regionUrl = "";

                        if (parts.length === 1) {
                            if (parts[0] === 'planet') {
                                regionUrl = "https://geodata.maptiler.download/planets/osm/v3.11/maptiler-osm-2020-02-10-v3.11-planet.mbtiles";
                            } else {
                                regionUrl = `${mbaseUrl}/${parts[0]}/osm-2020-02-10-v3.11_${parts[0]}.mbtiles`;
                            }
                        } else if (parts.length >= 2) {
                            const continent = parts[0];
                            const parent = parts[parts.length - 2];
                            const child = parts[parts.length - 1];
                            regionUrl = `${mbaseUrl}/${continent}/osm-2020-02-10-v3.11_${parent}_${child}.mbtiles`;
                        }

                        regionDownloadSection.classList.remove('hidden');
                        // Because the file is cross-origin and lacks "Access-Control-Allow-Origin: *",
                        // we cannot fetch it via JS to enforce the filename. We must rely on the browser's native navigation.
                        // The user's browser may still rename the file to "download" depending on security settings.

                        regionDownloadBtn.classList.remove('pointer-events-none', 'opacity-50');
                        regionDownloadBtn.innerHTML = `
                            <svg class="w-5 h-5 mr-2 mt-[-2px] inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                            Click to download (${parts[parts.length - 1]})
                        `;

                        // Fix for Filename using local proxy:
                        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                            regionDownloadBtn.href = "/proxy/" + regionUrl;
                        } else {
                            regionDownloadBtn.href = regionUrl;
                        }

                        regionDownloadBtn.setAttribute('download', regionUrl.split('/').pop());

                        // Clean up any old onclick handler
                        regionDownloadBtn.onclick = null;

                        updateOutputName();

                        // Map display
                        if (bbox && bbox.length >= 4) {
                            const mapPreviewContainer = document.getElementById('mapPreviewContainer');
                            mapPreviewContainer.classList.remove('hidden');

                            if (!previewMap) {
                                previewMap = new maplibregl.Map({
                                    container: 'map',
                                    style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
                                    center: [0, 0],
                                    zoom: 1
                                });
                                previewMap.addControl(new maplibregl.NavigationControl(), 'top-right');
                            } else {
                                // Force resize if unhidden
                                setTimeout(() => previewMap.resize(), 100);
                            }

                            // Convert bbox from [minX, minY, maxX, maxY] to [[minX, minY], [maxX, maxY]]
                            const bounds = [
                                [parseFloat(bbox[0]), parseFloat(bbox[1])],
                                [parseFloat(bbox[2]), parseFloat(bbox[3])]
                            ];

                            previewMap.fitBounds(bounds, {
                                padding: 20,
                                duration: 1000
                            });
                        }
                    });
                });

                // Add click events for expand/collapse toggles
                document.querySelectorAll('.toggle-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const childrenContainer = e.currentTarget.parentElement.nextElementSibling;
                        const icon = e.currentTarget;
                        if (childrenContainer && childrenContainer.classList.contains('pl-4')) {
                            if (childrenContainer.classList.contains('hidden')) {
                                childrenContainer.classList.remove('hidden');
                                icon.innerHTML = `
                                    <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                    </svg>
                                `;
                            } else {
                                childrenContainer.classList.add('hidden');
                                icon.innerHTML = `
                                    <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                                    </svg>
                                `;
                            }
                        }
                    });
                });

                regionLoading.classList.add('hidden');
                treeRendered = true;
            }, 10);
        }

        function createTreeHtml(node, parentPath = "", forceExpand = false) {
            const currentPath = parentPath ? `${parentPath} > ${node.title}` : node.title;
            let html = `<div class="select-none">`;

            const hasChildren = node.children && node.children.length > 0;
            const isClickable = !!node.name;

            html += `
                <div class="flex items-center py-1 hover:bg-gray-50 rounded">
                    ${hasChildren ? `
                        <button class="toggle-btn w-6 h-6 flex items-center justify-center focus:outline-none">
                            ${node.name === 'planet' || forceExpand ? `
                                <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                </svg>
                            ` : `
                                <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                                </svg>
                            `}
                        </button>
                    ` : `<div class="w-6"></div>`}
                    
                    <div class="${isClickable ? 'cursor-pointer hover:text-blue-600 tree-item flex-1 px-1 rounded' : 'text-gray-700 font-semibold px-1'}" 
                         ${isClickable ? `data-name="${node.name}" data-title="${node.title}" data-path="${currentPath}" data-bbox='${JSON.stringify(node.bbox || [])}'` : ''}>
                        ${node.title}
                    </div>
                </div>
            `;

            if (hasChildren) {
                html += `<div class="pl-4 ${node.name === 'planet' || forceExpand ? '' : 'hidden'} border-l border-gray-200 ml-3">`;
                node.children.forEach(child => {
                    html += createTreeHtml(child, currentPath, forceExpand);
                });
                html += `</div>`;
            }

            html += `</div>`;
            return html;
        }

        function filterTreeItem(node, filterText) {
            const titleMatch = node.title && node.title.toLowerCase().includes(filterText);
            const nameMatch = node.name && node.name.toLowerCase().includes(filterText);

            if (titleMatch || nameMatch) {
                return node;
            }

            if (node.children && node.children.length > 0) {
                const filteredChildren = [];
                for (const child of node.children) {
                    const filteredChild = filterTreeItem(child, filterText);
                    if (filteredChild) {
                        filteredChildren.push(filteredChild);
                    }
                }

                if (filteredChildren.length > 0) {
                    return { ...node, children: filteredChildren };
                }
            }

            return null;
        }

        regionSearchInput.addEventListener('input', (e) => {
            renderTree(e.target.value.trim());
        });

        // Initialize SQL.js
        async function getSQL() {
            if (!sqlPromise) {
                sqlPromise = initSqlJs({
                    locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
                });
            }
            return await sqlPromise;
        }

        async function downloadFromURL(url) {
            log(`Downloading file from Link: <a href="${url}" class="text-blue-400 hover:text-blue-300 hover:underline" target="_blank">${url}</a>`);
            log(`Please wait... time depends on your network speed.`);

            const response = await fetch(url);
            if (!response.ok) throw new Error("Cannot download! Please check the Link or server CORS Policy: " + response.statusText);

            const buffer = await response.arrayBuffer();
            selectedFileMap = new Uint8Array(buffer);
            originalFileName = url.substring(url.lastIndexOf('/') + 1) || "download.mbtiles";

            log(`File downloaded successfully. Size: <span class="text-green-300 font-bold">${(selectedFileMap.length / 1024 / 1024).toFixed(2)} MB</span>`);
        }

        processBtn.addEventListener('click', async () => {
            clearLog();
            const minZoom = parseInt(document.getElementById('minZoom').value);
            const maxZoom = parseInt(document.getElementById('maxZoom').value);
            const finalFilename = document.getElementById('outputName').value || 'lite.mbtiles';

            if (currentTab === 'file' && !selectedFileMap) {
                alert("You haven't selected a file yet!");
                return;
            }
            if (currentTab === 'region' && !selectedRegion) {
                alert("You haven't selected any region!");
                return;
            }

            if (minZoom > maxZoom) {
                alert("Logic Error: Minimum zoom cannot be greater than maximum zoom!");
                return;
            }

            processBtn.disabled = true;
            const originalBtnHTML = processBtn.innerHTML;
            processBtn.innerHTML = `
                <span class="relative flex items-center justify-center">
                    <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    PROCESSING DATA...
                </span>
            `;

            setTimeout(async () => {
                try {
                    if (currentTab !== 'file') {
                        // Update name if not automatically changed before
                        let baseName = "";
                        if (currentTab === 'region') {
                            const parts = selectedRegion.name.split('/');
                            baseName = parts[parts.length - 1];
                        }
                        if (document.getElementById('outputName').value === 'extracted_lite.mbtiles' || document.getElementById('outputName').value.includes('download_')) {
                            document.getElementById('outputName').value = `${baseName}_${minZoom}-${maxZoom}.mbtiles`;
                        }
                    }

                    log("Initializing WebAssembly SQL Engine...");
                    const SQL = await getSQL();

                    log("Allocating Database to virtual RAM...");
                    const dbData = new Uint8Array(selectedFileMap);
                    const db = new SQL.Database(dbData);

                    let hasMap = false;
                    try {
                        const res = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='map'");
                        if (res.length > 0 && res[0].values.length > 0) hasMap = true;
                    } catch (e) { }

                    log(`DB Structure format: <span class="text-amber-300">${hasMap ? 'Deduplicated (map + images tables)' : 'Flat (independent tiles table)'}</span>`);
                    log(`Sweeping maps NOT in zoom bounds <span class="text-purple-300 font-bold">[${minZoom} ➡️ ${maxZoom}]</span>...`);

                    if (hasMap) {
                        db.run(`DELETE FROM map WHERE zoom_level < ${minZoom} OR zoom_level > ${maxZoom}`);
                        log("Cleaning up orphaned images due to lost map table links...");
                        db.run(`DELETE FROM images WHERE tile_id NOT IN (SELECT tile_id FROM map)`);
                    } else {
                        db.run(`DELETE FROM tiles WHERE zoom_level < ${minZoom} OR zoom_level > ${maxZoom}`);
                    }

                    log("Editing Metadata declarations...");
                    try {
                        db.run(`UPDATE metadata SET value = value || ' Lite' WHERE name = 'name'`);
                        db.run(`INSERT OR REPLACE INTO metadata (name, value) VALUES ('minzoom', '${minZoom}')`);
                        db.run(`INSERT OR REPLACE INTO metadata (name, value) VALUES ('maxzoom', '${maxZoom}')`);
                    } catch (e) {
                        log(`<span class="text-amber-400">Warning: Cannot update detailed metadata due to divergent table structure, but map data remains safe.</span>`);
                    }

                    log("Executing VACUUM to optimize and compress file size (may take some time)...");
                    db.run("VACUUM");

                    log("Packaging newly generated database...");
                    const exportedData = db.export();
                    db.close();

                    log(`✅ EXTRACTION COMPLETE. Output size: <span class="text-green-400 font-bold bg-green-900/30 px-1 rounded">${(exportedData.length / 1024 / 1024).toFixed(2)} MB</span>`);

                    log("Activating download process...");
                    const blob = new Blob([exportedData], { type: 'application/x-sqlite3' });
                    const downloadUrl = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = downloadUrl;
                    link.download = document.getElementById('outputName').value || 'lite.mbtiles';
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    window.URL.revokeObjectURL(downloadUrl);

                    log(`<div class="bg-green-500/10 border border-green-500/30 text-green-400 p-2 mt-2 rounded">🎉 Successfully downloaded file: <b>${link.download}</b></div>`);

                } catch (error) {
                    log(`<div class="bg-red-500/10 border border-red-500/30 text-red-400 p-2 mt-2 rounded"><b>❌ AN ERROR OCCURRED:</b><br/>${error.message}</div>`);
                    console.error(error);
                } finally {
                    processBtn.disabled = false;
                    processBtn.innerHTML = originalBtnHTML;
                }
            }, 100);
        });

        document.addEventListener('DOMContentLoaded', () => {
            if (currentTab === 'region' && !treeRendered) renderTree();
        });
