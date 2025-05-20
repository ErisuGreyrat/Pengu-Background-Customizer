/**
 * @name Background-Customizer
 * @author Erisu
 * @link https://github.com/ErisuGreyrat
 */

let uiVisible = false;
let debounceTimeout;
let skinData = [];
let universeData = [];
let skinLineData = [];
let tftData = [];
let previewGroups = [];
let backgroundEnabled = true;
let currentOpacity = 0.3;
let storedOpacity = currentOpacity;
let persistBackground = false;
let centeredSplash = true;
let settingsVisible = false;
let cycleShuffleEnabled = false;
let cycleInterval = 30;
let currentSearchQuery = "";
let shuffleCycleIntervalId = null;
let transitionDuration = 0.5;
let lastAppliedUrl = null;
let skinProfiles = [];
let activeProfile = null;
let isInitialLoad = true;
let debugMode = false; // Debug mode toggle for conditional logging

/**
 * Conditional logging function that only outputs messages when debug mode is enabled
 * @param {string} message - The message to log
 * @param {any} [data] - Optional data to log alongside the message
 * @param {'log'|'warn'|'error'|'info'} [type='log'] - Type of console method to use
 */
function debugLog(message, data, type = "log") {
  if (!debugMode) return;

  if (data !== undefined) {
    console[type](`[BGC Debug] ${message}`, data);
  } else {
    console[type](`[BGC Debug] ${message}`);
  }
}

function isDataStoreAvailable() {
  return window.DataStore !== undefined;
}

function saveSettings() {
  try {
    const configData = {
      backgroundEnabled,
      currentOpacity: storedOpacity,
      persistBackground,
      centeredSplash,
      cycleShuffleEnabled,
      cycleInterval,
      transitionDuration,
      skinProfiles,
      activeProfile,
      debugMode,
      savedAt: new Date().toISOString(),
    };
    if (isDataStoreAvailable()) {
      DataStore.set("dynamicBg_config", configData);
      debugLog("Settings saved", configData);
    } else {
      debugLog("DataStore API not available", null, "error");
    }
  } catch (error) {
    debugLog("Failed to save settings:", error, "error");
  }
}

function loadSavedSettings() {
  try {
    if (isDataStoreAvailable()) {
      const config = DataStore.get("dynamicBg_config");
      if (config) {
        backgroundEnabled =
          config.backgroundEnabled !== undefined
            ? config.backgroundEnabled
            : true;
        storedOpacity =
          config.currentOpacity !== undefined
            ? parseFloat(config.currentOpacity)
            : 0.3;
        currentOpacity = storedOpacity;
        persistBackground =
          config.persistBackground !== undefined
            ? config.persistBackground
            : false;
        centeredSplash =
          config.centeredSplash !== undefined ? config.centeredSplash : true;
        cycleShuffleEnabled =
          config.cycleShuffleEnabled !== undefined
            ? config.cycleShuffleEnabled
            : false;
        cycleInterval =
          config.cycleInterval !== undefined
            ? parseInt(config.cycleInterval)
            : 30;
        transitionDuration =
          config.transitionDuration !== undefined
            ? parseFloat(config.transitionDuration)
            : 0.5;
        skinProfiles =
          config.skinProfiles !== undefined ? config.skinProfiles : [];
        activeProfile =
          config.activeProfile !== undefined ? config.activeProfile : null;
        debugMode = config.debugMode !== undefined ? config.debugMode : false;

        debugLog("Loaded settings", {
          backgroundEnabled,
          currentOpacity: storedOpacity,
          persistBackground,
          centeredSplash,
          cycleShuffleEnabled,
          cycleInterval,
          transitionDuration,
          skinProfiles,
          activeProfile,
          debugMode,
          savedAt: config.savedAt,
        });
        return true;
      }
    }
    debugLog("No saved settings, using defaults");
    return false;
  } catch (error) {
    debugLog("Failed to load settings:", error, "error");
    return false;
  }
}

function preloadImage(url) {
  return new Promise((resolve) => {
    if (!url) return resolve();
    const img = new Image();
    img.src = url;
    img.onload = resolve;
    img.onerror = () => {
      debugLog(`Failed to preload image: ${url}`, null, "warn");
      resolve();
    };
  });
}

function preloadVideo(url) {
  return new Promise((resolve) => {
    if (!url) return resolve();
    const video = document.createElement("video");
    video.src = url;
    video.preload = "auto";
    video.onloadeddata = resolve;
    video.onerror = () => {
      debugLog(`Failed to preload video: ${url}`, null, "warn");
      resolve();
    };
  });
}

async function applyBackground(item) {
  const viewport = document.getElementById("rcp-fe-viewport-root");
  if (!viewport || !item || !backgroundEnabled) {
    removeBackground();
    return;
  }

  debugLog(
    `Applying background for ${item.name} with opacity: ${currentOpacity}`
  );

  const splashUrl = centeredSplash
    ? item.splashPath || item.backgroundTextureLCU || item.uncenteredSplashPath
    : item.uncenteredSplashPath || item.splashPath || item.backgroundTextureLCU;

  if (splashUrl === lastAppliedUrl) {
    const bgContainer = document.getElementById("client-bg-container");
    if (bgContainer) {
      const currentLayer = bgContainer.querySelector(
        ".client-bg-layer:last-child"
      );
      if (
        currentLayer &&
        parseFloat(currentLayer.style.opacity) !== currentOpacity
      ) {
        currentLayer.style.opacity = currentOpacity;
        debugLog(
          `Updated opacity to ${currentOpacity} for unchanged background: ${item.name}`
        );
      }
    }
    return;
  }

  // Preload based on file type
  const isVideo = splashUrl.toLowerCase().endsWith(".webm");
  if (isVideo) {
    await preloadVideo(splashUrl);
  } else {
    await preloadImage(splashUrl);
  }

  let bgContainer = document.getElementById("client-bg-container");
  if (!bgContainer) {
    bgContainer = document.createElement("div");
    bgContainer.id = "client-bg-container";
    bgContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -1;
        `;
    viewport.appendChild(bgContainer);
    viewport.classList.add("custom-background");
  }

  const existingLayers = bgContainer.querySelectorAll(".client-bg-layer");
  if (existingLayers.length > 1) {
    existingLayers.forEach((layer, index) => {
      if (index < existingLayers.length - 1) {
        layer.remove();
        debugLog(
          `Removed excess layer: ${
            layer.tagName === "VIDEO" ? layer.src : layer.style.backgroundImage
          }`
        );
      }
    });
  }

  let newBg;
  if (isVideo) {
    newBg = document.createElement("video");
    newBg.className = "client-bg-layer";
    newBg.src = splashUrl;
    newBg.loop = true;
    newBg.muted = true;
    newBg.autoplay = true;
    newBg.playsInline = true;
    newBg.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: center;
            opacity: 0;
            transition: opacity ${transitionDuration}s ease;
        `;
    // Ensure video loads
    newBg.onloadeddata = () => {
      debugLog(`Video loaded successfully: ${splashUrl}`);
      newBg.style.opacity = currentOpacity;
    };
    newBg.onerror = () => {
      debugLog(`Failed to load video: ${splashUrl}`, null, "error");
      newBg.remove();
      removeBackground();
    };
  } else {
    newBg = document.createElement("div");
    newBg.className = "client-bg-layer";
    newBg.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: url('${splashUrl}');
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            opacity: 0;
            transition: opacity ${transitionDuration}s ease;
        `;
  }

  bgContainer.appendChild(newBg);

  let styleElement = document.getElementById("client-bg-style");
  if (!styleElement) {
    styleElement = document.createElement("style");
    styleElement.id = "client-bg-style";
    document.head.appendChild(styleElement);
  }
  styleElement.textContent = `
        .custom-background {
            position: relative;
        }
        .client-bg-layer {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            transition: opacity ${transitionDuration}s ease;
        }
        .client-bg-layer video {
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: center;
        }
    `;

  newBg.offsetHeight; // Force reflow

  if (!isVideo) {
    newBg.style.opacity = currentOpacity;
  }

  const oldBg = bgContainer.querySelector(".client-bg-layer:not(:last-child)");
  if (oldBg) {
    oldBg.style.opacity = 0;
    setTimeout(() => {
      if (oldBg.parentNode) {
        oldBg.remove();
        debugLog(
          `Cleaned up old layer: ${
            oldBg.tagName === "VIDEO" ? oldBg.src : oldBg.style.backgroundImage
          }`
        );
      }
    }, transitionDuration * 1000 + 100);
  }

  lastAppliedUrl = splashUrl;
  debugLog(
    `Background applied: ${item.name}, URL: ${splashUrl}, Type: ${
      isVideo ? "video" : "image"
    }, Opacity: ${currentOpacity}, Transition: ${transitionDuration}s`
  );
}

function removeBackground() {
  const viewport = document.getElementById("rcp-fe-viewport-root");
  if (viewport && viewport.classList.contains("custom-background")) {
    const bgContainer = document.getElementById("client-bg-container");
    if (bgContainer) {
      const layers = bgContainer.querySelectorAll(".client-bg-layer");
      layers.forEach((layer) => {
        layer.style.opacity = 0;
        setTimeout(() => {
          if (layer.parentNode) {
            layer.remove();
            debugLog(
              `Removed layer during reset: ${
                layer.tagName === "VIDEO"
                  ? layer.src
                  : layer.style.backgroundImage
              }`
            );
          }
        }, transitionDuration * 1000 + 100);
      });
      setTimeout(() => {
        if (bgContainer.parentNode) {
          bgContainer.remove();
          debugLog("Removed background container");
        }
      }, transitionDuration * 1000 + 100);
    }
    viewport.classList.remove("custom-background");
    lastAppliedUrl = null;
    debugLog("Background fully removed");
  }
}

function updatePlaceholderInvitedContainer() {
  if (!backgroundEnabled) {
    // If background is disabled, ensure placeholder container is visible
    const placeholderContainers = document.querySelectorAll(
      ".placeholder-invited-container"
    );
    placeholderContainers.forEach((container) => {
      if (
        container.querySelector(
          'video[src*="/fe/lol-parties/parties-v2/invited-banner.webm"]'
        )
      ) {
        container.style.display = "";
        debugLog("Restored placeholder invited container visibility");
      }
    });
    return;
  }

  // If background is enabled, hide placeholder container
  const placeholderContainers = document.querySelectorAll(
    ".placeholder-invited-container"
  );
  placeholderContainers.forEach((container) => {
    if (
      container.querySelector(
        'video[src*="/fe/lol-parties/parties-v2/invited-banner.webm"]'
      )
    ) {
      container.style.display = "none";
      debugLog("Hidden placeholder invited container");
    }
  });
}

function setupPlaceholderContainerObserver() {
  const partiesScreen = document.querySelector(
    '[data-screen-name="rcp-fe-lol-parties"]'
  );
  if (!partiesScreen) {
    debugLog(
      "Parties screen not found for placeholder container observer setup"
    );
    return;
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        const placeholderAdded = Array.from(mutation.addedNodes).some(
          (node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              return (
                node.classList?.contains("placeholder-invited-container") ||
                node.querySelector?.(".placeholder-invited-container")
              );
            }
            return false;
          }
        );

        if (placeholderAdded) {
          debugLog("Placeholder invited container added to DOM");
          updatePlaceholderInvitedContainer();
          break;
        }
      }
    }
  });

  observer.observe(partiesScreen, {
    childList: true,
    subtree: true,
  });

  debugLog("Placeholder container observer set up");
}

function checkAndApplyBackground() {
  const viewport = document.getElementById("rcp-fe-viewport-root");
  if (!viewport) return;

  const partiesScreen = document.querySelector(
    '[data-screen-name="rcp-fe-lol-parties"]'
  );
  const activityCenterScreen = document.querySelector(
    '.screen-root.active[data-screen-name="rcp-fe-lol-activity-center"]'
  );
  const postgameScreen = document.querySelector(
    '.screen-root[data-screen-name="rcp-fe-lol-postgame"]'
  );
  const profilesMainScreen = document.querySelector(
    '.screen-root[data-screen-name="rcp-fe-lol-profiles-main"]'
  );
  const savedItem = DataStore.get("selectedSkin");

  if (
    (activityCenterScreen &&
      getComputedStyle(activityCenterScreen).opacity === "1") ||
    (postgameScreen && getComputedStyle(postgameScreen).opacity === "1") ||
    (profilesMainScreen && getComputedStyle(profilesMainScreen).opacity === "1")
  ) {
    currentOpacity = 0;
  } else {
    currentOpacity = storedOpacity;
  }

  if (backgroundEnabled && savedItem && (partiesScreen || persistBackground)) {
    applyBackground(savedItem);
    updatePlaceholderInvitedContainer();
  } else {
    removeBackground();
    updatePlaceholderInvitedContainer();
  }
}

function setupActivityCenterObserver() {
  const activityCenterScreen = document.querySelector(
    '.screen-root.active[data-screen-name="rcp-fe-lol-activity-center"]'
  );
  if (!activityCenterScreen) {
    debugLog("Activity center not found for observer setup");
    return;
  }

  const observer = new MutationObserver(() => {
    checkAndApplyBackground();
  });

  observer.observe(activityCenterScreen, {
    attributes: true,
    attributeFilter: ["style", "class"],
  });

  debugLog("Activity center observer set up");
}

function setupProfilesMainObserver() {
  const profilesMainScreen = document.querySelector(
    '.screen-root[data-screen-name="rcp-fe-lol-profiles-main"]'
  );
  if (!profilesMainScreen) {
    debugLog("Profiles main screen not found for observer setup");
    return;
  }

  const observer = new MutationObserver(() => {
    checkAndApplyBackground();
  });

  observer.observe(profilesMainScreen, {
    attributes: true,
    attributeFilter: ["style", "class"],
  });

  debugLog("Profiles main screen observer set up");
}

function setupPostgameObserver() {
  const postgameScreen = document.querySelector(
    '.screen-root[data-screen-name="rcp-fe-lol-postgame"]'
  );
  if (!postgameScreen) {
    debugLog("Postgame screen not found for observer setup");
    return;
  }

  const observer = new MutationObserver(() => {
    checkAndApplyBackground();
  });

  observer.observe(postgameScreen, {
    attributes: true,
    attributeFilter: ["style", "class"],
  });

  debugLog("Postgame screen observer set up");
}

window.addEventListener("load", () => {
  debugLog("Pengu Loader Client Background Customizer plugin loading...");
  setupActivityCenterObserver();
  setupProfilesMainObserver();
  setupPostgameObserver();
  setupPlaceholderContainerObserver();
  loadSavedSettings();

  debugLog("Debug mode is " + (debugMode ? "enabled" : "disabled"));

  Promise.allSettled([
    fetch(
      "https://raw.communitydragon.org/pbe/plugins/rcp-be-lol-game-data/global/default/v1/skins.json"
    )
      .then((response) => {
        if (!response.ok)
          throw new Error(`HTTP error! Status: ${response.status}`);
        return response.json();
      })
      .then((data) => {
        skinData = Object.values(data).flatMap((skin) => {
          const cleanPath = (path) =>
            path
              ? path
                  .replace(/^\/lol-game-data\/assets\/ASSETS\//i, "")
                  .toLowerCase()
              : "";
          const baseSkin = {
            ...skin,
            tilePath: cleanPath(skin.tilePath)
              ? `https://raw.communitydragon.org/pbe/plugins/rcp-be-lol-game-data/global/default/assets/${cleanPath(
                  skin.tilePath
                )}`
              : "",
            splashPath: cleanPath(skin.splashPath)
              ? `https://raw.communitydragon.org/pbe/plugins/rcp-be-lol-game-data/global/default/assets/${cleanPath(
                  skin.splashPath
                )}`
              : "",
            uncenteredSplashPath: cleanPath(skin.uncenteredSplashPath)
              ? `https://raw.communitydragon.org/pbe/plugins/rcp-be-lol-game-data/global/default/assets/${cleanPath(
                  skin.uncenteredSplashPath
                )}`
              : "",
            splashVideoPath: cleanPath(skin.splashVideoPath)
              ? `https://raw.communitydragon.org/pbe/plugins/rcp-be-lol-game-data/global/default/assets/${cleanPath(
                  skin.splashVideoPath
                )}`
              : "",
            collectionSplashVideoPath: cleanPath(skin.collectionSplashVideoPath)
              ? `https://raw.communitydragon.org/pbe/plugins/rcp-be-lol-game-data/global/default/assets/${cleanPath(
                  skin.collectionSplashVideoPath
                )}`
              : "",
          };
          const skins = [baseSkin];

          // Add animated version if video paths exist
          if (skin.splashVideoPath || skin.collectionSplashVideoPath) {
            skins.push({
              ...skin,
              id: `${skin.id}-animated`,
              name: `${skin.name} Animated`,
              tilePath: cleanPath(skin.tilePath)
                ? `https://raw.communitydragon.org/pbe/plugins/rcp-be-lol-game-data/global/default/assets/${cleanPath(
                    skin.tilePath
                  )}`
                : "",
              splashPath: cleanPath(skin.splashVideoPath)
                ? `https://raw.communitydragon.org/pbe/plugins/rcp-be-lol-game-data/global/default/assets/${cleanPath(
                    skin.splashVideoPath
                  )}`
                : "",
              uncenteredSplashPath: cleanPath(skin.collectionSplashVideoPath)
                ? `https://raw.communitydragon.org/pbe/plugins/rcp-be-lol-game-data/global/default/assets/${cleanPath(
                    skin.collectionSplashVideoPath
                  )}`
                : "",
              splashVideoPath: cleanPath(skin.splashVideoPath)
                ? `https://raw.communitydragon.org/pbe/plugins/rcp-be-lol-game-data/global/default/assets/${cleanPath(
                    skin.splashVideoPath
                  )}`
                : "",
              collectionSplashVideoPath: cleanPath(
                skin.collectionSplashVideoPath
              )
                ? `https://raw.communitydragon.org/pbe/plugins/rcp-be-lol-game-data/global/default/assets/${cleanPath(
                    skin.collectionSplashVideoPath
                  )}`
                : "",
              isAnimated: true,
            });
          }

          // Handle quest skin tiers, skipping the first tier
          if (skin.questSkinInfo && skin.questSkinInfo.tiers) {
            skin.questSkinInfo.tiers.forEach((tier, index) => {
              if (index === 0) return; // Skip the first tier to avoid duplicate with base skin
              if (tier.tilePath && tier.splashPath) {
                const tierSkin = {
                  ...skin,
                  id: tier.id || `${skin.id}-${tier.stage}`,
                  name: tier.name || `${skin.name} Stage ${tier.stage}`,
                  tilePath: cleanPath(tier.tilePath)
                    ? `https://raw.communitydragon.org/pbe/plugins/rcp-be-lol-game-data/global/default/assets/${cleanPath(
                        tier.tilePath
                      )}`
                    : "",
                  splashPath: cleanPath(tier.splashPath)
                    ? `https://raw.communitydragon.org/pbe/plugins/rcp-be-lol-game-data/global/default/assets/${cleanPath(
                        tier.splashPath
                      )}`
                    : "",
                  uncenteredSplashPath: cleanPath(tier.uncenteredSplashPath)
                    ? `https://raw.communitydragon.org/pbe/plugins/rcp-be-lol-game-data/global/default/assets/${cleanPath(
                        tier.uncenteredSplashPath
                      )}`
                    : "",
                  splashVideoPath: cleanPath(tier.splashVideoPath)
                    ? `https://raw.communitydragon.org/pbe/plugins/rcp-be-lol-game-data/global/default/assets/${cleanPath(
                        tier.splashVideoPath
                      )}`
                    : "",
                  collectionSplashVideoPath: cleanPath(
                    tier.collectionSplashVideoPath
                  )
                    ? `https://raw.communitydragon.org/pbe/plugins/rcp-be-lol-game-data/global/default/assets/${cleanPath(
                        tier.collectionSplashVideoPath
                      )}`
                    : "",
                  stage: tier.stage,
                };
                skins.push(tierSkin);

                // Add animated version for tier if video paths exist
                if (tier.splashVideoPath || tier.collectionSplashVideoPath) {
                  skins.push({
                    ...skin,
                    id: tier.id
                      ? `${tier.id}-animated`
                      : `${skin.id}-${tier.stage}-animated`,
                    name: tier.name
                      ? `${tier.name} Animated`
                      : `${skin.name} Stage ${tier.stage} Animated`,
                    tilePath: cleanPath(tier.tilePath)
                      ? `https://raw.communitydragon.org/pbe/plugins/rcp-be-lol-game-data/global/default/assets/${cleanPath(
                          tier.tilePath
                        )}`
                      : "",
                    splashPath: cleanPath(tier.splashVideoPath)
                      ? `https://raw.communitydragon.org/pbe/plugins/rcp-be-lol-game-data/global/default/assets/${cleanPath(
                          tier.splashVideoPath
                        )}`
                      : "",
                    uncenteredSplashPath: cleanPath(
                      tier.collectionSplashVideoPath
                    )
                      ? `https://raw.communitydragon.org/pbe/plugins/rcp-be-lol-game-data/global/default/assets/${cleanPath(
                          tier.collectionSplashVideoPath
                        )}`
                      : "",
                    splashVideoPath: cleanPath(tier.splashVideoPath)
                      ? `https://raw.communitydragon.org/pbe/plugins/rcp-be-lol-game-data/global/default/assets/${cleanPath(
                          tier.splashVideoPath
                        )}`
                      : "",
                    collectionSplashVideoPath: cleanPath(
                      tier.collectionSplashVideoPath
                    )
                      ? `https://raw.communitydragon.org/pbe/plugins/rcp-be-lol-game-data/global/default/assets/${cleanPath(
                          tier.collectionSplashVideoPath
                        )}`
                      : "",
                    stage: tier.stage,
                    isAnimated: true,
                  });
                }
              }
            });
          }
          return skins;
        });
        debugLog("Fetched skins.json, skinData length:", skinData.length);
      }),
    fetch(
      "https://raw.communitydragon.org/pbe/plugins/rcp-be-lol-game-data/global/default/v1/universes.json"
    )
      .then((response) => {
        if (!response.ok)
          throw new Error(`HTTP error! Status: ${response.status}`);
        return response.json();
      })
      .then((data) => {
        universeData = Array.isArray(data) ? data : [];
        debugLog(
          "Fetched universes.json, universeData length:",
          universeData.length
        );
      }),
    fetch(
      "https://raw.communitydragon.org/pbe/plugins/rcp-be-lol-game-data/global/default/v1/skinlines.json"
    )
      .then((response) => {
        if (!response.ok)
          throw new Error(`HTTP error! Status: ${response.status}`);
        return response.json();
      })
      .then((data) => {
        skinLineData = Array.isArray(data) ? data : [];
        debugLog(
          "Fetched skinlines.json, skinLineData length:",
          skinLineData.length
        );
      }),
    fetch(
      "https://raw.communitydragon.org/pbe/plugins/rcp-be-lol-game-data/global/default/v1/tftrotationalshopitemdata.json"
    )
      .then((response) => {
        if (!response.ok)
          throw new Error(`HTTP error! Status: ${response.status}`);
        return response.json();
      })
      .then((data) => {
        tftData = Array.isArray(data) ? data : [];
        tftData = tftData.map((item) => {
          const cleanBackgroundTexture = item.backgroundTextureLCU
            ? item.backgroundTextureLCU.replace(/^ASSETS\//i, "").toLowerCase()
            : "";
          const cleanLargeIcon = item.standaloneLoadoutsLargeIcon
            ? item.standaloneLoadoutsLargeIcon
                .replace(/^ASSETS\//i, "")
                .toLowerCase()
            : "";
          return {
            ...item,
            backgroundTextureLCU: cleanBackgroundTexture
              ? `https://raw.communitydragon.org/pbe/plugins/rcp-be-lol-game-data/global/default/assets/${cleanBackgroundTexture}`
              : "",
            standaloneLoadoutsLargeIcon: cleanLargeIcon
              ? `https://raw.communitydragon.org/pbe/plugins/rcp-be-lol-game-data/global/default/assets/${cleanLargeIcon}`
              : "",
            isTFT: true,
          };
        });
        debugLog(
          "Fetched tftrotationalshopitemdata.json, tftData length:",
          tftData.length
        );
      }),
  ])
    .then((results) => {
      const errors = results
        .filter((r) => r.status === "rejected")
        .map((r) => r.reason);
      if (errors.length > 0) {
        debugLog("Errors during data fetch:", errors, "error");
        alert("Some data failed to load. Falling back to champion grouping.");
      }
      generatePreviewGroups("champion");
      checkAndApplyBackground();
    })
    .catch((error) => {
      debugLog("Unexpected error during data fetch:", error, "error");
      alert("Failed to initialize data.");
    });

  setTimeout(() => {
    const observer = new MutationObserver(() => {
      if (!uiVisible) {
        checkAndCreateButton();
      }
      checkAndApplyBackground();
    });

    const targetNode =
      document.querySelector('[data-screen-name="rcp-fe-lol-parties"]') ||
      document.body;
    observer.observe(targetNode, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-screen-name"],
    });

    checkAndCreateButton();
    checkAndApplyBackground();
  }, 1000);
});

function checkAndCreateButton() {
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(() => {
    const partiesScreen = document.querySelector(
      '[data-screen-name="rcp-fe-lol-parties"]'
    );
    const showBtn = document.getElementById("client-bg-show-button");

    if (!partiesScreen) {
      if (showBtn) showBtn.remove();
      return;
    }

    if (!showBtn) {
      createShowButton(partiesScreen);
    }
  }, 100);
}

function createShowButton(container) {
  const existingHoverArea = document.getElementById("client-bg-hover-area");
  if (existingHoverArea) existingHoverArea.remove();

  const hoverArea = document.createElement("div");
  hoverArea.id = "client-bg-hover-area";
  hoverArea.style.cssText = `
        position: absolute;
        top: 40%;
        left: -70px;
        width: 250px;
        height: 20%;
        z-index: 9998;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

  const showButton = document.createElement("button");
  showButton.textContent = "BGC";
  showButton.id = "client-bg-show-button";
  showButton.className = "lol-custom-ui";
  showButton.style.cssText = `
        padding: 8px 16px;
        z-index: 9999;
        background: #010a13;
        border: 1px solid #785a28;
        color: #cdbe91;
        border-radius: 2px;
        font-size: 24px;
        font-weight: bold;
        font-family: 'LoL Display', 'BeaufortforLOL', sans-serif;
        transition: all 0.2s, opacity 0.3s;
        opacity: 0;
    `;

  hoverArea.addEventListener("mouseenter", () => {
    showButton.style.opacity = "1";
  });

  hoverArea.addEventListener("mouseleave", () => {
    showButton.style.opacity = "0";
  });

  showButton.addEventListener("mouseenter", () => {
    showButton.style.background = "#1e2328";
    showButton.style.borderColor = "#c8aa6e";
    showButton.style.color = "#f0e6d2";
  });

  showButton.addEventListener("mouseleave", () => {
    showButton.style.background = "#010a13";
    showButton.style.borderColor = "#785a28";
    showButton.style.color = "#cdbe91";
  });

  showButton.addEventListener("mousedown", () => {
    showButton.style.color = "#785a28";
  });

  showButton.addEventListener("mouseup", () => {
    showButton.style.color = "#f0e6d2";
  });

  showButton.addEventListener("click", () => {
    const uiWrapper = document.getElementById(
      "client-bg-customizer-ui-wrapper"
    );
    if (uiWrapper) {
      uiWrapper.remove();
    }
    createClientBackgroundCustomizerUI(container);
    uiVisible = true;
    hoverArea.remove();
  });

  hoverArea.appendChild(showButton);
  container.appendChild(hoverArea);
}

function generatePreviewGroups(type) {
  debugLog("Generating preview groups for type:", type);
  previewGroups = [];

  if (type === "champion") {
    const groupedByChampion = {};
    skinData.forEach((skin) => {
      if (skin.tilePath) {
        const match = skin.tilePath.match(/\/Characters\/([^\/]+)\//i);
        if (match) {
          const champion = match[1];
          if (!groupedByChampion[champion]) {
            groupedByChampion[champion] = [];
          }
          groupedByChampion[champion].push({
            name: skin.name,
            tilePath: skin.tilePath,
            splashPath: skin.splashPath,
            uncenteredSplashPath: skin.uncenteredSplashPath,
            skinLineId:
              skin.skinLines && skin.skinLines.length > 0
                ? skin.skinLines[0].id
                : null,
          });
        }
      }
    });

    const championGroups = Object.keys(groupedByChampion).map((champion) => ({
      title: champion,
      items: groupedByChampion[champion],
    }));

    championGroups.sort((a, b) => a.title.localeCompare(b.title));
    championGroups.forEach((group) => {
      group.items.sort((a, b) => a.name.localeCompare(b.name));
    });

    previewGroups.push(...championGroups);
  } else if (type === "universes") {
    if (
      !Array.isArray(universeData) ||
      universeData.length === 0 ||
      !Array.isArray(skinLineData) ||
      skinLineData.length === 0
    ) {
      debugLog(
        "Universe or skinline data unavailable, falling back to champion",
        null,
        "warn"
      );
      generatePreviewGroups("champion");
      return;
    }

    const groupedByUniverse = { Other: [] };
    const skinLineToName = {};
    const skinLineToUniverse = {};

    skinLineData.forEach((skinLine) => {
      if (skinLine.id && skinLine.name) {
        skinLineToName[skinLine.id] = skinLine.name;
      }
    });

    universeData.forEach((universe) => {
      if (
        !universe ||
        typeof universe !== "object" ||
        !universe.name ||
        !Array.isArray(universe.skinSets)
      ) {
        return;
      }
      universe.skinSets.forEach((skinSet) => {
        const id = parseInt(
          typeof skinSet === "object" ? skinSet.id : skinSet,
          10
        );
        if (!isNaN(id)) {
          skinLineToUniverse[id] = universe.name;
        }
      });
    });

    skinData.forEach((skin) => {
      if (!skin.tilePath) return;
      const skinLineId =
        skin.skinLines &&
        skin.skinLines.length > 0 &&
        skin.skinLines[0].id != null
          ? parseInt(skin.skinLines[0].id, 10)
          : null;

      let groupName = "Other";
      let skinLineName = null;

      if (skinLineId) {
        skinLineName =
          skinLineToName[skinLineId] || `Unknown SkinLine ${skinLineId}`;
        groupName = skinLineToUniverse[skinLineId] || skinLineName;
      }

      if (!groupedByUniverse[groupName]) {
        groupedByUniverse[groupName] = [];
      }
      groupedByUniverse[groupName].push({
        name: skin.name,
        tilePath: skin.tilePath,
        splashPath: skin.splashPath,
        uncenteredSplashPath: skin.uncenteredSplashPath,
        skinLineId,
        skinLineName,
      });
    });

    const universeGroups = Object.keys(groupedByUniverse).map((universe) => ({
      title: universe,
      items: groupedByUniverse[universe],
    }));

    universeGroups.sort((a, b) => a.title.localeCompare(b.title));
    universeGroups.forEach((group) => {
      group.items.sort((a, b) => a.name.localeCompare(b.name));
    });

    previewGroups.push(...universeGroups);
  } else if (type === "skinlines") {
    if (!Array.isArray(skinLineData) || skinLineData.length === 0) {
      debugLog(
        "Skinline data unavailable, falling back to champion",
        null,
        "warn"
      );
      generatePreviewGroups("champion");
      return;
    }

    const groupedBySkinLine = { Other: [] };
    const skinLineToName = {};

    skinLineData.forEach((skinLine) => {
      if (skinLine.id && skinLine.name) {
        skinLineToName[skinLine.id] = skinLine.name;
      }
    });

    skinData.forEach((skin) => {
      if (!skin.tilePath) return;
      const skinLineId =
        skin.skinLines &&
        skin.skinLines.length > 0 &&
        skin.skinLines[0].id != null
          ? parseInt(skin.skinLines[0].id, 10)
          : null;

      let groupName = "Other";
      let skinLineName = null;

      if (skinLineId) {
        skinLineName =
          skinLineToName[skinLineId] || `Unknown SkinLine ${skinLineId}`;
        groupName = skinLineName;
      }

      if (!groupedBySkinLine[groupName]) {
        groupedBySkinLine[groupName] = [];
      }
      groupedBySkinLine[groupName].push({
        name: skin.name,
        tilePath: skin.tilePath,
        splashPath: skin.splashPath,
        uncenteredSplashPath: skin.uncenteredSplashPath,
        skinLineId,
        skinLineName,
      });
    });

    const skinLineGroups = Object.keys(groupedBySkinLine).map((skinLine) => ({
      title: skinLine,
      items: groupedBySkinLine[skinLine],
    }));

    skinLineGroups.sort((a, b) => a.title.localeCompare(b.title));
    skinLineGroups.forEach((group) => {
      group.items.sort((a, b) => a.name.localeCompare(b.name));
    });

    previewGroups.push(...skinLineGroups);
  } else {
    debugLog("Invalid type, falling back to champion", null, "warn");
    generatePreviewGroups("champion");
  }

  if (DataStore.get("tftEnabled") !== false && tftData.length > 0) {
    const tftGroup = {
      title: "TFT",
      items: tftData
        .filter(
          (item) =>
            item.descriptionTraKey &&
            item.descriptionTraKey.toLowerCase().startsWith("companion") &&
            item.backgroundTextureLCU
        )
        .map((item) => ({
          name: item.name,
          tilePath: item.standaloneLoadoutsLargeIcon,
          splashPath: item.backgroundTextureLCU,
          uncenteredSplashPath: item.backgroundTextureLCU,
          skinLineId: null,
          skinLineName: null,
          isTFT: true,
        })),
    };
    if (tftGroup.items.length > 0) {
      tftGroup.items.sort((a, b) => a.name.localeCompare(b.name));
      previewGroups.push(tftGroup);
    }
  }

  debugLog(
    `Generated ${previewGroups.length} preview groups for type: ${type}`
  );
}

function createProfilesUI(container) {
  const profilesWrapper = document.createElement("div");
  profilesWrapper.id = "client-bg-profiles-ui-wrapper";
  profilesWrapper.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        background: rgba(0, 0, 0, 0.7);
    `;

  const profilesContainer = document.createElement("div");
  profilesContainer.id = "client-bg-profiles-ui";
  profilesContainer.className = "lol-custom-ui";
  profilesContainer.style.cssText = `
        width: 600px;
        height: 550px;
        display: flex;
        flex-direction: column;
        font-family: 'LoL Display', 'BeaufortforLOL', sans-serif;
        background: #010a13;
        border: 1px solid #785a28;
        border-radius: 4px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.8);
        box-sizing: border-box;
        padding: 20px 0;
    `;

  const innerContainer = document.createElement("div");
  innerContainer.style.cssText = `
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        margin: 0 20px;
    `;

  const title = document.createElement("h3");
  title.textContent = "Manage Skin Profiles";
  title.style.cssText = `
        color: #f0e6d2;
        font-size: 24px;
        font-weight: bold;
        text-align: center;
        margin: 0 0 20px 0;
        text-transform: uppercase;
    `;
  innerContainer.appendChild(title);

  const profilesContent = document.createElement("div");
  profilesContent.style.cssText = `
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 15px;
        overflow-y: auto;
        padding-right: 10px;
        scrollbar-width: thin;
        scrollbar-color: #785a28 transparent;
    `;
  profilesContent.className = "profiles-content";

  const createProfileSection = document.createElement("div");
  createProfileSection.style.cssText = `display: flex; align-items: center; gap: 10px; margin-bottom: 15px;`;
  const profileNameInput = document.createElement("input");
  profileNameInput.type = "text";
  profileNameInput.placeholder = `Profile ${skinProfiles.length + 1}`;
  profileNameInput.style.cssText = `
        flex: 1;
        background: #010a13;
        border: 1px solid #785a28;
        color: #cdbe91;
        padding: 8px;
        border-radius: 2px;
        font-family: 'LoL Display', 'BeaufortforLOL', sans-serif;
    `;
  const addProfileButton = document.createElement("button");
  addProfileButton.textContent = "+";
  addProfileButton.style.cssText = `
        padding: 8px 12px;
        background: #1e2328;
        border: 1px solid #785a28;
        color: #cdbe91;
        border-radius: 2px;
        font-family: 'LoL Display', 'BeaufortforLOL', sans-serif;
        cursor: pointer;
    `;
  addProfileButton.addEventListener("mouseover", () => {
    addProfileButton.style.background = "#1e2328";
    addProfileButton.style.borderColor = "#c8aa6e";
    addProfileButton.style.color = "#f0e6d2";
  });
  addProfileButton.addEventListener("mouseout", () => {
    addProfileButton.style.background = "#1e2328";
    addProfileButton.style.borderColor = "#785a28";
    addProfileButton.style.color = "#cdbe91";
  });
  const errorMessage = document.createElement("span");
  errorMessage.style.cssText = `color: #ff5555; font-size: 12px; display: none; margin-top: 5px;`;
  createProfileSection.appendChild(profileNameInput);
  createProfileSection.appendChild(addProfileButton);
  profilesContent.appendChild(createProfileSection);
  profilesContent.appendChild(errorMessage);

  const profilesList = document.createElement("div");
  profilesList.style.cssText = `display: flex; flex-direction: column; gap: 10px;`;
  profilesContent.appendChild(profilesList);

  function renderProfilesList() {
    profilesList.innerHTML = "";
    if (skinProfiles.length === 0) {
      const noProfilesMessage = document.createElement("div");
      noProfilesMessage.textContent = "No profiles saved";
      noProfilesMessage.style.cssText = `
                color: #f0e6d2;
                font-size: 16px;
                text-align: center;
                padding: 20px;
            `;
      profilesList.appendChild(noProfilesMessage);
      return;
    }
    skinProfiles.forEach((profile, index) => {
      const profileRow = document.createElement("div");
      profileRow.style.cssText = `
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 5px;
                border-bottom: 1px solid #785a28;
                ${
                  profile.name === activeProfile
                    ? "background: #1e2328; border: 1px solid #c8aa6e; border-radius: 4px;"
                    : ""
                }
            `;
      const nameSpan = document.createElement("span");
      nameSpan.textContent = profile.name;
      nameSpan.style.cssText = `
                flex: 1;
                color: ${
                  profile.name === activeProfile ? "#f0e6d2" : "#cdbe91"
                };
                cursor: pointer;
            `;
      nameSpan.addEventListener("click", () => {
        const input = document.createElement("input");
        input.type = "text";
        input.value = profile.name;
        input.style.cssText = `
                    width: 100%;
                    background: #010a13;
                    border: 1px solid #785a28;
                    color: #cdbe91;
                    padding: 4px;
                    border-radius: 2px;
                `;
        input.addEventListener("blur", () => {
          const newName = input.value.trim();
          if (
            newName &&
            !skinProfiles.some((p) => p.name === newName && p !== profile)
          ) {
            if (profile.name === activeProfile) {
              activeProfile = newName;
            }
            profile.name = newName;
            saveSettings();
            renderProfilesList();
          } else {
            errorMessage.textContent = newName
              ? "Name already taken"
              : "Name cannot be empty";
            errorMessage.style.display = "block";
            setTimeout(() => {
              errorMessage.style.display = "none";
            }, 3000);
            renderProfilesList();
          }
        });
        input.addEventListener("keypress", (e) => {
          if (e.key === "Enter") input.blur();
        });
        nameSpan.replaceWith(input);
        input.focus();
      });
      const loadButton = document.createElement("button");
      loadButton.textContent = "Load";
      loadButton.style.cssText = `
                padding: 4px 8px;
                background: #1e2328;
                border: 1px solid #785a28;
                color: #cdbe91;
                border-radius: 2px;
                cursor: pointer;
            `;
      loadButton.addEventListener("click", () => {
        debugLog(`Loading profile: ${profile.name}`);
        DataStore.set("favoriteSkins", profile.skins);
        window.favoriteSkins = profile.skins || []; // Sync global state
        window.isFavoritesToggled = DataStore.get("favoritesToggled") || false; // Load persisted filter state
        activeProfile = profile.name;
        saveSettings();
        renderProfilesList();
        const customizerUI = document.getElementById("client-bg-customizer-ui");
        if (customizerUI) {
          const mainWindow = customizerUI.querySelector(".main-window");
          if (mainWindow && window.renderSkins) {
            debugLog("Preparing to render skins with:", {
              favoriteSkinsCount: window.favoriteSkins.length,
              isFavoritesToggled: window.isFavoritesToggled,
              previewGroupsCount: previewGroups.length,
              searchQuery: currentSearchQuery,
            });
            // Update filter dropdown UI to reflect persisted state
            const filterDropdown = customizerUI.querySelector(
              ".filter-dropdown .dropdown-toggle"
            );
            const filterMenu = customizerUI.querySelector(
              ".filter-dropdown .dropdown-menu"
            );
            if (filterDropdown && filterMenu) {
              const currentFilter = window.isFavoritesToggled
                ? "Favorites"
                : "All Skins";
              filterDropdown.textContent = currentFilter;
              filterMenu.querySelectorAll(".dropdown-item").forEach((item) => {
                item.classList.toggle(
                  "selected",
                  item.textContent === currentFilter
                );
              });
              debugLog(`Filter dropdown updated to: ${currentFilter}`);
            } else {
              debugLog("Filter dropdown or menu not found");
            }
            // Directly call renderSkins with the correct filter
            const filterValue = window.isFavoritesToggled ? "favorites" : "all";
            debugLog(`Rendering skins with filter: ${filterValue}`);
            window.renderSkins(previewGroups, currentSearchQuery, filterValue);
          } else {
            debugLog("Main window or renderSkins missing");
          }
        } else {
          debugLog("Customizer UI not found");
        }
      });
      const saveButton = document.createElement("button");
      saveButton.textContent = "Save";
      saveButton.style.cssText = `
                padding: 4px 8px;
                background: #1e2328;
                border: 1px solid #785a28;
                color: #cdbe91;
                border-radius: 2px;
                cursor: pointer;
            `;
      saveButton.addEventListener("click", () => {
        const currentFavorites = DataStore.get("favoriteSkins") || [];
        if (currentFavorites.length === 0) {
          errorMessage.textContent = "No favorites to save";
          errorMessage.style.display = "block";
          setTimeout(() => {
            errorMessage.style.display = "none";
          }, 3000);
          return;
        }
        profile.skins = currentFavorites;
        saveSettings();
        renderProfilesList();
      });
      const deleteButton = document.createElement("button");
      deleteButton.textContent = "🗑";
      deleteButton.style.cssText = `
                padding: 4px 8px;
                background: #1e2328;
                border: 1px solid #785a28;
                color: #cdbe91;
                border-radius: 2px;
                cursor: pointer;
            `;
      deleteButton.addEventListener("click", () => {
        skinProfiles = skinProfiles.filter((p) => p !== profile);
        if (activeProfile === profile.name) activeProfile = null;
        saveSettings();
        renderProfilesList();
      });
      const upButton = document.createElement("button");
      upButton.textContent = "↑";
      upButton.style.cssText = `
                padding: 4px 8px;
                background: #1e2328;
                border: 1px solid #785a28;
                color: #cdbe91;
                border-radius: 2px;
                cursor: ${index === 0 ? "not-allowed" : "pointer"};
                opacity: ${index === 0 ? 0.5 : 1};
            `;
      upButton.disabled = index === 0;
      upButton.addEventListener("click", () => {
        if (index > 0) {
          [skinProfiles[index - 1], skinProfiles[index]] = [
            skinProfiles[index],
            skinProfiles[index - 1],
          ];
          saveSettings();
          renderProfilesList();
        }
      });
      const downButton = document.createElement("button");
      downButton.textContent = "↓";
      downButton.style.cssText = `
                padding: 4px 8px;
                background: #1e2328;
                border: 1px solid #785a28;
                color: #cdbe91;
                border-radius: 2px;
                cursor: ${
                  index === skinProfiles.length - 1 ? "not-allowed" : "pointer"
                };
                opacity: ${index === skinProfiles.length - 1 ? 0.5 : 1};
            `;
      downButton.disabled = index === skinProfiles.length - 1;
      downButton.addEventListener("click", () => {
        if (index < skinProfiles.length - 1) {
          [skinProfiles[index], skinProfiles[index + 1]] = [
            skinProfiles[index + 1],
            skinProfiles[index],
          ];
          saveSettings();
          renderProfilesList();
        }
      });
      [loadButton, saveButton, deleteButton, upButton, downButton].forEach(
        (btn) => {
          btn.addEventListener("mouseover", () => {
            btn.style.background = "#1e2328";
            btn.style.borderColor = "#c8aa6e";
            btn.style.color = "#f0e6d2";
          });
          btn.addEventListener("mouseout", () => {
            btn.style.background = "#1e2328";
            btn.style.borderColor = "#785a28";
            btn.style.color = "#cdbe91";
          });
        }
      );
      profileRow.appendChild(nameSpan);
      profileRow.appendChild(loadButton);
      profileRow.appendChild(saveButton);
      profileRow.appendChild(deleteButton);
      profileRow.appendChild(upButton);
      profileRow.appendChild(downButton);
      profilesList.appendChild(profileRow);
    });
  }

  addProfileButton.addEventListener("click", () => {
    const name =
      profileNameInput.value.trim() || `Profile ${skinProfiles.length + 1}`;
    if (!name || skinProfiles.some((p) => p.name === name)) {
      errorMessage.textContent = name
        ? "Name already taken"
        : "Name cannot be empty";
      errorMessage.style.display = "block";
      setTimeout(() => {
        errorMessage.style.display = "none";
      }, 3000);
      return;
    }
    skinProfiles.push({ name, skins: [] });
    saveSettings();
    profileNameInput.value = "";
    renderProfilesList();
  });

  renderProfilesList();

  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
        .profiles-content::-webkit-scrollbar {
            width: 6px;
        }
        .profiles-content::-webkit-scrollbar-track {
            background: transparent;
        }
        .profiles-content::-webkit-scrollbar-thumb {
            background: #785a28;
            border-radius: 3px;
        }
        .profiles-content::-webkit-scrollbar-thumb:hover {
            background: #c8aa6e;
        }
    `;
  document.head.appendChild(styleSheet);

  innerContainer.appendChild(profilesContent);
  profilesContainer.appendChild(innerContainer);

  const closeButton = document.createElement("button");
  closeButton.textContent = "Close";
  closeButton.className = "profiles-close-button";
  closeButton.style.cssText = `
        margin-top: 20px;
        margin-left: auto;
        margin-right: auto;
        width: 50%;
        padding: 5px 0;
        min-height: 32px;
        color: #cdbe91;
        font-size: 14px;
        font-family: 'LoL Display', 'BeaufortforLOL', sans-serif;
        font-weight: bold;
        letter-spacing: 1px;
        text-transform: uppercase;
        cursor: pointer;
        background: #1e2328;
        border: 2px solid #785a28;
        box-shadow: 0 0 1px 1px #010a13, inset 0 0 1px 1px #010a13;
        transition: color 0.2s, border-color 0.2s, box-shadow 0.2s;
    `;
  closeButton.addEventListener("mouseover", () => {
    closeButton.style.color = "#f0e6d2";
    closeButton.style.borderColor = "#c8aa6e";
    closeButton.style.boxShadow =
      "0 0 8px 4px rgba(212, 184, 117, 0.5), inset 0 0 1px 1px #010a13";
  });
  closeButton.addEventListener("mouseout", () => {
    closeButton.style.color = "#cdbe91";
    closeButton.style.borderColor = "#785a28";
    closeButton.style.boxShadow = "none";
  });
  closeButton.addEventListener("click", () => {
    debugLog("Profiles UI closing, starting restore process");
    profilesWrapper.remove();

    // Find existing wrapper or clean up duplicates
    let customizerWrapper = document.getElementById(
      "client-bg-customizer-ui-wrapper"
    );
    const existingWrappers = document.querySelectorAll(
      "#client-bg-customizer-ui-wrapper"
    );
    if (existingWrappers.length > 1) {
      debugLog(
        "Multiple customizer wrappers found, removing duplicates",
        null,
        "warn"
      );
      existingWrappers.forEach((wrapper, index) => {
        if (index > 0) wrapper.remove();
      });
      customizerWrapper = existingWrappers[0];
    }

    // Clean up duplicate backdrops
    const existingBackdrops = document.querySelectorAll(
      ".client-bg-customizer-backdrop"
    );
    if (existingBackdrops.length > 1) {
      debugLog("Multiple backdrops found, removing duplicates", null, "warn");
      existingBackdrops.forEach((backdrop, index) => {
        if (index > 0) backdrop.remove();
      });
    }

    if (customizerWrapper) {
      debugLog("Customizer wrapper found, restoring visibility");
      customizerWrapper.style.display = "block";
      const customizerUI = document.getElementById("client-bg-customizer-ui");
      const mainWindow = customizerUI?.querySelector(".main-window");
      if (customizerUI && mainWindow && window.renderSkins) {
        // Reload state from DataStore
        window.favoriteSkins = DataStore.get("favoriteSkins") || [];
        window.isFavoritesToggled = DataStore.get("favoritesToggled") || false;
        debugLog("Restored state:", {
          favoriteSkinsCount: window.favoriteSkins.length,
          isFavoritesToggled: window.isFavoritesToggled,
          previewGroupsCount: previewGroups.length,
          searchQuery: currentSearchQuery,
        });

        // Update favorites toggle UI
        const favoritesToggleBtn =
          customizerWrapper.querySelector(".favorites-toggle");
        if (favoritesToggleBtn) {
          favoritesToggleBtn.classList.toggle(
            "toggled",
            window.isFavoritesToggled
          );
          const toggledDiv = favoritesToggleBtn.querySelector(".toggled");
          if (toggledDiv) {
            toggledDiv.classList.toggle(
              "toggled-on",
              window.isFavoritesToggled
            );
          }
          debugLog("Favorites toggle updated");
        }

        // Update filter dropdown UI
        const filterDropdown = customizerUI.querySelector(
          ".filter-dropdown .dropdown-toggle"
        );
        const filterMenu = customizerUI.querySelector(
          ".filter-dropdown .dropdown-menu"
        );
        if (filterDropdown && filterMenu) {
          const currentFilter = window.isFavoritesToggled
            ? "Favorites"
            : "All Skins";
          filterDropdown.textContent = currentFilter;
          filterMenu.querySelectorAll(".dropdown-item").forEach((item) => {
            item.classList.toggle(
              "selected",
              item.textContent === currentFilter
            );
          });
          debugLog(`Filter dropdown updated to: ${currentFilter}`);
        }

        // Ensure previewGroups is populated
        if (!previewGroups.length) {
          debugLog("previewGroups empty, regenerating", null, "warn");
          generatePreviewGroups("champion");
        }

        // Update favorite buttons
        document.querySelectorAll(".favorite-button").forEach((btn) => {
          const skinName = btn.closest(".skin-image")?.dataset.name;
          const isTFT = btn.closest(".skin-image")?.dataset.isTFT === "true";
          if (skinName) {
            btn.classList.toggle(
              "favorited",
              window.favoriteSkins.some(
                (fav) => fav.name === skinName && fav.isTFT === isTFT
              )
            );
          }
        });
        document.querySelectorAll(".group-favorite-button").forEach((btn) => {
          const groupTitle =
            btn.closest(".skin-group-title")?.dataset.groupTitle;
          const groupItems =
            previewGroups.find((group) => group.title === groupTitle)?.items ||
            [];
          const allFavorited = groupItems.every((item) =>
            window.favoriteSkins.some(
              (fav) => fav.name === item.name && fav.isTFT === item.isTFT
            )
          );
          btn.classList.toggle("favorited", allFavorited);
        });

        // Render with correct filter
        const filterValue = window.isFavoritesToggled ? "favorites" : "all";
        debugLog(`Rendering skins with filter: ${filterValue}`);
        window.renderSkins(previewGroups, currentSearchQuery, filterValue);

        // Highlight selected skin
        const savedSkin = DataStore.get("selectedSkin");
        if (savedSkin && savedSkin.name) {
          const escapedName = CSS.escape(savedSkin.name);
          const selector = `.skin-image[data-name="${escapedName}"][data-is-tft="${savedSkin.isTFT}"]`;
          const selectedImage = mainWindow.querySelector(selector);
          if (selectedImage) {
            selectedImage.classList.add("selected");
            selectedImage.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
            debugLog(`Highlighted selected skin: ${savedSkin.name}`);
          } else {
            debugLog(
              `Selected skin not found: ${savedSkin.name}`,
              null,
              "warn"
            );
          }
        }
      } else {
        debugLog(
          "Customizer UI or main window missing, reinitializing",
          null,
          "warn"
        );
        // Remove existing wrapper and backdrop to avoid duplicates
        if (customizerWrapper) customizerWrapper.remove();
        const existingBackdrop = document.querySelector(
          ".client-bg-customizer-backdrop"
        );
        if (existingBackdrop) existingBackdrop.remove();
        createClientBackgroundCustomizerUI(container);
      }
    } else {
      debugLog("Customizer wrapper not found, creating new UI", null, "warn");
      // Ensure no duplicate backdrops remain
      const existingBackdrop = document.querySelector(
        ".client-bg-customizer-backdrop"
      );
      if (existingBackdrop) existingBackdrop.remove();
      createClientBackgroundCustomizerUI(container);
    }
  });
  profilesContainer.appendChild(closeButton);

  profilesWrapper.appendChild(profilesContainer);
  container.appendChild(profilesWrapper);

  const customizerWrapper = document.getElementById(
    "client-bg-customizer-ui-wrapper"
  );
  if (customizerWrapper) {
    debugLog("Hiding customizer UI");
    customizerWrapper.style.display = "none";
  } else {
    debugLog(
      "Customizer wrapper not found during profiles UI init",
      null,
      "warn"
    );
  }
}

function createSettingsUI(container) {
  const settingsWrapper = document.createElement("div");
  settingsWrapper.id = "client-bg-settings-ui-wrapper";
  settingsWrapper.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        background: rgba(0, 0, 0, 0.7);
    `;

  const settingsContainer = document.createElement("div");
  settingsContainer.id = "client-bg-settings-ui";
  settingsContainer.className = "lol-custom-ui";
  settingsContainer.style.cssText = `
        width: 600px;
        height: 550px;
        display: flex;
        flex-direction: column;
        font-family: 'LoL Display', 'BeaufortforLOL', sans-serif;
        background: #010a13;
        border: 1px solid #785a28;
        border-radius: 4px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.8);
        box-sizing: border-box;
        padding: 20px 0;
    `;

  const innerContainer = document.createElement("div");
  innerContainer.style.cssText = `
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        margin-top: 0px;
        margin-right: 0px;
        margin-bottom: 0px;
        margin-left: 20px;
    `;

  const title = document.createElement("h3");
  title.textContent = "Background Settings";
  title.style.cssText = `
        color: #f0e6d2;
        font-size: 24px;
        font-weight: bold;
        text-align: center;
        margin: 0 0 20px 0;
        text-transform: uppercase;
    `;
  innerContainer.appendChild(title);

  const settingsContent = document.createElement("div");
  settingsContent.style.cssText = `
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 15px;
        overflow-y: auto;
        margin-right: 2px;
        padding-right: 10px;
        scrollbar-width: thin;
        scrollbar-color: #785a28 transparent;
    `;
  settingsContent.className = "settings-content";
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
        .settings-content::-webkit-scrollbar {
            width: 6px;
        }
        .settings-content::-webkit-scrollbar-track {
            background: transparent;
        }
        .settings-content::-webkit-scrollbar-thumb {
            background: #785a28;
            border-radius: 3px;
        }
        .settings-content::-webkit-scrollbar-thumb:hover {
            background: #c8aa6e;
        }
    `;
  document.head.appendChild(styleSheet);

  const generalTitle = document.createElement("h4");
  generalTitle.textContent = "General";
  generalTitle.style.cssText = `
        color: #f0e6d2;
        font-size: 18px;
        font-weight: bold;
        margin: 10px 0 5px 0;
        text-transform: uppercase;
    `;
  settingsContent.appendChild(generalTitle);

  const enableContainer = document.createElement("div");
  enableContainer.className = "toggle-btn";
  enableContainer.style.cssText = `margin-bottom: 15px;`;
  const enableLabel = document.createElement("span");
  enableLabel.textContent = "Enable Background:";
  const enableSwitch = document.createElement("label");
  enableSwitch.className = "toggle-switch";
  const enableInput = document.createElement("input");
  enableInput.type = "checkbox";
  enableInput.checked = backgroundEnabled;
  const enableSlider = document.createElement("span");
  enableSlider.className = "toggle-slider";
  enableSwitch.appendChild(enableInput);
  enableSwitch.appendChild(enableSlider);
  enableContainer.appendChild(enableLabel);
  enableContainer.appendChild(enableSwitch);
  settingsContent.appendChild(enableContainer);

  enableInput.addEventListener("change", () => {
    backgroundEnabled = enableInput.checked;
    saveSettings();
    checkAndApplyBackground();
  });

  const opacityLabel = document.createElement("label");
  opacityLabel.textContent = "Background Opacity:";
  opacityLabel.style.cssText = `margin-bottom: 5px;`;
  settingsContent.appendChild(opacityLabel);

  const opacityContainer = document.createElement("div");
  opacityContainer.style.cssText = `
        display: flex;
        align-items: center;
        gap: 15px;
        margin-bottom: 15px;
    `;
  const opacitySlider = document.createElement("input");
  opacitySlider.type = "range";
  opacitySlider.min = "0.1";
  opacitySlider.max = "1";
  opacitySlider.step = "0.1";
  opacitySlider.value = storedOpacity; // Use storedOpacity
  opacitySlider.style.cssText = `
        flex: 1;
        height: 8px;
        -webkit-appearance: none;
        background: #1e2328;
        border: 1px solid #785a28;
        border-radius: 4px;
        outline: none;
    `;
  const opacityValue = document.createElement("span");
  opacityValue.textContent = storedOpacity.toString();
  opacityValue.style.width = "40px";
  const opacityLeftArrow = document.createElement("button");
  opacityLeftArrow.textContent = "<";
  opacityLeftArrow.style.cssText = `
        color: #cdbe91;
        font-size: 14px;
        font-family: 'LoL Display', 'BeaufortforLOL', sans-serif;
        font-weight: bold;
        padding: 2px 6px;
        cursor: pointer;
        background: #1e2328;
        border: 1px solid #785a28;
        border-radius: 2px;
        transition: color 0.2s, border-color 0.2s;
    `;
  opacityLeftArrow.addEventListener("click", () => {
    const step = 0.1;
    const newValue = Math.max(
      parseFloat(opacitySlider.min),
      Math.round((parseFloat(opacitySlider.value) - step) * 10) / 10
    );
    opacitySlider.value = newValue;
    storedOpacity = newValue; // Update storedOpacity
    opacityValue.textContent = newValue.toString();
    currentOpacity = storedOpacity; // Sync currentOpacity
    saveSettings();
    checkAndApplyBackground();
  });
  const opacityRightArrow = document.createElement("button");
  opacityRightArrow.textContent = ">";
  opacityRightArrow.style.cssText = `
        color: #cdbe91;
        font-size: 14px;
        font-family: 'LoL Display', 'BeaufortforLOL', sans-serif;
        font-weight: bold;
        padding: 2px 6px;
        cursor: pointer;
        background: #1e2328;
        border: 1px solid #785a28;
        border-radius: 2px;
        transition: color 0.2s, border-color 0.2s;
    `;
  opacityRightArrow.addEventListener("click", () => {
    const step = 0.1;
    const newValue = Math.min(
      parseFloat(opacitySlider.max),
      Math.round((parseFloat(opacitySlider.value) + step) * 10) / 10
    );
    opacitySlider.value = newValue;
    storedOpacity = newValue; // Update storedOpacity
    opacityValue.textContent = newValue.toString();
    currentOpacity = storedOpacity; // Sync currentOpacity
    saveSettings();
    checkAndApplyBackground();
  });
  opacitySlider.addEventListener("input", () => {
    storedOpacity = parseFloat(opacitySlider.value); // Update storedOpacity
    opacityValue.textContent = storedOpacity.toString();
    currentOpacity = storedOpacity; // Sync currentOpacity
    saveSettings();
    checkAndApplyBackground();
  });
  opacityLeftArrow.addEventListener("mouseover", () => {
    opacityLeftArrow.style.color = "#f0e6d2";
    opacityLeftArrow.style.borderColor = "#c8aa6e";
  });
  opacityLeftArrow.addEventListener("mouseout", () => {
    opacityLeftArrow.style.color = "#cdbe91";
    opacityLeftArrow.style.borderColor = "#785a28";
  });
  opacityRightArrow.addEventListener("mouseover", () => {
    opacityRightArrow.style.color = "#f0e6d2";
    opacityRightArrow.style.borderColor = "#c8aa6e";
  });
  opacityRightArrow.addEventListener("mouseout", () => {
    opacityRightArrow.style.color = "#cdbe91";
    opacityRightArrow.style.borderColor = "#785a28";
  });
  opacityContainer.appendChild(opacityLeftArrow);
  opacityContainer.appendChild(opacitySlider);
  opacityContainer.appendChild(opacityRightArrow);
  opacityContainer.appendChild(opacityValue);
  settingsContent.appendChild(opacityContainer);

  const persistContainer = document.createElement("div");
  persistContainer.className = "toggle-btn";
  persistContainer.style.cssText = `margin-bottom: 15px;`;
  const persistLabel = document.createElement("span");
  persistLabel.textContent = "Keep background on all screens:";
  const persistSwitch = document.createElement("label");
  persistSwitch.className = "toggle-switch";
  const persistInput = document.createElement("input");
  persistInput.type = "checkbox";
  persistInput.checked = persistBackground;
  const persistSlider = document.createElement("span");
  persistSlider.className = "toggle-slider";
  persistSwitch.appendChild(persistInput);
  persistSwitch.appendChild(persistSlider);
  persistContainer.appendChild(persistLabel);
  persistContainer.appendChild(persistSwitch);
  settingsContent.appendChild(persistContainer);

  persistInput.addEventListener("change", () => {
    persistBackground = persistInput.checked;
    saveSettings();
    checkAndApplyBackground();
  });

  const centeredContainer = document.createElement("div");
  centeredContainer.className = "toggle-btn";
  centeredContainer.style.cssText = `margin-bottom: 15px;`;
  const centeredLabel = document.createElement("span");
  centeredLabel.textContent = "Centered Splash:";
  const centeredSwitch = document.createElement("label");
  centeredSwitch.className = "toggle-switch";
  const centeredInput = document.createElement("input");
  centeredInput.type = "checkbox";
  centeredInput.checked = centeredSplash;
  const centeredSlider = document.createElement("span");
  centeredSlider.className = "toggle-slider";
  centeredSwitch.appendChild(centeredInput);
  centeredSwitch.appendChild(centeredSlider);
  centeredContainer.appendChild(centeredLabel);
  centeredContainer.appendChild(centeredSwitch);
  settingsContent.appendChild(centeredContainer);

  centeredInput.addEventListener("change", () => {
    centeredSplash = centeredInput.checked;
    saveSettings();
    checkAndApplyBackground();
  });

  const tftContainer = document.createElement("div");
  tftContainer.className = "toggle-btn";
  tftContainer.style.cssText = `margin-bottom: 15px;`;
  const tftLabel = document.createElement("span");
  tftLabel.textContent = "Enable TFT Content:";
  const tftSwitch = document.createElement("label");
  tftSwitch.className = "toggle-switch";
  const tftInput = document.createElement("input");
  tftInput.type = "checkbox";
  tftInput.checked = DataStore.get("tftEnabled") !== false;
  const tftSlider = document.createElement("span");
  tftSlider.className = "toggle-slider";
  tftSwitch.appendChild(tftInput);
  tftSwitch.appendChild(tftSlider);
  tftContainer.appendChild(tftLabel);
  tftContainer.appendChild(tftSwitch);
  settingsContent.appendChild(tftContainer);

  tftInput.addEventListener("change", () => {
    const tftEnabled = tftInput.checked;
    DataStore.set("tftEnabled", tftEnabled);
    if (!tftEnabled) {
      const selectedSkin = DataStore.get("selectedSkin");
      if (selectedSkin && selectedSkin.isTFT) {
        DataStore.set("selectedSkin", null);
        removeBackground();
        debugLog("Cleared selected TFT skin");
      }
    }
    saveSettings();
    const customizerUI = document.getElementById("client-bg-customizer-ui");
    if (customizerUI) {
      generatePreviewGroups("champion");
      const mainWindow = customizerUI.querySelector(".main-window");
      if (mainWindow && window.renderSkins) {
        window.renderSkins(previewGroups);
      }
    }
  });

  // Add debug mode toggle
  const debugContainer = document.createElement("div");
  debugContainer.className = "toggle-btn";
  debugContainer.style.cssText = `margin-bottom: 15px;`;
  const debugLabel = document.createElement("span");
  debugLabel.textContent = "Debug Mode:";
  const debugDescription = document.createElement("div");
  debugDescription.textContent = "Enable console logging for troubleshooting";
  debugDescription.style.cssText = `
      font-size: 12px;
      color: #a09b8c;
      margin-top: 2px;
      margin-left: 2px;
  `;
  const debugLabelContainer = document.createElement("div");
  debugLabelContainer.style.cssText = `display: flex; flex-direction: column;`;
  debugLabelContainer.appendChild(debugLabel);
  debugLabelContainer.appendChild(debugDescription);

  const debugSwitch = document.createElement("label");
  debugSwitch.className = "toggle-switch";
  const debugInput = document.createElement("input");
  debugInput.type = "checkbox";
  debugInput.checked = debugMode;
  const debugSlider = document.createElement("span");
  debugSlider.className = "toggle-slider";
  debugSwitch.appendChild(debugInput);
  debugSwitch.appendChild(debugSlider);
  debugContainer.appendChild(debugLabelContainer);
  debugContainer.appendChild(debugSwitch);
  settingsContent.appendChild(debugContainer);

  debugInput.addEventListener("change", () => {
    debugMode = debugInput.checked;
    saveSettings();
    debugLog("Debug mode is " + (debugMode ? "enabled" : "disabled"));
  });

  const shuffleSettingsTitle = document.createElement("h4");
  shuffleSettingsTitle.textContent = "Shuffle Settings";
  shuffleSettingsTitle.style.cssText = `
        color: #f0e6d2;
        font-size: 18px;
        font-weight: bold;
        margin: 10px 0 5px 0;
        text-transform: uppercase;
    `;
  settingsContent.appendChild(shuffleSettingsTitle);

  const separator = document.createElement("hr");
  separator.style.cssText = `
        border: 0;
        border-top: 1px solid #785a28;
        margin: 10px 0;
    `;
  settingsContent.appendChild(separator);

  const cycleShuffleContainer = document.createElement("div");
  cycleShuffleContainer.className = "toggle-btn";
  cycleShuffleContainer.style.cssText = `margin-bottom: 15px;`;
  const cycleShuffleLabel = document.createElement("span");
  cycleShuffleLabel.textContent = "Cycle Shuffle:";
  const cycleShuffleSwitch = document.createElement("label");
  cycleShuffleSwitch.className = "toggle-switch";
  const cycleShuffleInput = document.createElement("input");
  cycleShuffleInput.type = "checkbox";
  cycleShuffleInput.checked = cycleShuffleEnabled;
  const cycleShuffleSlider = document.createElement("span");
  cycleShuffleSlider.className = "toggle-slider";
  cycleShuffleSwitch.appendChild(cycleShuffleInput);
  cycleShuffleSwitch.appendChild(cycleShuffleSlider);
  cycleShuffleContainer.appendChild(cycleShuffleLabel);
  cycleShuffleContainer.appendChild(cycleShuffleSwitch);
  settingsContent.appendChild(cycleShuffleContainer);

  cycleShuffleInput.addEventListener("change", () => {
    cycleShuffleEnabled = cycleShuffleInput.checked;
    saveSettings();
  });

  const cycleIntervalLabel = document.createElement("label");
  cycleIntervalLabel.textContent = "Cycle Shuffle Interval (Seconds):";
  cycleIntervalLabel.style.cssText = `margin-bottom: 5px;`;
  settingsContent.appendChild(cycleIntervalLabel);

  const cycleIntervalContainer = document.createElement("div");
  cycleIntervalContainer.style.cssText = `
        display: flex;
        align-items: center;
        gap: 15px;
        margin-bottom: 15px;
    `;
  const cycleIntervalSlider = document.createElement("input");
  cycleIntervalSlider.type = "range";
  cycleIntervalSlider.min = "10";
  cycleIntervalSlider.max = "300";
  cycleIntervalSlider.step = "1";
  cycleIntervalSlider.value = cycleInterval;
  cycleIntervalSlider.style.cssText = `
        flex: 1;
        height: 8px;
        -webkit-appearance: none;
        background: #1e2328;
        border: 1px solid #785a28;
        border-radius: 4px;
        outline: none;
    `;
  const cycleIntervalValue = document.createElement("span");
  cycleIntervalValue.textContent = cycleInterval.toString();
  cycleIntervalValue.style.width = "40px";
  const cycleLeftArrow = document.createElement("button");
  cycleLeftArrow.textContent = "<";
  cycleLeftArrow.style.cssText = `
        color: #cdbe91;
        font-size: 14px;
        font-family: 'LoL Display', 'BeaufortforLOL', sans-serif;
        font-weight: bold;
        padding: 2px 6px;
        cursor: pointer;
        background: #1e2328;
        border: 1px solid #785a28;
        border-radius: 2px;
        transition: color 0.2s, border-color 0.2s;
    `;
  cycleLeftArrow.addEventListener("click", () => {
    const step = 10;
    const newValue = Math.max(
      parseInt(cycleIntervalSlider.min),
      Math.round((parseInt(cycleIntervalSlider.value) - step) / step) * step
    );
    cycleIntervalSlider.value = newValue;
    cycleInterval = newValue;
    cycleIntervalValue.textContent = newValue.toString();
    saveSettings();
  });
  const cycleRightArrow = document.createElement("button");
  cycleRightArrow.textContent = ">";
  cycleRightArrow.style.cssText = `
        color: #cdbe91;
        font-size: 14px;
        font-family: 'LoL Display', 'BeaufortforLOL', sans-serif;
        font-weight: bold;
        padding: 2px 6px;
        cursor: pointer;
        background: #1e2328;
        border: 1px solid #785a28;
        border-radius: 2px;
        transition: color 0.2s, border-color 0.2s;
    `;
  cycleRightArrow.addEventListener("click", () => {
    const step = 10;
    const newValue = Math.min(
      parseInt(cycleIntervalSlider.max),
      Math.round((parseInt(cycleIntervalSlider.value) + step) / step) * step
    );
    cycleIntervalSlider.value = newValue;
    cycleInterval = newValue;
    cycleIntervalValue.textContent = newValue.toString();
    saveSettings();
  });
  cycleLeftArrow.addEventListener("mouseover", () => {
    cycleLeftArrow.style.color = "#f0e6d2";
    cycleLeftArrow.style.borderColor = "#c8aa6e";
  });
  cycleLeftArrow.addEventListener("mouseout", () => {
    cycleLeftArrow.style.color = "#cdbe91";
    cycleLeftArrow.style.borderColor = "#785a28";
  });
  cycleRightArrow.addEventListener("mouseover", () => {
    cycleRightArrow.style.color = "#f0e6d2";
    cycleRightArrow.style.borderColor = "#c8aa6e";
  });
  cycleRightArrow.addEventListener("mouseout", () => {
    cycleRightArrow.style.color = "#cdbe91";
    cycleRightArrow.style.borderColor = "#785a28";
  });
  cycleIntervalContainer.appendChild(cycleLeftArrow);
  cycleIntervalContainer.appendChild(cycleIntervalSlider);
  cycleIntervalContainer.appendChild(cycleRightArrow);
  cycleIntervalContainer.appendChild(cycleIntervalValue);
  settingsContent.appendChild(cycleIntervalContainer);

  cycleIntervalSlider.addEventListener("input", () => {
    cycleInterval = parseInt(cycleIntervalSlider.value);
    cycleIntervalValue.textContent = cycleInterval.toString();
    saveSettings();
  });

  const transitionDurationLabel = document.createElement("label");
  transitionDurationLabel.textContent = "Transition Duration (Seconds):";
  transitionDurationLabel.style.cssText = `margin-bottom: 5px;`;
  settingsContent.appendChild(transitionDurationLabel);

  const transitionDurationContainer = document.createElement("div");
  transitionDurationContainer.style.cssText = `
        display: flex;
        align-items: center;
        gap: 15px;
        margin-bottom: 15px;
    `;
  const transitionDurationSlider = document.createElement("input");
  transitionDurationSlider.type = "range";
  transitionDurationSlider.min = "0";
  transitionDurationSlider.max = "5";
  transitionDurationSlider.step = "0.1";
  transitionDurationSlider.value = transitionDuration;
  transitionDurationSlider.style.cssText = `
        flex: 1;
        height: 8px;
        -webkit-appearance: none;
        background: #1e2328;
        border: 1px solid #785a28;
        border-radius: 4px;
        outline: none;
    `;
  const transitionDurationValue = document.createElement("span");
  transitionDurationValue.textContent = transitionDuration.toString();
  transitionDurationValue.style.width = "40px";
  const durationLeftArrow = document.createElement("button");
  durationLeftArrow.textContent = "<";
  durationLeftArrow.style.cssText = `
        color: #cdbe91;
        font-size: 14px;
        font-family: 'LoL Display', 'BeaufortforLOL', sans-serif;
        font-weight: bold;
        padding: 2px 6px;
        cursor: pointer;
        background: #1e2328;
        border: 1px solid #785a28;
        border-radius: 2px;
        transition: color 0.2s, border-color 0.2s;
    `;
  durationLeftArrow.addEventListener("click", () => {
    const step = 0.1;
    const newValue = Math.max(
      parseFloat(transitionDurationSlider.min),
      Math.round((parseFloat(transitionDurationSlider.value) - step) * 10) / 10
    );
    transitionDurationSlider.value = newValue;
    transitionDuration = newValue;
    transitionDurationValue.textContent = newValue.toString();
    saveSettings();
  });
  const durationRightArrow = document.createElement("button");
  durationRightArrow.textContent = ">";
  durationRightArrow.style.cssText = `
        color: #cdbe91;
        font-size: 14px;
        font-family: 'LoL Display', 'BeaufortforLOL', sans-serif;
        font-weight: bold;
        padding: 2px 6px;
        cursor: pointer;
        background: #1e2328;
        border: 1px solid #785a28;
        border-radius: 2px;
        transition: color 0.2s, border-color 0.2s;
    `;
  durationRightArrow.addEventListener("click", () => {
    const step = 0.1;
    const newValue = Math.min(
      parseFloat(transitionDurationSlider.max),
      Math.round((parseFloat(transitionDurationSlider.value) + step) * 10) / 10
    );
    transitionDurationSlider.value = newValue;
    transitionDuration = newValue;
    transitionDurationValue.textContent = newValue.toString();
    saveSettings();
  });
  durationLeftArrow.addEventListener("mouseover", () => {
    durationLeftArrow.style.color = "#f0e6d2";
    durationLeftArrow.style.borderColor = "#c8aa6e";
  });
  durationLeftArrow.addEventListener("mouseout", () => {
    durationLeftArrow.style.color = "#cdbe91";
    durationLeftArrow.style.borderColor = "#785a28";
  });
  durationRightArrow.addEventListener("mouseover", () => {
    durationRightArrow.style.color = "#f0e6d2";
    durationRightArrow.style.borderColor = "#c8aa6e";
  });
  durationRightArrow.addEventListener("mouseout", () => {
    durationRightArrow.style.color = "#cdbe91";
    durationRightArrow.style.borderColor = "#785a28";
  });
  transitionDurationContainer.appendChild(durationLeftArrow);
  transitionDurationContainer.appendChild(transitionDurationSlider);
  transitionDurationContainer.appendChild(durationRightArrow);
  transitionDurationContainer.appendChild(transitionDurationValue);
  settingsContent.appendChild(transitionDurationContainer);

  transitionDurationSlider.addEventListener("input", () => {
    transitionDuration = parseFloat(transitionDurationSlider.value);
    transitionDurationValue.textContent = transitionDuration.toString();
    saveSettings();
  });

  innerContainer.appendChild(settingsContent);
  settingsContainer.appendChild(innerContainer);

  const closeButton = document.createElement("button");
  closeButton.textContent = "Close";
  closeButton.className = "settings-close-button";
  closeButton.style.cssText = `
        margin-top: 20px;
        margin-left: auto;
        margin-right: auto;
        width: 50%;
        padding: 5px 0;
        min-height: 32px;
        color: #cdbe91;
        font-size: 14px;
        font-family: 'LoL Display', 'BeaufortforLOL', sans-serif;
        font-weight: bold;
        letter-spacing: 1px;
        text-transform: uppercase;
        cursor: pointer;
        background: #1e2328;
        border: 2px solid #785a28;
        box-shadow: 0 0 1px 1px #010a13, inset 0 0 1px 1px #010a13;
        transition: color 0.2s, border-color 0.2s, box-shadow 0.2s;
    `;
  closeButton.addEventListener("mouseover", () => {
    closeButton.style.color = "#f0e6d2";
    closeButton.style.borderColor = "#c8aa6e";
    closeButton.style.boxShadow =
      "0 0 8px 4px rgba(212, 184, 117, 0.5), inset 0 0 1px 1px #010a13";
  });
  closeButton.addEventListener("mouseout", () => {
    closeButton.style.color = "#cdbe91";
    closeButton.style.borderColor = "#785a28";
    closeButton.style.boxShadow =
      "0 0 1px 1px #010a13, inset 0 0 1px 1px #010a13";
  });
  closeButton.addEventListener("click", () => {
    debugLog("Close button clicked");
    settingsWrapper.remove();
    settingsVisible = false;
    const customizerWrapper = document.getElementById(
      "client-bg-customizer-ui-wrapper"
    );
    if (customizerWrapper) {
      debugLog("Restoring customizer UI");
      customizerWrapper.style.display = "block";
      const customizerUI = document.getElementById("client-bg-customizer-ui");
      if (customizerUI) {
        const typeDropdown = customizerUI.querySelector(
          ".custom-dropdown:not(.filter-dropdown):not(.sort-dropdown)"
        );
        if (typeDropdown) {
          debugLog("Type dropdown found");
          const typeToggle = typeDropdown.querySelector(".dropdown-toggle");
          const typeMenu = typeDropdown.querySelector(".dropdown-menu");
          if (typeToggle && typeMenu) {
            debugLog("Updating dropdown to Champion");
            typeToggle.textContent = "Champion";
            const championItem = typeMenu.querySelector(
              '.dropdown-item[data-value="champion"]'
            );
            if (championItem) {
              typeMenu
                .querySelectorAll(".dropdown-item")
                .forEach((item) => item.classList.remove("selected"));
              championItem.classList.add("selected");
              debugLog("Simulating Champion dropdown click");
              championItem.click();
            }
          }
        } else {
          debugLog("Type dropdown not found, falling back to manual refresh");
          generatePreviewGroups("champion");
          const mainWindow = customizerUI.querySelector(".main-window");
          if (mainWindow && window.renderSkins) {
            debugLog("Manually rendering skins");
            window.renderSkins(previewGroups, currentSearchQuery);
          } else {
            debugLog("renderSkins not available or mainWindow not found");
          }
        }
      } else {
        debugLog("Customizer UI not found");
      }
    } else {
      debugLog("Customizer wrapper not found, recreating UI");
      createClientBackgroundCustomizerUI(container);
    }
  });
  settingsContainer.appendChild(closeButton);

  settingsWrapper.appendChild(settingsContainer);
  container.appendChild(settingsWrapper);
}

function startShuffleCycle(favoriteSkins, isFavoritesToggled) {
  if (!cycleShuffleEnabled) return;
  if (shuffleCycleIntervalId) {
    clearInterval(shuffleCycleIntervalId);
    debugLog("Cleared previous shuffle cycle");
  }
  const tftEnabled = DataStore.get("tftEnabled") !== false;
  shuffleCycleIntervalId = setInterval(() => {
    let allItems = [];
    if (isFavoritesToggled && favoriteSkins.length > 0) {
      allItems = favoriteSkins.filter((item) => tftEnabled || !item.isTFT);
      // If no valid favorites (e.g., only TFT favorites when TFT is disabled), fall back to all skins
      if (allItems.length === 0) {
        allItems = previewGroups.flatMap((group) =>
          group.items.filter((item) => tftEnabled || !item.isTFT)
        );
        debugLog("No valid favorites, falling back to all skins");
      }
    } else {
      allItems = previewGroups.flatMap((group) =>
        group.items.filter((item) => tftEnabled || !item.isTFT)
      );
    }
    if (allItems.length === 0) {
      debugLog("No items available for shuffle cycle");
      clearInterval(shuffleCycleIntervalId);
      shuffleCycleIntervalId = null;
      return;
    }
    const randomItem = allItems[Math.floor(Math.random() * allItems.length)];
    DataStore.set("selectedSkin", {
      name: randomItem.name,
      tilePath: randomItem.tilePath,
      splashPath: randomItem.splashPath,
      uncenteredSplashPath: randomItem.uncenteredSplashPath,
      skinLineId: randomItem.skinLineId,
      skinLineName: randomItem.skinLineName,
      isTFT: randomItem.isTFT,
    });
    applyBackground(randomItem);
    debugLog(`Shuffle cycle applied: ${randomItem.name}`);
  }, cycleInterval * 1000);
  debugLog(`Started shuffle cycle with interval ${cycleInterval} seconds`);
}

function createClientBackgroundCustomizerUI(container) {
  const savedSkin = DataStore.get("selectedSkin");
  let favoriteSkins = DataStore.get("favoriteSkins") || [];
  let isFavoritesToggled = DataStore.get("favoritesToggled") || false;
  let isInitialLoad = true;
  let currentSearchQuery = "";

  // Remove existing wrapper and backdrop to prevent duplicates
  let existingWrapper = document.getElementById(
    "client-bg-customizer-ui-wrapper"
  );
  if (existingWrapper) {
    debugLog(
      "Existing customizer wrapper found, removing to prevent duplicates",
      null,
      "warn"
    );
    existingWrapper.remove();
  }
  let existingBackdrop = document.querySelector(
    ".client-bg-customizer-backdrop"
  );
  if (existingBackdrop) {
    debugLog(
      "Existing backdrop found, removing to prevent duplicates",
      null,
      "warn"
    );
    existingBackdrop.remove();
  }

  const backdrop = document.createElement("div");
  backdrop.className = "client-bg-customizer-backdrop";
  backdrop.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 9997;
    `;

  const uiWrapper = document.createElement("div");
  uiWrapper.id = "client-bg-customizer-ui-wrapper";
  uiWrapper.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 9998;
    `;

  const uiContainer = document.createElement("div");
  uiContainer.id = "client-bg-customizer-ui";
  uiContainer.className = "lol-custom-ui";
  uiContainer.style.cssText = `
        padding: 0;
        width: 800px;
        height: 600px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        font-family: 'LoL Display', 'BeaufortforLOL', sans-serif;
        background: #010a13;
        border: 1px solid #785a28;
        border-radius: 2px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.8);
    `;

  let styleElement = document.getElementById("client-bg-customizer-style");
  if (!styleElement) {
    styleElement = document.createElement("style");
    styleElement.id = "client-bg-customizer-style";
    styleElement.textContent = `
            .lol-custom-ui {
                font-family: 'LoL Display', 'BeaufortforLOL', sans-serif;
                color: #a09b8c;
                background: #010a13;
                border: 1px solid #785a28;
                border-radius: 2px;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.8);
                overflow: hidden;
            }
            .lol-custom-ui input {
                background: #010a13;
                border: 1px solid #785a28;
                color: #cdbe91;
                border-radius: 0;
                padding: 8px;
                font-family: 'LoL Display', 'BeaufortforLOL', sans-serif;
                transition: all 0.2s, border-bottom-color 0.2s;
                height: 32px;
                box-sizing: border-box;
            }
            .lol-custom-ui input:hover {
                background: #1e2328;
                border-color: #785a28;
                border-bottom-color: #c8aa6e;
                color: #f0e6d2;
                cursor: pointer;
            }
            .lol-custom-ui input:focus {
                outline: none;
                background: #1e2328;
                color: #f0e6d2;
                border: 1px solid #785a28;
                border-bottom: 1px solid #c8aa6e;
                cursor: text;
            }
            .lol-custom-ui .header {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 8px 20px;
                border-bottom: 1px solid #785a28;
                background: #010a13;
                flex-shrink: 0;
                height: 32px;
                position: relative;
            }
            .lol-custom-ui .header h3 {
                color: #f0e6d2;
                font-weight: bold;
                letter-spacing: 1px;
                text-transform: uppercase;
                font-size: 18px;
                margin: 0;
                font-family: 'LoL Display', 'BeaufortforLOL', sans-serif;
                text-align: center;
            }
            .lol-custom-ui .bottom-bar {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 8px 20px;
                border-top: 1px solid #785a28;
                background: #010a13;
                flex-shrink: 0;
                height: 32px;
                gap: 20px;
            }
            .lol-custom-ui .search-bar {
                display: flex;
                align-items: center;
                padding: 10px 20px;
                background: #010a13;
                flex-shrink: 0;
                height: 32px;
                justify-content: space-between;
            }
            .lol-custom-ui .custom-dropdown {
                position: relative;
                display: inline-block;
                width: 150px;
                margin-right: 5px;
                font-family: 'LoL Display', 'BeaufortforLOL', sans-serif;
            }
            .lol-custom-ui .custom-dropdown.filter-dropdown {
                width: 120px;
            }
            .lol-custom-ui .custom-dropdown:last-child {
                margin-right: 0;
            }
            .lol-custom-ui .dropdown-toggle {
                background: #010a13;
                border: 1px solid #785a28;
                color: #cdbe91;
                font-size: 11px;
                font-weight: bold;
                letter-spacing: 1px;
                text-transform: uppercase;
                padding: 6px 24px 6px 8px;
                height: 27px;
                cursor: pointer;
                border-radius: 0;
                display: flex;
                align-items: center;
                justify-content: space-between;
                box-sizing: border-box;
                box-shadow: 0 0 1px 1px #010a13, inset 0 0 1px 1px #010a13;
                transition: color 0.2s, border-color 0.2s, box-shadow 0.2s;
            }
            .lol-custom-ui .dropdown-toggle:hover {
                background: #1e2328;
                border-color: #c8aa6e;
                color: #f0e6d2;
                box-shadow: 0 0 8px 4px rgba(212, 184, 117, 0.5), inset 0 0 1px 1px #010a13;
            }
            .lol-custom-ui .dropdown-toggle::after {
                content: '';
                background: url(/fe/lol-uikit/up-down-arrow.png) center no-repeat;
                width: 13px;
                height: 18px;
                position: absolute;
                right: 8px;
                top: 50%;
                transform: translateY(-50%);
                pointer-events: none;
            }
            .lol-custom-ui .dropdown-menu {
                display: none;
                position: absolute;
                top: 100%;
                left: 0;
                width: 100%;
                background: #010a13;
                border: 1px solid #785a28;
                border-radius: 0;
                z-index: 1000;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.8);
                list-style: none;
                padding: 0;
                margin: 0;
                box-sizing: border-box;
            }
            .lol-custom-ui .dropdown-menu.show {
                display: block;
            }
            .lol-custom-ui .dropdown-item {
                padding: 8px 12px;
                color: #cdbe91;
                font-size: 11px;
                font-weight: bold;
                letter-spacing: 1px;
                text-transform: uppercase;
                cursor: pointer;
                transition: all 0.2s;
                border-bottom: 1px solid #785a28;
                position: relative;
            }
            .lol-custom-ui .dropdown-item:hover {
                background: #1e2328;
                color: #f0e6d2;
                border-left: 1px solid #c8aa6e;
                border-right: 1px solid #c8aa6e;
            }
            .lol-custom-ui .dropdown-item:last-child {
                border-bottom: none;
            }
            .lol-custom-ui .dropdown-item.selected::after {
                background: url(/fe/lol-uikit/dropdown-check.png) center no-repeat;
                width: 14px;
                height: 11px;
                position: absolute;
                right: 13px;
                top: 50%;
                transform: translate(0, -50%);
                content: '';
            }
            .lol-custom-ui .main-window {
                padding: 10px;
                flex-grow: 1;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 15px;
            }
            .lol-custom-ui .main-window::-webkit-scrollbar {
                width: 10px;
            }
            .lol-custom-ui .main-window::-webkit-scrollbar-track {
                background: transparent;
            }
            .lol-custom-ui .main-window::-webkit-scrollbar-thumb {
                background: #765b2a;
                border-radius: 4px;
                border: 2px solid #010a13;
                min-height: 50px;
            }
            .lol-custom-ui .skin-group-title {
                color: #f0e6d2;
                font-size: 22px;
                padding-left: 10px;
                font-family: 'LoL Display', 'BeaufortforLOL', sans-serif;
                text-transform: uppercase;
                font-weight: bold;
            }
            .lol-custom-ui .skin-group-title .group-favorite-button {
                background: #0000 url(/fe/lol-parties/button-favorite-off.png) no-repeat top;
                background-size: cover;
                border: 0;
                cursor: pointer;
                height: 48px;
                width: 48px;
                display: inline-block;
                vertical-align: baseline;
                margin-left: 8px;
                position: relative;
                top: 15px;
                pointer-events: all;
                transition: opacity 0.2s;
                border-radius: 50%;
            }
            .lol-custom-ui .skin-group-title .group-favorite-button:hover {
                background: #0000 url(/fe/lol-parties/button-favorite-on.png) no-repeat top;
                background-size: cover;
                opacity: 0.8;
            }
            .lol-custom-ui .skin-group-title .group-favorite-button.favorited {
                background: #0000 url(/fe/lol-parties/button-favorite-on.png) no-repeat top;
                background-size: cover;
                opacity: 1;
            }
            .lol-custom-ui .skin-group {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 5px;
                width: 100%;
                box-sizing: border-box;
            }
            .lol-custom-ui .skin-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                margin: 0;
                text-align: center;
                height: 240px;
            }
            .lol-custom-ui .skin-image {
                width: 180px;
                height: 180px;
                background-color: #010a13;
                border: 1px solid #785a28;
                transition: border-color 0.2s, transform 0.2s;
                background-size: cover;
                background-position: center;
                cursor: pointer;
                position: relative;
            }
            .lol-custom-ui .skin-image.failed {
                background-image: none !important;
                background-color: #010a13 !important;
                border: 1px solid #785a28 !important;
                box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .lol-custom-ui .skin-image .failed-text {
                color: #cdbe91;
                font-size: 24px;
                font-family: 'LoL Display', 'BeaufortforLOL', sans-serif;
                text-align: center;
                padding: 10px;
                background: rgba(0, 0, 0, 0.0);
                border-radius: 4px;
                max-width: 160px;
                line-height: 1.2;
            }
            .lol-custom-ui .skin-image:hover {
                border-color: #c8aa6e;
            }
            .lol-custom-ui .skin-image.selected {
                border: 5px solid;
                border-image: linear-gradient(to bottom, #c8aa6e, #785a28) 1;
                transform: scale(0.99);
                box-shadow: 0 0 8px rgba(200, 170, 110, 0.5);
            }
            .lol-custom-ui .skin-image .favorite-button {
                background: #0000 url(/fe/lol-parties/button-favorite-off.png) no-repeat top;
                background-size: cover;
                border: 0;
                cursor: pointer;
                height: 48px;
                width: 48px;
                position: absolute;
                top: 8px;
                right: 8px;
                pointer-events: all;
                transition: opacity 0.2s;
                border-radius: 50%;
                z-index: 10;
            }
            .lol-custom-ui .skin-image .favorite-button:hover {
                background: #0000 url(/fe/lol-parties/button-favorite-on.png) no-repeat top;
                background-size: cover;
                opacity: 0.8;
            }
            .lol-custom-ui .skin-image .favorite-button.favorited {
                background: #0000 url(/fe/lol-parties/button-favorite-on.png) no-repeat top;
                background-size: cover;
                opacity: 1;
            }
            .lol-custom-ui .skin-label {
                font-size: 14px;
                color: #f0e6d2;
                margin-top: 10px;
                max-width: 180px;
                height: 36px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: normal;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
            }
            .lol-custom-ui .bottom-bar button {
                color: #cdbe91;
                font-size: 14px;
                font-family: 'LoL Display', 'BeaufortforLOL', sans-serif;
                font-weight: bold;
                letter-spacing: 1px;
                text-transform: uppercase;
                width: 140px;
                padding: 5px 0;
                min-height: 32px;
                cursor: pointer;
                background: #1e2328;
                border: 2px solid #785a28;
                box-shadow: 0 0 1px 1px #010a13, inset 0 0 1px 1px #010a13;
                display: flex;
                justify-content: center;
                align-items: center;
                transition: color 0.2s, border-color 0.2s, box-shadow 0.2s;
            }
            .lol-custom-ui .bottom-bar button:hover {
                color: #f0e6d2;
                border-color: #c8aa6e;
                box-shadow: 0 0 8px 4px rgba(212, 184, 117, 0.5), inset 0 0 1px 1px #010a13;
                animation: glowFade 1s ease-out forwards;
            }
            .lol-custom-ui .bottom-bar button:hover svg path {
                fill: #f0e6d2;
            }
            .lol-custom-ui .bottom-bar button:active {
                color: #c8aa6e;
                border-color: #c8aa6e;
                box-shadow: 0 0 1px 1px #010a13, inset 0 0 1px 1px #010a13;
            }
            .lol-custom-ui .bottom-bar button:active svg path {
                fill: #c8aa6e;
            }
            .lol-custom-ui .bottom-bar button.randomize-button {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 5px 0;
                width: 140px;
            }
            .lol-custom-ui .bottom-bar button.favorites-toggle {
                padding: 0;
                width: 70px;
                min-height: 32px;
                background: none;
                border: none;
                box-shadow: none;
            }
            .lol-custom-ui .bottom-bar button.favorites-toggle:hover {
                color: #cdbe91;
                border: none;
                box-shadow: none;
                animation: none;
            }
            .lol-custom-ui .bottom-bar button.favorites-toggle:active {
                color: #cdbe91;
                border: none;
                box-shadow: none;
            }
            .lol-custom-ui .favorites-toggle .toggle-container {
                background-image: url(/fe/lol-parties/toggle-slider-closed.png);
                background-position: 50%;
                background-repeat: no-repeat;
                background-size: contain;
                cursor: pointer;
                height: 29px;
                width: 70px;
                position: relative;
            }
            .lol-custom-ui .favorites-toggle .toggled {
                background-image: url(/fe/lol-parties/toggle-slider-open.png);
                background-position: 50%;
                background-repeat: no-repeat;
                background-size: contain;
                height: 29px;
                width: 70px;
                position: absolute;
                top: 0;
                left: 0;
                opacity: 0;
                transition: opacity 0.5s;
            }
            .lol-custom-ui .favorites-toggle .toggled.toggled-on {
                opacity: 1;
            }
            .lol-custom-ui .favorites-toggle .toggle-button {
                background-image: url(/fe/lol-parties/button-favorite-off.png);
                background-position: 50%;
                background-repeat: no-repeat;
                background-size: contain;
                height: 34px;
                width: 34px;
                position: relative;
                left: 0;
                top: -2px;
                transition: left 0.5s;
            }
            .lol-custom-ui .favorites-toggle.toggled .toggle-button {
                background-image: url(/fe/lol-parties/button-favorite-on.png);
                left: 34px;
                right: auto;
            }
            .lol-custom-ui .no-favorites-message {
                color: #f0e6d2;
                font-size: 16px;
                text-align: center;
                padding: 20px;
                font-family: 'LoL Display', 'BeaufortforLOL', sans-serif;
            }
            .lol-custom-ui .lol-uikit-close-button {
                width: 28px;
                height: 28px;
                border-radius: 50%;
                background: linear-gradient(to top, #463714 4%, #785a28 23%, #c89b3c 90%, #c8aa6e 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                position: absolute;
                right: 8px;
                top: 50%;
                transform: translateY(-50%);
            }
            .lol-custom-ui .lol-uikit-close-button .contents {
                width: 24px;
                height: 24px;
                border-radius: 50%;
                background-color: #1e282d;
                transition: box-shadow 150ms ease-out, color 150ms ease-out;
            }
            .lol-custom-ui .lol-uikit-close-button .close-icon {
                width: 24px;
                height: 24px;
                transform: translate(0px, 0px);
                -webkit-mask: url(/fe/lol-uikit/images/icon_settings.png) no-repeat center;
                -webkit-mask-size: 18px 18px;
                background-color: #cdbe91;
            }
            .lol-custom-ui .lol-uikit-close-button:hover {
                background: linear-gradient(to top, #c89b3c 0%, #f0e6d2 100%);
            }
            .lol-custom-ui .lol-uikit-close-button:hover .contents {
                background: linear-gradient(to top, #3c3c41 0%, #1e2328 100%);
            }
            .lol-custom-ui .lol-uikit-close-button:hover .close-icon {
                background-color: #f0e6d2;
            }
            .lol-custom-ui .lol-uikit-close-button:active {
                background: linear-gradient(to top, #785a28 0%, #463714 100%);
            }
            .lol-custom-ui .lol-uikit-close-button:active .close-icon {
                background-color: #785a28;
            }
            .lol-custom-ui .lol-uikit-close-button:active .contents {
                background: none;
                background-color: #1e282d;
            }
            .lol-custom-ui .toggle-btn {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-top: 10px;
            }
            .lol-custom-ui .toggle-switch {
                position: relative;
                display: inline-block;
                width: 40px;
                height: 20px;
            }
            .lol-custom-ui .toggle-switch input {
                opacity: 0;
                width: 0;
                height: 0;
            }
            .lol-custom-ui .toggle-slider {
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: #1e2328;
                transition: .4s;
                border-radius: 20px;
                border: 1px solid #785a28;
            }
            .lol-custom-ui .toggle-slider:before {
                position: absolute;
                content: "";
                height: 14px;
                width: 14px;
                left: 2px;
                bottom: 2px;
                background-color: #cdbe91;
                transition: .4s;
                border-radius: 50%;
            }
            .lol-custom-ui input:checked + .toggle-slider {
                background-color: #1e2328;
                border-color: #c8aa6e;
            }
            .lol-custom-ui input:checked + .toggle-slider:before {
                transform: translateX(20px);
                background-color: #f0e6d2;
            }
            .lol-custom-ui input[type=range]::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 14px;
                height: 14px;
                border-radius: 50%;
                background: #cdbe91;
                cursor: pointer;
                border: 1px solid #785a28;
            }
            .lol-custom-ui input[type=range]::-moz-range-thumb {
                width: 14px;
                height: 14px;
                border-radius: 50%;
                background: #cdbe91;
                cursor: pointer;
                border: 1px solid #785a28;
            }
            .lol-custom-ui .settings-close-button, .lol-custom-ui .profiles-close-button {
                margin-top: 20px;
                margin-left: auto;
                margin-right: auto;
                width: 50%;
                padding: 5px 0;
                min-height: 32px;
                color: #cdbe91;
                font-size: 14px;
                font-family: 'LoL Display', 'BeaufortforLOL', sans-serif;
                font-weight: bold;
                letter-spacing: 1px;
                text-transform: uppercase;
                cursor: pointer;
                background: #1e2328;
                border: 2px solid #785a28;
                box-shadow: 0 0 1px 1px #010a13, inset 0 0 1px 1px #010a13;
                transition: color 0.2s, border-color 0.2s, box-shadow 0.2s;
            }
            .lol-custom-ui .settings-close-button:hover, .lol-custom-ui .profiles-close-button:hover {
                color: #f0e6d2;
                border-color: #c8aa6e;
                box-shadow: 0 0 8px 4px rgba(212, 184, 117, 0.5), inset 0 0 1px 1px #010a13;
                animation: glowFade 1s ease-out forwards;
            }
            .lol-custom-ui .settings-close-button:active, .lol-custom-ui .profiles-close-button:active {
                color: #c8aa6e;
                border-color: #c8aa6e;
                box-shadow: 0 0 1px 1px #010a13, inset 0 0 1px 1px #010a13;
            }
            @keyframes glowFade {
                0% { box-shadow: 0 0 8px 4px rgba(212, 184, 117, 0.5), inset 0 0 1px 1px #010a13; }
                100% { box-shadow: 0 0 1px 1px #010a13, inset 0 0 1px 1px #010a13; }
            }
            .client-bg-show-button {
                opacity: 0;
                transition: 0.2s !important;
            }
            .client-bg-show-button:hover {
                opacity: 1;
                transition: 0.2s !important;
            }
        `;
    document.head.appendChild(styleElement);
  }

  const header = document.createElement("div");
  header.className = "header";

  const title = document.createElement("h3");
  title.textContent = "BACKGROUND CUSTOMIZER";
  header.appendChild(title);

  const settingsButton = document.createElement("div");
  settingsButton.className = "lol-uikit-close-button";
  settingsButton.setAttribute("button-type", "cog");
  const contents = document.createElement("div");
  contents.className = "contents";
  const closeIcon = document.createElement("div");
  closeIcon.className = "close-icon";
  contents.appendChild(closeIcon);
  settingsButton.appendChild(contents);
  settingsButton.addEventListener("click", () => {
    if (settingsVisible) {
      const settingsWrapper = document.getElementById(
        "client-bg-settings-ui-wrapper"
      );
      if (settingsWrapper) settingsWrapper.remove();
      settingsVisible = false;
    } else {
      createSettingsUI(container);
      settingsVisible = true;
      uiWrapper.style.display = "none";
    }
  });
  header.appendChild(settingsButton);

  uiContainer.appendChild(header);

  const searchBar = document.createElement("div");
  searchBar.className = "search-bar";

  const searchInput = document.createElement("input");
  searchInput.placeholder = "Search";
  searchInput.style.width = "40%";

  const typeDropdown = document.createElement("div");
  typeDropdown.className = "custom-dropdown";
  typeDropdown.style.width = "150px";

  const typeToggle = document.createElement("div");
  typeToggle.className = "dropdown-toggle";
  typeToggle.textContent = "Champion";

  const typeMenu = document.createElement("ul");
  typeMenu.className = "dropdown-menu";
  let selectedType = "champion";
  const typeOptions = [
    { label: "Champion", value: "champion" },
    { label: "Universes", value: "universes" },
    { label: "Skinlines", value: "skinlines" },
  ];
  typeOptions.forEach((option) => {
    const item = document.createElement("li");
    item.className = "dropdown-item";
    item.textContent = option.label;
    item.dataset.value = option.value;
    if (option.value === "champion") item.classList.add("selected");
    item.addEventListener("click", () => {
      typeToggle.textContent = option.label;
      typeMenu
        .querySelectorAll(".dropdown-item")
        .forEach((i) => i.classList.remove("selected"));
      item.classList.add("selected");
      selectedType = option.value;
      typeMenu.classList.remove("show");
      debugLog(`Selected type: ${selectedType}`);
      generatePreviewGroups(selectedType);
      renderSkins(previewGroups, currentSearchQuery);
    });
    typeMenu.appendChild(item);
  });
  typeToggle.addEventListener("click", () => {
    const isOpen = typeMenu.classList.contains("show");
    document
      .querySelectorAll(".dropdown-menu")
      .forEach((m) => m.classList.remove("show"));
    if (!isOpen) {
      typeMenu.classList.add("show");
    }
  });
  typeDropdown.appendChild(typeToggle);
  typeDropdown.appendChild(typeMenu);

  const filterDropdown = document.createElement("div");
  filterDropdown.className = "custom-dropdown filter-dropdown";
  filterDropdown.style.width = "120px";

  const filterToggle = document.createElement("div");
  filterToggle.className = "dropdown-toggle";
  filterToggle.textContent = isFavoritesToggled ? "Favorites" : "All Skins";

  const filterMenu = document.createElement("ul");
  filterMenu.className = "dropdown-menu";
  let selectedFilter = isFavoritesToggled ? "favorites" : "all";
  const filterOptions = ["All Skins", "Favorites"];
  filterOptions.forEach((option) => {
    const item = document.createElement("li");
    item.className = "dropdown-item";
    item.textContent = option;
    item.dataset.value = option.toLowerCase().replace(" ", "");
    if (
      (option === "Favorites" && isFavoritesToggled) ||
      (option === "All Skins" && !isFavoritesToggled)
    ) {
      item.classList.add("selected");
    }
    item.addEventListener("click", () => {
      filterToggle.textContent = option;
      filterMenu
        .querySelectorAll(".dropdown-item")
        .forEach((i) => i.classList.remove("selected"));
      item.classList.add("selected");
      selectedFilter = item.dataset.value;
      isFavoritesToggled = selectedFilter === "favorites";
      DataStore.set("favoritesToggled", isFavoritesToggled);
      filterMenu.classList.remove("show");
      renderSkins(previewGroups, currentSearchQuery, selectedFilter);
    });
    filterMenu.appendChild(item);
  });
  filterDropdown.appendChild(filterToggle);
  filterDropdown.appendChild(filterMenu);

  const sortDropdown = document.createElement("div");
  sortDropdown.className = "custom-dropdown";
  sortDropdown.style.width = "150px";

  const sortToggle = document.createElement("div");
  sortToggle.className = "dropdown-toggle";
  sortToggle.textContent = "Alphabetical▼";

  const sortMenu = document.createElement("ul");
  sortMenu.className = "dropdown-menu";
  let selectedSort = "alphabetical";
  const sortOptions = [
    { label: "Alphabetical▼", value: "alphabetical" },
    { label: "Alphabetical▲", value: "alphabetical-reverse" },
  ];
  sortOptions.forEach((option) => {
    const item = document.createElement("li");
    item.className = "dropdown-item";
    item.textContent = option.label;
    item.dataset.value = option.value;
    if (option.value === "alphabetical") item.classList.add("selected");
    item.addEventListener("click", () => {
      sortToggle.textContent = option.label;
      sortMenu
        .querySelectorAll(".dropdown-item")
        .forEach((i) => i.classList.remove("selected"));
      item.classList.add("selected");
      selectedSort = option.value;
      sortMenu.classList.remove("show");
      renderSkins(
        previewGroups,
        currentSearchQuery,
        selectedFilter,
        selectedSort
      );
    });
    sortMenu.appendChild(item);
  });
  sortDropdown.appendChild(sortToggle);
  sortDropdown.appendChild(sortMenu);

  [filterToggle, sortToggle].forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const menu = toggle.nextElementSibling;
      const isOpen = menu.classList.contains("show");
      document
        .querySelectorAll(".dropdown-menu")
        .forEach((m) => m.classList.remove("show"));
      if (!isOpen) {
        menu.classList.add("show");
      }
    });
  });

  searchInput.addEventListener("input", () => {
    currentSearchQuery = searchInput.value.toLowerCase().trim();
    renderSkins(
      previewGroups,
      currentSearchQuery,
      selectedFilter,
      selectedSort
    );
  });

  searchBar.appendChild(searchInput);
  searchBar.appendChild(typeDropdown);
  searchBar.appendChild(filterDropdown);
  searchBar.appendChild(sortDropdown);

  uiContainer.appendChild(searchBar);

  const mainWindow = document.createElement("div");
  mainWindow.className = "main-window";

  function renderSkins(
    groups,
    searchQuery = "",
    filterOverride = "all",
    sortOverride = "alphabetical"
  ) {
    const mainWindow = document.querySelector(".main-window");
    if (!mainWindow) {
      debugLog("Main window not found", null, "error");
      return;
    }

    mainWindow.innerHTML = "";
    let renderGroups = JSON.parse(JSON.stringify(groups));
    let favoriteSkins = DataStore.get("favoriteSkins") || [];
    const selectedFilter =
      filterOverride ||
      document.querySelector(".filter-dropdown .dropdown-item.selected")
        ?.dataset.value ||
      "all";
    const selectedSort =
      sortOverride ||
      document.querySelector(".sort-dropdown .dropdown-item.selected")?.dataset
        .value ||
      "alphabetical";

    if (selectedFilter === "favorites") {
      if (favoriteSkins.length === 0) {
        const noFavoritesMessage = document.createElement("div");
        noFavoritesMessage.className = "no-favorites-message";
        noFavoritesMessage.textContent = "No favorited skins";
        mainWindow.appendChild(noFavoritesMessage);
        return;
      }
      renderGroups = renderGroups
        .map((group) => ({
          title: group.title,
          items: group.items.filter((item) =>
            favoriteSkins.some(
              (fav) => fav.name === item.name && fav.isTFT === item.isTFT
            )
          ),
        }))
        .filter((group) => group.items.length > 0);
    }

    if (searchQuery) {
      renderGroups = renderGroups
        .map((group) => ({
          title: group.title,
          items: group.items.filter(
            (item) =>
              item.name.toLowerCase().includes(searchQuery) ||
              group.title.toLowerCase().includes(searchQuery)
          ),
        }))
        .filter(
          (group) =>
            group.items.length > 0 ||
            group.title.toLowerCase().includes(searchQuery)
        );
    }

    if (selectedSort === "alphabetical") {
      renderGroups.sort((a, b) => a.title.localeCompare(b.title));
      renderGroups.forEach((group) => {
        group.items.sort((a, b) => a.name.localeCompare(b.name));
      });
    } else {
      renderGroups.sort((a, b) => b.title.localeCompare(a.title));
      renderGroups.forEach((group) => {
        group.items.sort((a, b) => b.name.localeCompare(a.name));
      });
    }

    if (
      renderGroups.length === 0 &&
      !searchQuery &&
      selectedFilter !== "favorites"
    ) {
      debugLog(
        "No groups to render, regenerating with champion grouping",
        null,
        "warn"
      );
      generatePreviewGroups("champion");
      renderGroups = previewGroups;
    }

    renderGroups.forEach((group) => {
      const groupTitle = document.createElement("div");
      groupTitle.className = "skin-group-title";
      const titleSpan = document.createElement("span");
      titleSpan.textContent = group.title;
      groupTitle.appendChild(titleSpan);
      groupTitle.dataset.groupTitle = group.title;

      const groupFavoriteButton = document.createElement("button");
      groupFavoriteButton.className = "group-favorite-button";
      const allFavorited = group.items.every((item) =>
        favoriteSkins.some(
          (fav) => fav.name === item.name && fav.isTFT === item.isTFT
        )
      );
      if (allFavorited) {
        groupFavoriteButton.classList.add("favorited");
      }
      groupFavoriteButton.addEventListener("click", () => {
        const isAllFavorited = group.items.every((item) =>
          favoriteSkins.some(
            (fav) => fav.name === item.name && fav.isTFT === item.isTFT
          )
        );
        if (isAllFavorited) {
          favoriteSkins = favoriteSkins.filter(
            (fav) =>
              !group.items.some(
                (item) => item.name === fav.name && item.isTFT === item.isTFT
              )
          );
          groupFavoriteButton.classList.remove("favorited");
          const skinButtons =
            groupTitle.nextElementSibling.querySelectorAll(".favorite-button");
          skinButtons.forEach((btn) => btn.classList.remove("favorited"));
        } else {
          group.items.forEach((item) => {
            if (
              !favoriteSkins.some(
                (fav) => fav.name === item.name && fav.isTFT === item.isTFT
              )
            ) {
              favoriteSkins.push({
                name: item.name,
                tilePath: item.tilePath,
                splashPath: item.splashPath,
                uncenteredSplashPath: item.uncenteredSplashPath,
                skinLineId: item.skinLineId,
                skinLineName: item.skinLineName,
                isTFT: item.isTFT,
              });
            }
          });
          groupFavoriteButton.classList.add("favorited");
          const skinButtons =
            groupTitle.nextElementSibling.querySelectorAll(".favorite-button");
          skinButtons.forEach((btn) => btn.classList.add("favorited"));
        }
        DataStore.set("favoriteSkins", favoriteSkins);
        renderSkins(previewGroups, searchQuery, selectedFilter, selectedSort);
      });
      groupTitle.appendChild(groupFavoriteButton);
      mainWindow.appendChild(groupTitle);

      const skinGroup = document.createElement("div");
      skinGroup.className = "skin-group";
      group.items.forEach((item) => {
        const skinContainer = document.createElement("div");
        skinContainer.className = "skin-container";
        skinContainer.style.position = "relative";

        const skinImage = document.createElement("div");
        skinImage.className = "skin-image";
        skinImage.dataset.tilePath = item.tilePath || "";
        skinImage.dataset.name = item.name;
        skinImage.dataset.splashPath = item.splashPath;
        skinImage.dataset.uncenteredSplashPath = item.uncenteredSplashPath;
        skinImage.dataset.skinLineId = item.skinLineId || "";
        skinImage.dataset.skinLineName = item.skinLineName || "";
        skinImage.dataset.isTFT = item.isTFT ? "true" : "false";
        skinImage.style.position = "relative";
        skinImage.style.boxSizing = "border-box";

        const handleImageError = () => {
          debugLog(`Image failed to load for ${item.name}: ${item.tilePath}`);
          skinImage.className = "skin-image failed";
          skinImage.style.backgroundImage = "none";
          const failedText = document.createElement("div");
          failedText.className = "failed-text";
          failedText.textContent = "Failed to Load Preview";
          skinImage.appendChild(failedText);
        };

        if (item.tilePath) {
          skinImage.style.backgroundImage = `url(${item.tilePath})`;
          const img = new Image();
          img.src = item.tilePath;
          img.onerror = handleImageError;
        } else {
          handleImageError();
        }

        if (
          savedSkin &&
          savedSkin.name.trim().toLowerCase() ===
            item.name.trim().toLowerCase() &&
          savedSkin.isTFT === item.isTFT
        ) {
          skinImage.classList.add("selected");
        }
        skinImage.addEventListener("click", () => {
          document
            .querySelectorAll(".skin-image")
            .forEach((img) => img.classList.remove("selected"));
          skinImage.classList.add("selected");
          const selectedSkin = {
            name: item.name,
            tilePath: item.tilePath,
            splashPath: item.splashPath,
            uncenteredSplashPath: item.uncenteredSplashPath,
            skinLineId: item.skinLineId,
            skinLineName: item.skinLineName,
            isTFT: item.isTFT,
          };
          DataStore.set("selectedSkin", selectedSkin);
          applyBackground(selectedSkin);
        });
        const skinFavoriteButton = document.createElement("button");
        skinFavoriteButton.className = "favorite-button";
        if (
          favoriteSkins.some(
            (fav) => fav.name === item.name && fav.isTFT === item.isTFT
          )
        ) {
          skinFavoriteButton.classList.add("favorited");
        }
        skinFavoriteButton.addEventListener("click", (e) => {
          e.stopPropagation();
          const isFavorited = favoriteSkins.some(
            (fav) => fav.name === item.name && fav.isTFT === item.isTFT
          );
          if (isFavorited) {
            favoriteSkins = favoriteSkins.filter(
              (fav) => !(fav.name === item.name && fav.isTFT === item.isTFT)
            );
            skinFavoriteButton.classList.remove("favorited");
          } else {
            favoriteSkins.push({
              name: item.name,
              tilePath: item.tilePath,
              splashPath: item.splashPath,
              uncenteredSplashPath: item.uncenteredSplashPath,
              skinLineId: item.skinLineId,
              skinLineName: item.skinLineName,
              isTFT: item.isTFT,
            });
            skinFavoriteButton.classList.add("favorited");
          }
          DataStore.set("favoriteSkins", favoriteSkins);
          window.favoriteSkins = favoriteSkins;
          const groupFavButton = skinContainer
            .closest(".skin-group")
            .previousElementSibling.querySelector(".group-favorite-button");
          const allFavorited = group.items.every((it) =>
            favoriteSkins.some(
              (fav) => fav.name === it.name && fav.isTFT === it.isTFT
            )
          );
          groupFavButton.classList.toggle("favorited", allFavorited);
          renderSkins(previewGroups, searchQuery, selectedFilter, selectedSort);
        });
        skinImage.appendChild(skinFavoriteButton);
        skinContainer.appendChild(skinImage);

        const label = document.createElement("div");
        label.className = "skin-label";
        label.textContent = item.name;
        skinContainer.appendChild(label);

        skinGroup.appendChild(skinContainer);
      });
      mainWindow.appendChild(skinGroup);
    });

    if (savedSkin && savedSkin.name && isInitialLoad) {
      setTimeout(() => {
        const escapedName = CSS.escape(savedSkin.name);
        const selector = `.skin-image[data-name="${escapedName}"][data-is-tft="${savedSkin.isTFT}"]`;
        const selectedImage = mainWindow.querySelector(selector);
        if (selectedImage) {
          selectedImage.classList.add("selected");
          selectedImage.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 200);
      isInitialLoad = false;
    }

    window.addMorePreviews = (newGroups) => {
      previewGroups.push(...newGroups);
      renderSkins(previewGroups, searchQuery, selectedFilter, selectedSort);
    };
  }

  uiContainer.appendChild(mainWindow);

  const bottomBar = document.createElement("div");
  bottomBar.className = "bottom-bar";

  const resetFavoritesBtn = document.createElement("button");
  resetFavoritesBtn.textContent = "RESET FAVORITES";
  resetFavoritesBtn.addEventListener("click", () => {
    favoriteSkins = [];
    DataStore.set("favoriteSkins", favoriteSkins);
    document
      .querySelectorAll(".favorite-button")
      .forEach((btn) => btn.classList.remove("favorited"));
    document
      .querySelectorAll(".group-favorite-button")
      .forEach((btn) => btn.classList.remove("favorited"));
    renderSkins(
      previewGroups,
      currentSearchQuery,
      selectedFilter,
      selectedSort
    );
  });
  bottomBar.appendChild(resetFavoritesBtn);

  const favoritesToggleBtn = document.createElement("button");
  favoritesToggleBtn.className = "favorites-toggle";
  if (isFavoritesToggled) {
    favoritesToggleBtn.classList.add("toggled");
  }
  const toggleContainer = document.createElement("div");
  toggleContainer.className = "toggle-container";
  const toggledDiv = document.createElement("div");
  toggledDiv.className = "toggled";
  if (isFavoritesToggled) {
    toggledDiv.classList.add("toggled-on");
  }
  const toggleButton = document.createElement("div");
  toggleButton.className = "toggle-button";
  toggleContainer.appendChild(toggledDiv);
  toggleContainer.appendChild(toggleButton);
  favoritesToggleBtn.appendChild(toggleContainer);
  favoritesToggleBtn.addEventListener("click", () => {
    isFavoritesToggled = !isFavoritesToggled;
    DataStore.set("favoritesToggled", isFavoritesToggled);
    favoritesToggleBtn.classList.toggle("toggled", isFavoritesToggled);
    toggledDiv.classList.toggle("toggled-on", isFavoritesToggled);
    filterToggle.textContent = isFavoritesToggled ? "Favorites" : "All Skins";
    filterMenu.querySelectorAll(".dropdown-item").forEach((item) => {
      item.classList.toggle(
        "selected",
        item.textContent === (isFavoritesToggled ? "Favorites" : "All Skins")
      );
    });
    selectedFilter = isFavoritesToggled ? "favorites" : "all";
    renderSkins(
      previewGroups,
      currentSearchQuery,
      selectedFilter,
      selectedSort
    );
  });
  bottomBar.appendChild(favoritesToggleBtn);

  const randomizeBtn = document.createElement("button");
  randomizeBtn.className = "randomize-button";
  randomizeBtn.textContent = "Shuffle";
  randomizeBtn.addEventListener("click", () => {
    let allItems = [];
    if (isFavoritesToggled && favoriteSkins.length > 0) {
      allItems = favoriteSkins;
    } else {
      allItems = previewGroups.flatMap((group) => group.items);
    }
    if (allItems.length === 0) {
      debugLog("No items available to randomize");
      return;
    }
    const randomItem = allItems[Math.floor(Math.random() * allItems.length)];
    DataStore.set("selectedSkin", {
      name: randomItem.name,
      tilePath: randomItem.tilePath,
      splashPath: randomItem.splashPath,
      uncenteredSplashPath: randomItem.uncenteredSplashPath,
      skinLineId: randomItem.skinLineId,
      skinLineName: randomItem.skinLineName,
      isTFT: randomItem.isTFT,
    });
    document
      .querySelectorAll(".skin-image")
      .forEach((img) => img.classList.remove("selected"));
    const selector = `.skin-image[data-name="${CSS.escape(
      randomItem.name
    )}"][data-is-tft="${randomItem.isTFT}"]`;
    const selectedImage = mainWindow.querySelector(selector);
    if (selectedImage) {
      selectedImage.classList.add("selected");
      selectedImage.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    applyBackground(randomItem);
    if (cycleShuffleEnabled) {
      startShuffleCycle(favoriteSkins, isFavoritesToggled);
      uiWrapper.remove();
      backdrop.remove();
      uiVisible = false;
      checkAndCreateButton();
    }
  });
  bottomBar.appendChild(randomizeBtn);

  const profilesBtn = document.createElement("button");
  profilesBtn.textContent = "PROFILES";
  profilesBtn.addEventListener("click", () => {
    if (shuffleCycleIntervalId) {
      clearInterval(shuffleCycleIntervalId);
      shuffleCycleIntervalId = null;
      debugLog("Stopped shuffle cycle for profiles UI");
    }
    createProfilesUI(container);
  });
  bottomBar.appendChild(profilesBtn);

  const confirmBtn = document.createElement("button");
  confirmBtn.textContent = "Confirm";
  confirmBtn.addEventListener("click", () => {
    const selectedImage = mainWindow.querySelector(".skin-image.selected");
    if (selectedImage) {
      const item = {
        name: selectedImage.dataset.name,
        tilePath: selectedImage.dataset.tilePath,
        splashPath: selectedImage.dataset.splashPath,
        uncenteredSplashPath: selectedImage.dataset.uncenteredSplashPath,
        skinLineId: selectedImage.dataset.skinLineId,
        skinLineName: selectedImage.dataset.skinLineName,
        isTFT: selectedImage.dataset.isTFT === "true",
      };
      DataStore.set("selectedSkin", item);
      applyBackground(item);
    }
    uiWrapper.remove();
    backdrop.remove();
    uiVisible = false;
    checkAndCreateButton();
  });
  bottomBar.appendChild(confirmBtn);

  uiContainer.appendChild(bottomBar);
  uiWrapper.appendChild(uiContainer);

  if (shuffleCycleIntervalId) {
    clearInterval(shuffleCycleIntervalId);
    shuffleCycleIntervalId = null;
    debugLog("Stopped existing shuffle cycle");
  }

  container.appendChild(backdrop);
  container.appendChild(uiWrapper);

  generatePreviewGroups("champion");
  renderSkins(previewGroups, currentSearchQuery, selectedFilter, selectedSort);
}

document.head.insertAdjacentHTML(
  "beforeend",
  `
  <style>
    .parties-view .parties-background .uikit-background-switcher {
      opacity: 0 !important;
    }
    /* Style added to hide placeholder invited container when background is enabled */
    .custom-background .placeholder-invited-container video[src*="/fe/lol-parties/parties-v2/invited-banner.webm"] {
      display: none !important;
    }
  </style>
`
);
