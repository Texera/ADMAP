// ── DOM Element References ──
// Centralises all getElementById / querySelector calls.
// ES modules with type="module" are deferred, so the DOM is ready at evaluation.

// Main gallery views
export const foldersView = document.getElementById("foldersView");
export const imagesView = document.getElementById("imagesView");
export const titleEl = document.getElementById("title");
export const subtitleEl = document.getElementById("subtitle");
export const crumbsEl = document.getElementById("crumbs");
export const backBtn = document.getElementById("backBtn");
export const viewSwitcher = document.getElementById("viewSwitcher");
export const viewText = document.getElementById("viewText");

// Lightbox
export const lb = document.getElementById("lightbox");
export const lbImg = document.getElementById("lbImg");
export const lbImgWrapper = document.getElementById("lbImgWrapper");
export const lbTitle = document.getElementById("lbTitle");
export const lbClose = document.getElementById("lbClose");
export const lbHideToolbar = document.getElementById("lbHideToolbar");
export const toolbarRestoreIndicator = document.getElementById("toolbarRestoreIndicator");
export const toolbarGapOverlay = document.getElementById("toolbarGapOverlay");
export const lbTop = document.getElementById("lb-top") || document.querySelector(".lb-top");
export const lbStage = document.querySelector(".lb-stage");
export const lbPrev = document.getElementById("lbPrev");
export const lbNext = document.getElementById("lbNext");
export const lbCounter = document.getElementById("lbCounter");
export const zoomDisplay = document.getElementById("zoomDisplay");
export const metadataToggle = document.getElementById("metadataToggle");
export const gestureHint = document.getElementById("gestureHint");
export const swapFolderBtn = document.getElementById("swapFolderBtn");
export const pageSwapBtn = document.getElementById("pageSwapBtn");

// Brain template panel
export const brainTemplatePanel = document.getElementById("brainTemplatePanel");
export const brainTemplateToggle = document.getElementById("brainTemplateToggle");
export const brainPositionDisplay = document.getElementById("brainPositionDisplay");
export const atlasRegionInfo = document.getElementById("atlasRegionInfo");
export const atlasPanelTitle = document.getElementById("atlasPanelTitle");
export const atlasBrainImage = document.getElementById("atlasBrainImage");
export const atlasCanvas = document.getElementById("atlasCanvas");
export const ccfSliceImage = document.getElementById("ccfSliceImage");
export const atlasBackBtn = document.getElementById("atlasBackBtn");

// Regions overlay
export const regionsOverlayCanvas = document.getElementById("regionsOverlayCanvas");
export const regionsOverlayToggle = document.getElementById("regionsOverlayToggle");
export const regionTooltip = document.getElementById("regionTooltip");
export const regionTooltipName = document.getElementById("regionTooltipName");
export const regionTooltipDetails = document.getElementById("regionTooltipDetails");

// Channel controls
export const channelControls = document.getElementById("channelControls");
export const redSlider = document.getElementById("redSlider");
export const greenSlider = document.getElementById("greenSlider");
export const blueSlider = document.getElementById("blueSlider");
export const gainSlider = document.getElementById("gainSlider");
export const redValue = document.getElementById("redValue");
export const greenValue = document.getElementById("greenValue");
export const blueValue = document.getElementById("blueValue");
export const gainValue = document.getElementById("gainValue");
export const resetChannels = document.getElementById("resetChannels");
export const grayscaleToggle = document.getElementById("grayscaleToggle");
export const channelLegendToggle = document.getElementById("channelLegendToggle");
export const channelLegend = document.getElementById("channelLegend");

// Metadata panel
export const metadataPanel = document.getElementById("metadataPanel");
export const metadataCloseBtn = document.getElementById("metadataCloseBtn");
export const atlasCloseBtn = document.getElementById("atlasCloseBtn");
export const biologicalMetadata = document.getElementById("biologicalMetadata");
export const metaDimensions = document.getElementById("metaDimensions");
export const metaFileSize = document.getElementById("metaFileSize");
export const metaFormat = document.getElementById("metaFormat");
export const metaModified = document.getElementById("metaModified");
export const metaZoom = document.getElementById("metaZoom");

// README & video modals
export const readmeBtn = document.getElementById("readmeBtn");
export const readmeModal = document.getElementById("readmeModal");
export const readmeModalClose = document.getElementById("readmeModalClose");
export const videoBtn = document.getElementById("videoBtn");
export const videoModal = document.getElementById("videoModal");
export const videoModalClose = document.getElementById("videoModalClose");
export const tutorialVideo = document.getElementById("tutorialVideo");

// Experiment metadata fields
export const biologicalMetadataTitle = document.getElementById("biologicalMetadataTitle");
export const metaMouseId = document.getElementById("metaMouseId");
export const metaGenotype = document.getElementById("metaGenotype");
export const metaEnhancer = document.getElementById("metaEnhancer");
export const metaVirus = document.getElementById("metaVirus");
export const metaVirusLabel = document.getElementById("metaVirusLabel");
export const metaValidationMethod = document.getElementById("metaValidationMethod");
export const metaInfection = document.getElementById("metaInfection");
export const metaMOI = document.getElementById("metaMOI");
export const metaIncubation = document.getElementById("metaIncubation");

// Metadata row elements (for toggling visibility)
export const metaMouseIdRow = document.getElementById("metaMouseIdRow");
export const metaGenotypeRow = document.getElementById("metaGenotypeRow");
export const metaEnhancerRow = document.getElementById("metaEnhancerRow");
export const metaVirusRow = document.getElementById("metaVirusRow");
export const metaTargetedCellsRow = document.getElementById("metaTargetedCellsRow");
export const metaValidationMethodRow = document.getElementById("metaValidationMethodRow");
export const metaInfectionRow = document.getElementById("metaInfectionRow");
export const metaMOIRow = document.getElementById("metaMOIRow");
export const metaIncubationRow = document.getElementById("metaIncubationRow");
