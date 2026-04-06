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
let customBackgrounds = [];
let DEBUG = false;

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
      customBackgrounds,
      debug: DEBUG,
      savedAt: new Date().toISOString(),
    };
    if (isDataStoreAvailable()) {
      DataStore.set("dynamicBg_config", configData);
      if (DEBUG) {
        console.log("Settings saved:", configData);
      }
    } else {
      if (DEBUG) {
        console.error("DataStore API not available");
      }
    }
  } catch (error) {
    if (DEBUG) {
      console.error("Failed to save settings:", error);
    }
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
        customBackgrounds =
          config.customBackgrounds !== undefined
            ? config.customBackgrounds
            : [];
        DEBUG = config.debug !== undefined ? config.debug : false;
        console.log("Loaded settings:", {
          backgroundEnabled,
          currentOpacity: storedOpacity,
          persistBackground,
          centeredSplash,
          cycleShuffleEnabled,
          cycleInterval,
          transitionDuration,
          skinProfiles,
          activeProfile,
          customBackgrounds,
          debug: DEBUG,
          savedAt: config.savedAt,
        });
        return true;
      }
    }
    if (DEBUG) {
      console.log("No saved settings, using defaults");
    }
    return false;
  } catch (error) {
    if (DEBUG) {
      console.error("Failed to load settings:", error);
    }
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
      if (DEBUG) {
        console.warn(`Failed to preload image: ${url}`);
      }
      resolve();
    };
  });
}

function preloadVideo(url) {
  return new Promise((resolve) => {
    if (!url) return resolve();

    // For data URLs, especially WebM, try to convert to blob URL first
    let videoSrc = url;
    let blobUrl = null;

    if (url.startsWith("data:video/webm")) {
      try {
        const arr = url.split(",");
        if (arr.length >= 2) {
          const mime = arr[0].match(/:(.*?);/)[1];
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);

          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }

          const blob = new Blob([u8arr], { type: mime });
          blobUrl = URL.createObjectURL(blob);
          videoSrc = blobUrl;

          if (DEBUG) {
            console.log("Created blob URL for video preloading");
          }
        }
      } catch (e) {
        if (DEBUG) {
          console.warn(
            "Failed to create blob URL for preloading, using data URL directly:",
            e
          );
        }
      }
    }

    const video = document.createElement("video");
    video.muted = true;
    video.preload = "auto";

    // Set up event handlers before setting src
    let resolved = false;
    const markResolved = () => {
      if (!resolved) {
        resolved = true;
        if (blobUrl) {
          URL.revokeObjectURL(blobUrl);
          if (DEBUG) {
            console.log("Revoked preload blob URL");
          }
        }
        resolve();
      }
    };

    video.onloadeddata = markResolved;

    video.onerror = (e) => {
      if (DEBUG) {
        console.warn(`Failed to preload video: ${url.substring(0, 50)}...`, e);
      }
      markResolved();
    };

    // Add a timeout to prevent hanging
    setTimeout(() => {
      if (!resolved) {
        if (DEBUG) {
          console.warn("Video preload timeout, continuing anyway");
        }
        markResolved();
      }
    }, 5000); // 5 second timeout

    // Now set the src to start loading
    video.src = videoSrc;

    // Also resolve on metadata as a fallback
    video.onloadedmetadata = () => {
      // Wait a bit to see if onloadeddata fires
      setTimeout(() => {
        if (!resolved) {
          if (DEBUG) {
            console.log("Video preload resolved on metadata timeout");
          }
          markResolved();
        }
      }, 1000);
    };
  });
}

async function applyBackground(item) {
  const viewport = document.getElementById("rcp-fe-viewport-root");
  if (!viewport || !item || !backgroundEnabled) {
    removeBackground();
    return;
  }

  if (DEBUG) {
    console.log(
      `Applying background for ${item.name} with opacity: ${currentOpacity}`
    );
  }

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
        if (DEBUG) {
          console.log(
            `Updated opacity to ${currentOpacity} for unchanged background: ${item.name}`
          );
        }
      }
    }
    return;
  }

  // Determine if this is a video
  const isVideo =
    item.isAnimated ||
    splashUrl.toLowerCase().endsWith(".webm") ||
    splashUrl.includes("data:video/");

  // Add retry mechanism for videos
  let preloadSuccess = false;
  let retryCount = 0;
  const maxRetries = 3;

  while (!preloadSuccess && retryCount < maxRetries) {
    try {
      if (isVideo) {
        if (DEBUG) {
          console.log(
            `Preloading video (attempt ${
              retryCount + 1
            }): ${splashUrl.substring(0, 50)}...`
          );
        }
        await preloadVideo(splashUrl);
        preloadSuccess = true;
      } else {
        await preloadImage(splashUrl);
        preloadSuccess = true;
      }
    } catch (error) {
      retryCount++;
      if (DEBUG) {
        console.warn(`Preload attempt ${retryCount} failed:`, error);
      }
      // Short delay before retry
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  if (!preloadSuccess && isVideo) {
    if (DEBUG) {
      console.warn(
        "Video preload failed after retries, will attempt direct loading"
      );
    }
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
        if (DEBUG) {
          console.log(
            `Removed excess layer: ${
              layer.tagName === "VIDEO"
                ? layer.src
                : layer.style.backgroundImage
            }`
          );
        }
      }
    });
  }

  let newBg;
  if (isVideo) {
    newBg = document.createElement("video");
    newBg.className = "client-bg-layer";
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

    // Set up event handlers before setting src to avoid race conditions
    newBg.onloadeddata = () => {
      if (DEBUG) {
        console.log(
          `Video loaded successfully: ${splashUrl.substring(0, 50)}...`
        );
      }
      newBg.style.opacity = currentOpacity;

      // Ensure video is playing (sometimes autoplay doesn't work on restart)
      try {
        const playPromise = newBg.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            if (DEBUG) {
              console.warn("Video play failed, retrying:", error);
            }
            // Try again after a short delay
            setTimeout(() => {
              newBg.play().catch((e) => {
                if (DEBUG) console.error("Second play attempt failed:", e);
              });
            }, 1000);
          });
        }
      } catch (e) {
        if (DEBUG) console.error("Error during video play:", e);
      }
    };

    newBg.onerror = (e) => {
      if (DEBUG) {
        console.error(
          `Failed to load video: ${splashUrl.substring(0, 50)}...`,
          e
        );
      }

      // Try to recover by creating a fallback element
      try {
        const fallbackBg = document.createElement("div");
        fallbackBg.className = "client-bg-layer fallback";
        fallbackBg.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: #010a13;
          opacity: 0;
          transition: opacity ${transitionDuration}s ease;
        `;

        // Add a text indicator that video failed
        const fallbackText = document.createElement("div");
        fallbackText.textContent = "Video background failed to load";
        fallbackText.style.cssText = `
          position: absolute;
          bottom: 20px;
          right: 20px;
          color: #785a28;
          font-size: 14px;
          padding: 5px 10px;
          background: rgba(1, 10, 19, 0.7);
          border: 1px solid #785a28;
          border-radius: 2px;
        `;
        fallbackBg.appendChild(fallbackText);

        // Replace the video element with our fallback
        if (newBg.parentNode) {
          newBg.parentNode.replaceChild(fallbackBg, newBg);
          setTimeout(() => {
            fallbackBg.style.opacity = currentOpacity;
          }, 50);
        }
      } catch (fallbackError) {
        if (DEBUG) console.error("Failed to create fallback:", fallbackError);
        if (newBg.parentNode) newBg.remove();
        removeBackground();
      }
    };

    // Now set the src to start loading
    try {
      // For data URLs, try to handle them specially
      if (splashUrl.startsWith("data:video/")) {
        // For WebM specifically, we need to ensure proper MIME type
        if (splashUrl.includes("data:video/webm")) {
          const blob = dataURLtoBlob(splashUrl);
          if (blob) {
            const blobUrl = URL.createObjectURL(blob);
            newBg.src = blobUrl;

            // Store the blob URL to revoke it later
            newBg.dataset.blobUrl = blobUrl;
          } else {
            // Fallback to direct assignment if blob creation fails
            newBg.src = splashUrl;
          }
        } else {
          newBg.src = splashUrl;
        }
      } else {
        newBg.src = splashUrl;
      }
    } catch (srcError) {
      if (DEBUG) console.error("Error setting video src:", srcError);
      newBg.src = splashUrl; // Fallback to direct assignment
    }
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

  // Helper function to convert data URL to Blob
  function dataURLtoBlob(dataurl) {
    try {
      const arr = dataurl.split(",");
      if (arr.length < 2) return null;

      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);

      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }

      return new Blob([u8arr], { type: mime });
    } catch (e) {
      if (DEBUG) console.error("Failed to convert data URL to blob:", e);
      return null;
    }
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
        // Clean up blob URLs to prevent memory leaks
        if (
          oldBg.tagName === "VIDEO" &&
          oldBg.dataset &&
          oldBg.dataset.blobUrl
        ) {
          try {
            URL.revokeObjectURL(oldBg.dataset.blobUrl);
            if (DEBUG) {
              console.log(`Revoked blob URL: ${oldBg.dataset.blobUrl}`);
            }
          } catch (e) {
            if (DEBUG) {
              console.error("Failed to revoke blob URL:", e);
            }
          }
        }

        oldBg.remove();
        if (DEBUG) {
          console.log(
            `Cleaned up old layer: ${
              oldBg.tagName === "VIDEO"
                ? oldBg.src.substring(0, 50) + "..."
                : oldBg.style.backgroundImage
            }`
          );
        }
      }
    }, transitionDuration * 1000 + 100);
  }

  lastAppliedUrl = splashUrl;
  if (DEBUG) {
    console.log(
      `Background applied: ${item.name}, URL: ${splashUrl}, Type: ${
        isVideo ? "video" : "image"
      }, Opacity: ${currentOpacity}, Transition: ${transitionDuration}s`
    );
  }
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
            // Clean up blob URLs to prevent memory leaks
            if (
              layer.tagName === "VIDEO" &&
              layer.dataset &&
              layer.dataset.blobUrl
            ) {
              try {
                URL.revokeObjectURL(layer.dataset.blobUrl);
                if (DEBUG) {
                  console.log(
                    `Revoked blob URL during reset: ${layer.dataset.blobUrl}`
                  );
                }
              } catch (e) {
                if (DEBUG) {
                  console.error("Failed to revoke blob URL during reset:", e);
                }
              }
            }

            // For videos, pause them before removal to free up resources
            if (layer.tagName === "VIDEO") {
              try {
                layer.pause();
                layer.src = "";
                layer.load(); // Forces the browser to release resources
              } catch (e) {
                if (DEBUG) {
                  console.error("Error cleaning up video:", e);
                }
              }
            }

            layer.remove();
            if (DEBUG) {
              console.log(
                `Removed layer during reset: ${
                  layer.tagName === "VIDEO"
                    ? layer.src
                      ? layer.src.substring(0, 50) + "..."
                      : "empty src"
                    : layer.style.backgroundImage
                }`
              );
            }
          }
        }, transitionDuration * 1000 + 100);
      });
      setTimeout(() => {
        if (bgContainer.parentNode) {
          bgContainer.remove();
          if (DEBUG) {
            console.log("Removed background container");
          }
        }
      }, transitionDuration * 1000 + 100);
    }
    viewport.classList.remove("custom-background");
    lastAppliedUrl = null;
    if (DEBUG) {
      console.log("Background fully removed");
    }
  }
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
    if (DEBUG) {
      console.log("Activity center not found for observer setup");
    }
    return;
  }

  const observer = new MutationObserver(() => {
    checkAndApplyBackground();
  });

  observer.observe(activityCenterScreen, {
    attributes: true,
    attributeFilter: ["style", "class"],
  });

  if (DEBUG) {
    console.log("Activity center observer set up");
  }
}

function setupProfilesMainObserver() {
  const profilesMainScreen = document.querySelector(
    '.screen-root[data-screen-name="rcp-fe-lol-profiles-main"]'
  );
  if (!profilesMainScreen) {
    if (DEBUG) {
      console.log("Profiles main screen not found for observer setup");
    }
    return;
  }

  const observer = new MutationObserver(() => {
    checkAndApplyBackground();
  });

  observer.observe(profilesMainScreen, {
    attributes: true,
    attributeFilter: ["style", "class"],
  });

  if (DEBUG) {
    console.log("Profiles main screen observer set up");
  }
}

function setupPostgameObserver() {
  const postgameScreen = document.querySelector(
    '.screen-root[data-screen-name="rcp-fe-lol-postgame"]'
  );
  if (!postgameScreen) {
    if (DEBUG) {
      console.log("Postgame screen not found for observer setup");
    }
    return;
  }

  const observer = new MutationObserver(() => {
    checkAndApplyBackground();
  });

  observer.observe(postgameScreen, {
    attributes: true,
    attributeFilter: ["style", "class"],
  });

  if (DEBUG) {
    console.log("Postgame screen observer set up");
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
        if (DEBUG) {
          debugLog("Restored placeholder invited container visibility");
        }
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
      if (DEBUG) {
        debugLog("Hidden placeholder invited container");
      }
    }
  });
}

function setupPlaceholderContainerObserver() {
  const partiesScreen = document.querySelector(
    '[data-screen-name="rcp-fe-lol-parties"]'
  );
  if (!partiesScreen) {
    if (DEBUG) {
      debugLog(
        "Parties screen not found for placeholder container observer setup"
      );
    }
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
          if (DEBUG) {
            debugLog("Placeholder invited container added to DOM");
          }
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

  if (DEBUG) {
    debugLog("Placeholder container observer set up");
  }
}

window.addEventListener("load", () => {
  if (DEBUG) {
    console.log("Pengu Loader Client Background Customizer plugin loading...");
  }
  setupActivityCenterObserver();
  setupProfilesMainObserver();
  setupPostgameObserver();
  updatePlaceholderInvitedContainer();
  loadSavedSettings();

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
        if (DEBUG) {
          console.log("Fetched skins.json, skinData length:", skinData.length);
        }
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
        if (DEBUG) {
          console.log(
            "Fetched universes.json, universeData length:",
            universeData.length
          );
        }
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
        if (DEBUG) {
          console.log(
            "Fetched skinlines.json, skinLineData length:",
            skinLineData.length
          );
        }
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
        if (DEBUG) {
          console.log(
            "Fetched tftrotationalshopitemdata.json, tftData length:",
            tftData.length
          );
        }
      }),
  ])
    .then((results) => {
      const errors = results
        .filter((r) => r.status === "rejected")
        .map((r) => r.reason);
      if (errors.length > 0) {
        if (DEBUG) {
          console.error("Errors during data fetch:", errors);
        }
        alert("Some data failed to load. Falling back to champion grouping.");
      }
      generatePreviewGroups("champion");
      checkAndApplyBackground();
    })
    .catch((error) => {
      if (DEBUG) {
        console.error("Unexpected error during data fetch:", error);
      }
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
  if (DEBUG) {
    console.log("Generating preview groups for type:", type);
  }
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
      if (DEBUG) {
        console.warn(
          "Universe or skinline data unavailable, falling back to champion"
        );
      }
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
      if (DEBUG) {
        console.warn("Skinline data unavailable, falling back to champion");
      }
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
    if (DEBUG) {
      console.warn("Invalid type, falling back to champion");
    }
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

  // Use DataStore to fetch custom backgrounds, ensuring deleted items are not re-added
  const customBackgrounds = DataStore.get("customBackgrounds") || [];
  if (DEBUG) {
    console.log("Custom Backgrounds from DataStore:", customBackgrounds);
  }
  const customGroup = {
    title: "Custom Background",
    items: customBackgrounds.map((item) => ({
      name: item.name,
      tilePath: item.tilePath,
      splashPath: item.splashPath,
      uncenteredSplashPath: item.uncenteredSplashPath,
      skinLineId: null,
      skinLineName: null,
      isTFT: false,
      isAnimated: item.isAnimated,
    })),
  };
  customGroup.items.sort((a, b) => a.name.localeCompare(b.name));
  previewGroups.push(customGroup);

  if (DEBUG) {
    console.log(
      `Generated ${previewGroups.length} preview groups for type: ${type}, Custom Backgrounds:`,
      customGroup
    );
  }
}

// Helper functions for file handling
// Use window-level cache to ensure persistence across UI updates
window.bgCustomizerFileCache = window.bgCustomizerFileCache || {};
let fileCache = window.bgCustomizerFileCache;

// Debounce function to prevent excessive function calls
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

// Generate a unique ID for each file
function generateFileId(file) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

// Read file as data URL with basic approach (for small files)
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

// Process image with resizing and compression
function processImageFile(
  file,
  maxWidth = 1920,
  maxHeight = 1080,
  quality = 0.8
) {
  return new Promise((resolve, reject) => {
    // Check if we have this file in cache
    const fileId = generateFileId(file);
    if (fileCache[fileId]) {
      if (DEBUG) console.log("Using cached processed image:", fileId);
      return resolve(fileCache[fileId]);
    }

    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target.result;
      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        // Create canvas for resizing
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        // Draw and compress image
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to data URL with compression
        let dataUrl;
        if (file.type === "image/jpeg" || file.type === "image/jpg") {
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        } else if (file.type === "image/png") {
          dataUrl = canvas.toDataURL("image/png", quality);
        } else if (file.type === "image/gif") {
          // GIFs can't be easily compressed, so we just convert as is
          dataUrl = canvas.toDataURL("image/png", quality);
        } else {
          dataUrl = canvas.toDataURL(file.type, quality);
        }

        // Store in cache
        fileCache[fileId] = {
          dataUrl,
          width,
          height,
          originalSize: file.size,
          processedSize: Math.round((dataUrl.length * 3) / 4), // Rough estimate of base64 size
        };

        if (DEBUG) {
          console.log("Image processed:", {
            original: `${(file.size / (1024 * 1024)).toFixed(2)}MB`,
            processed: `${(
              fileCache[fileId].processedSize /
              (1024 * 1024)
            ).toFixed(2)}MB`,
            width,
            height,
          });
        }

        resolve(fileCache[fileId]);
      };

      img.onerror = () => {
        reject(new Error("Failed to load image"));
      };
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsDataURL(file);
  });
}

// Process video file (no compression, just validation and metadata extraction)
function processVideoFile(file) {
  return new Promise((resolve, reject) => {
    // Check if we have this file in cache
    const fileId = generateFileId(file);
    if (fileCache[fileId]) {
      if (DEBUG) console.log("Using cached processed video:", fileId);
      return resolve(fileCache[fileId]);
    }

    const video = document.createElement("video");
    const reader = new FileReader();

    reader.onload = (e) => {
      video.src = e.target.result;

      // Get video metadata when it's loaded
      video.onloadedmetadata = () => {
        const dataUrl = e.target.result;

        // Store in cache
        fileCache[fileId] = {
          dataUrl,
          width: video.videoWidth,
          height: video.videoHeight,
          duration: video.duration,
          originalSize: file.size,
          processedSize: file.size, // No compression for videos
        };

        if (DEBUG) {
          console.log("Video processed:", {
            size: `${(file.size / (1024 * 1024)).toFixed(2)}MB`,
            width: video.videoWidth,
            height: video.videoHeight,
            duration: `${video.duration.toFixed(1)}s`,
          });
        }

        resolve(fileCache[fileId]);
      };

      video.onerror = () => {
        reject(new Error("Failed to load video"));
      };
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsDataURL(file);
  });
}

// Clear file cache to free memory
function clearFileCache() {
  // Don't completely clear the cache, just mark entries for garbage collection
  // This ensures references remain valid during the current session
  if (DEBUG) console.log("File cache marked for cleanup");
}

function validateImageFile(file) {
  const validTypes = ["image/jpeg", "image/png", "image/gif"];
  const maxSizeMB = 10; // Increased to 10MB since we'll compress

  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Supported formats: JPG, PNG, GIF`,
    };
  }

  if (file.size > maxSizeMB * 1024 * 1024) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${maxSizeMB}MB`,
    };
  }

  return { valid: true };
}

function validateVideoFile(file) {
  const validTypes = ["video/webm"];
  const maxSizeMB = 20; // 20MB max file size

  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Supported video format: WebM`,
    };
  }

  if (file.size > maxSizeMB * 1024 * 1024) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${maxSizeMB}MB`,
    };
  }

  return { valid: true };
}

function createCustomBackgroundUI(container) {
  const customWrapper = document.createElement("div");
  customWrapper.id = "client-bg-custom-ui-wrapper";
  customWrapper.style.cssText = `
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

  const customContainer = document.createElement("div");
  customContainer.id = "client-bg-custom-ui";
  customContainer.className = "lol-custom-ui";
  customContainer.style.cssText = `
        width: 650px;
        height: 650px;
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
  title.textContent = "Add Custom Background";
  title.style.cssText = `
        color: #f0e6d2;
        font-size: 24px;
        font-weight: bold;
        text-align: center;
        margin: 0 0 20px 0;
        text-transform: uppercase;
    `;
  innerContainer.appendChild(title);

  const customContent = document.createElement("div");
  customContent.style.cssText = `
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 15px;
        overflow-y: auto;
        padding-right: 10px;
        scrollbar-width: thin;
        scrollbar-color: #785a28 transparent;
    `;
  customContent.className = "custom-content";

  // Create name input
  const nameWrapper = document.createElement("div");
  nameWrapper.style.cssText = `display: flex; flex-direction: column; gap: 5px;`;
  const nameLabel = document.createElement("label");
  nameLabel.textContent = "Name";
  nameLabel.style.cssText = `
        color: #f0e6d2;
        font-size: 14px;
        font-weight: bold;
    `;
  const nameField = document.createElement("input");
  nameField.type = "text";
  nameField.placeholder = "Custom Background Name";
  nameField.style.cssText = `
        background: #010a13;
        border: 1px solid #785a28;
        color: #cdbe91;
        padding: 8px;
        border-radius: 2px;
        font-family: 'LoL Display', 'BeaufortforLOL', sans-serif;
    `;
  nameWrapper.appendChild(nameLabel);
  nameWrapper.appendChild(nameField);
  customContent.appendChild(nameWrapper);

  // Create preview area
  const previewArea = document.createElement("div");
  previewArea.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-top: 10px;
        margin-bottom: 10px;
    `;

  const previewLabel = document.createElement("div");
  previewLabel.textContent = "Preview";
  previewLabel.style.cssText = `
        color: #f0e6d2;
        font-size: 14px;
        font-weight: bold;
    `;

  const previewContainer = document.createElement("div");
  previewContainer.style.cssText = `
        width: 100%;
        height: 150px;
        background: #0A1428;
        border: 1px solid #785a28;
        border-radius: 4px;
        display: flex;
        justify-content: center;
        align-items: center;
        overflow: hidden;
    `;

  const previewPlaceholder = document.createElement("div");
  previewPlaceholder.textContent = "Image preview will appear here";
  previewPlaceholder.style.cssText = `
        color: #785a28;
        font-size: 14px;
    `;

  previewContainer.appendChild(previewPlaceholder);
  previewArea.appendChild(previewLabel);
  previewArea.appendChild(previewContainer);
  customContent.appendChild(previewArea);

  // Create file input fields with URL fallback
  const inputFields = [
    {
      label: "Tile Image",
      key: "tilePath",
      accept: "image/jpeg,image/png,image/gif",
      placeholder: "Or enter tile image URL (JPG, PNG, GIF)",
      required: true,
    },
    {
      label: "Splash Image/Video",
      key: "splashPath",
      accept: "image/jpeg,image/png,image/gif,video/webm",
      placeholder: "Or enter splash image/video URL (JPG, PNG, GIF, WebM)",
      required: true,
    },
    {
      label: "Uncentered Splash (Optional)",
      key: "uncenteredSplashPath",
      accept: "image/jpeg,image/png,image/gif,video/webm",
      placeholder: "Or enter uncentered splash URL (optional)",
      required: false,
    },
  ];

  const inputElements = {};
  const fileInputs = {};

  inputFields.forEach((input) => {
    const inputWrapper = document.createElement("div");
    inputWrapper.style.cssText = `display: flex; flex-direction: column; gap: 5px;`;

    const label = document.createElement("label");
    label.textContent = input.label;
    label.style.cssText = `
        color: #f0e6d2;
        font-size: 14px;
        font-weight: bold;
    `;

    // Create file input container
    const fileInputContainer = document.createElement("div");
    fileInputContainer.style.cssText = `
        display: flex;
        gap: 10px;
        align-items: center;
    `;

    // Create hidden file input
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = input.accept;
    fileInput.style.display = "none";
    fileInputs[input.key] = fileInput;

    // Create file select button
    const fileSelectButton = document.createElement("button");
    fileSelectButton.textContent = "Select File";
    fileSelectButton.style.cssText = `
        padding: 8px 12px;
        background: #1e2328;
        border: 1px solid #785a28;
        color: #cdbe91;
        border-radius: 2px;
        font-family: 'LoL Display', 'BeaufortforLOL', sans-serif;
        cursor: pointer;
        white-space: nowrap;
    `;

    // Create file name display
    const fileNameDisplay = document.createElement("span");
    fileNameDisplay.textContent = "No file selected";
    fileNameDisplay.style.cssText = `
        color: #cdbe91;
        font-size: 12px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    `;

    // Create URL input field
    const urlInput = document.createElement("input");
    urlInput.type = "text";
    urlInput.placeholder = input.placeholder;
    urlInput.style.cssText = `
        flex: 1;
        background: #010a13;
        border: 1px solid #785a28;
        color: #cdbe91;
        padding: 8px;
        border-radius: 2px;
        font-family: 'LoL Display', 'BeaufortforLOL', sans-serif;
        margin-top: 5px;
    `;
    inputElements[input.key] = urlInput;

    // Create loading indicator
    const loadingIndicator = document.createElement("div");
    loadingIndicator.className = "file-loading-indicator";
    loadingIndicator.style.cssText = `
        display: none;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 10, 19, 0.7);
        z-index: 10;
        justify-content: center;
        align-items: center;
    `;

    const spinner = document.createElement("div");
    spinner.className = "loading-spinner";
    loadingIndicator.appendChild(spinner);

    // Add loading indicator to the file input container
    fileInputContainer.style.position = "relative";
    fileInputContainer.appendChild(loadingIndicator);

    // Add event listeners
    fileSelectButton.addEventListener("click", () => {
      fileInput.click();
    });

    // Debounced preview update function
    const debouncedUpdatePreview = debounce((src, isVideo) => {
      updatePreview(src, isVideo);
    }, 100);

    fileInput.addEventListener("change", async (e) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const isVideo = file.type.startsWith("video/");

        // Validate file
        const validation = isVideo
          ? validateVideoFile(file)
          : validateImageFile(file);
        if (!validation.valid) {
          errorMessage.textContent = validation.error;
          errorMessage.style.display = "block";
          setTimeout(() => {
            errorMessage.style.display = "none";
          }, 3000);
          fileInput.value = "";
          fileNameDisplay.textContent = "No file selected";
          return;
        }

        // Show loading indicator
        loadingIndicator.style.display = "flex";
        fileNameDisplay.textContent = `Processing ${file.name}...`;

        try {
          // Process file based on type
          let processedFile;
          if (isVideo) {
            processedFile = await processVideoFile(file);
          } else {
            // Use different compression settings based on file size
            const quality = file.size > 5 * 1024 * 1024 ? 0.6 : 0.8;
            processedFile = await processImageFile(file, 1920, 1080, quality);
          }

          // Update file name with compression info
          const originalSizeMB = (file.size / (1024 * 1024)).toFixed(1);
          const processedSizeMB = (
            processedFile.processedSize /
            (1024 * 1024)
          ).toFixed(1);
          fileNameDisplay.textContent = `${file.name} (${processedSizeMB}MB / ${originalSizeMB}MB)`;

          // Store reference to processed file instead of embedding in input
          const fileId = generateFileId(file);
          urlInput.dataset.fileId = fileId;
          // Store a fallback data URL in case the cache gets cleared
          urlInput.dataset.fallbackDataUrl = processedFile.dataUrl;
          urlInput.value = `[PROCESSED FILE: ${fileId}]`;

          // Log cache status
          if (DEBUG) {
            console.log(
              `File cached with ID: ${fileId}, cache size: ${
                Object.keys(fileCache).length
              }`
            );
          }

          // Update preview if this is the splash image
          if (input.key === "splashPath") {
            debouncedUpdatePreview(processedFile.dataUrl, isVideo);
          }

          // Auto-set animated toggle if video is selected
          if (isVideo && input.key === "splashPath") {
            toggleInput.checked = true;
          }
        } catch (error) {
          if (DEBUG) {
            console.error("Error processing file:", error);
          }
          errorMessage.textContent = "Failed to process file";
          errorMessage.style.display = "block";
          setTimeout(() => {
            errorMessage.style.display = "none";
          }, 3000);
          fileNameDisplay.textContent = "No file selected";
        } finally {
          // Hide loading indicator
          loadingIndicator.style.display = "none";
        }
      }
    });

    // URL input change event for preview with debouncing
    urlInput.addEventListener(
      "input",
      debounce(() => {
        if (input.key === "splashPath" && urlInput.value) {
          // Skip preview update for processed files (handled separately)
          if (urlInput.value.startsWith("[PROCESSED FILE:")) return;

          const isVideo =
            urlInput.value.toLowerCase().endsWith(".webm") ||
            urlInput.value.includes("data:video/");
          updatePreview(urlInput.value, isVideo);

          // Auto-set animated toggle if video URL is entered
          if (isVideo) {
            toggleInput.checked = true;
          }
        }
      }, 300)
    );

    fileInputContainer.appendChild(fileSelectButton);
    fileInputContainer.appendChild(fileNameDisplay);

    inputWrapper.appendChild(label);
    inputWrapper.appendChild(fileInputContainer);
    inputWrapper.appendChild(urlInput);
    customContent.appendChild(inputWrapper);
  });

  // Function to update preview
  function updatePreview(src, isVideo) {
    // Show loading state
    previewContainer.innerHTML = "";
    const loadingEl = document.createElement("div");
    loadingEl.className = "preview-loading";
    loadingEl.textContent = "Loading preview...";
    loadingEl.style.cssText = `
        color: #785a28;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
    `;
    previewContainer.appendChild(loadingEl);

    // Create media element
    if (isVideo) {
      const video = document.createElement("video");
      video.style.cssText = `
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          display: none; /* Hide until loaded */
      `;

      // Set up event handlers
      video.onloadeddata = () => {
        // Remove loading indicator and show video
        previewContainer.querySelector(".preview-loading")?.remove();
        video.style.display = "block";

        // Limit video playback to reduce performance impact
        if (video.duration > 10) {
          // For long videos, just show a short preview
          video.currentTime = 1; // Skip potential black frame at start
        }
      };

      video.onerror = () => {
        previewContainer.innerHTML = "Failed to load video preview";
      };

      // Set properties and add to container
      video.src = src;
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      video.playbackRate = 0.75; // Slow down playback to reduce CPU usage
      previewContainer.appendChild(video);
    } else {
      const img = document.createElement("img");
      img.style.cssText = `
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          display: none; /* Hide until loaded */
      `;

      // Set up event handlers
      img.onload = () => {
        // Remove loading indicator and show image
        previewContainer.querySelector(".preview-loading")?.remove();
        img.style.display = "block";
      };

      img.onerror = () => {
        previewContainer.innerHTML = "Failed to load image preview";
      };

      // Set source and add to container
      img.src = src;
      previewContainer.appendChild(img);
    }
  }

  const toggleWrapper = document.createElement("div");
  toggleWrapper.style.cssText = `display: flex; align-items: center; gap: 10px; margin-top: 10px;`;
  const toggleLabel = document.createElement("label");
  toggleLabel.textContent = "Animated (Video)";
  toggleLabel.style.cssText = `
        color: #f0e6d2;
        font-size: 14px;
        font-weight: bold;
    `;
  const toggleSwitch = document.createElement("label");
  toggleSwitch.className = "toggle-switch";
  const toggleInput = document.createElement("input");
  toggleInput.type = "checkbox";
  const toggleSlider = document.createElement("span");
  toggleSlider.className = "toggle-slider";
  toggleSwitch.appendChild(toggleInput);
  toggleSwitch.appendChild(toggleSlider);
  toggleWrapper.appendChild(toggleLabel);
  toggleWrapper.appendChild(toggleSwitch);
  customContent.appendChild(toggleWrapper);

  const errorMessage = document.createElement("span");
  errorMessage.style.cssText = `color: #ff5555; font-size: 12px; display: none; margin-top: 5px;`;
  customContent.appendChild(errorMessage);

  const addButton = document.createElement("button");
  addButton.textContent = "Add Background";
  addButton.style.cssText = `
        padding: 8px 12px;
        background: #1e2328;
        border: 1px solid #785a28;
        color: #cdbe91;
        border-radius: 2px;
        font-family: 'LoL Display', 'BeaufortforLOL', sans-serif;
        cursor: pointer;
        margin-top: 15px;
    `;
  addButton.addEventListener("mouseover", () => {
    addButton.style.background = "#1e2328";
    addButton.style.borderColor = "#c8aa6e";
    addButton.style.color = "#f0e6d2";
  });
  addButton.addEventListener("mouseout", () => {
    addButton.style.background = "#1e2328";
    addButton.style.borderColor = "#785a28";
    addButton.style.color = "#cdbe91";
  });
  addButton.addEventListener("click", async () => {
    try {
      // Show loading indicator for the entire form
      const formLoadingIndicator = document.createElement("div");
      formLoadingIndicator.className = "form-loading-indicator";
      formLoadingIndicator.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 10, 19, 0.7);
          z-index: 100;
          display: flex;
          justify-content: center;
          align-items: center;
          flex-direction: column;
      `;

      const formSpinner = document.createElement("div");
      formSpinner.className = "loading-spinner";
      formSpinner.style.width = "40px";
      formSpinner.style.height = "40px";

      const formLoadingText = document.createElement("div");
      formLoadingText.textContent = "Processing...";
      formLoadingText.style.cssText = `
          color: #cdbe91;
          margin-top: 15px;
          font-size: 16px;
      `;

      formLoadingIndicator.appendChild(formSpinner);
      formLoadingIndicator.appendChild(formLoadingText);

      // Get basic form values
      const name = nameField.value.trim();
      const isAnimated = toggleInput.checked;

      // Check if name is provided
      if (!name) {
        errorMessage.textContent = "Background name is required";
        errorMessage.style.display = "block";
        setTimeout(() => {
          errorMessage.style.display = "none";
        }, 3000);
        return;
      }

      // Check if name is already taken
      if (customBackgrounds.some((bg) => bg.name === name)) {
        errorMessage.textContent = "Name already taken";
        errorMessage.style.display = "block";
        setTimeout(() => {
          errorMessage.style.display = "none";
        }, 3000);
        return;
      }

      // Process all file inputs
      const processFileInputs = async () => {
        try {
          // Add loading indicator to the form
          customContent.style.position = "relative";
          customContent.appendChild(formLoadingIndicator);

          // Process each input field
          const processedPaths = {};

          for (const key of [
            "tilePath",
            "splashPath",
            "uncenteredSplashPath",
          ]) {
            const input = inputElements[key];
            const value = input.value.trim();

            // Skip empty optional fields
            if (!value && key === "uncenteredSplashPath") {
              processedPaths[key] = "";
              continue;
            }

            // Check if required fields are provided
            if (!value && (key === "tilePath" || key === "splashPath")) {
              throw new Error(
                `${
                  key === "tilePath" ? "Tile Image" : "Splash Image"
                } is required`
              );
            }

            // Handle processed files (references to fileCache)
            if (value.startsWith("[PROCESSED FILE:")) {
              const fileId = value.substring(16, value.length - 1);
              if (fileCache[fileId] && fileCache[fileId].dataUrl) {
                processedPaths[key] = fileCache[fileId].dataUrl;
                if (DEBUG)
                  console.log(`Retrieved cached file: ${fileId} for ${key}`);
                continue;
              } else {
                // If file reference is not found, try to recover by using the URL input directly
                if (DEBUG)
                  console.warn(
                    `File reference not found: ${fileId}, using fallback`
                  );
                // Check if there's a data URL in the dataset
                if (input.dataset && input.dataset.fallbackDataUrl) {
                  processedPaths[key] = input.dataset.fallbackDataUrl;
                  if (DEBUG) console.log(`Using fallback data URL for ${key}`);
                  continue;
                } else {
                  // Allow direct URL inputs as fallback
                  const validateUrl = (url) => {
                    return (
                      url.startsWith("data:") ||
                      url.startsWith("http://") ||
                      url.startsWith("https://") ||
                      url.startsWith("file://")
                    );
                  };

                  if (validateUrl(value)) {
                    processedPaths[key] = value;
                    if (DEBUG)
                      console.log(`Using input value as fallback for ${key}`);
                    continue;
                  }
                  throw new Error(
                    `Processed file reference not found and no fallback available. Please reselect the file.`
                  );
                }
              }
            }

            // Validate URLs
            const validateUrl = (url) => {
              return (
                url.startsWith("data:") ||
                url.startsWith("http://") ||
                url.startsWith("https://") ||
                url.startsWith("file://")
              );
            };

            if (!validateUrl(value)) {
              throw new Error(
                `Invalid ${
                  key === "tilePath"
                    ? "Tile Image"
                    : key === "splashPath"
                    ? "Splash Image"
                    : "Uncentered Splash"
                } URL format`
              );
            }

            // For data URLs, check size
            if (value.startsWith("data:")) {
              const isVideoUrl = value.includes("data:video/");
              const maxSizeMB = isVideoUrl ? 20 : 5;

              // Rough estimation: base64 is ~4/3 of the original size
              const base64Length = value.substring(
                value.indexOf(",") + 1
              ).length;
              const estimatedSizeBytes = base64Length * 0.75;
              const sizeMB = estimatedSizeBytes / (1024 * 1024);

              if (sizeMB > maxSizeMB) {
                throw new Error(
                  `${
                    key === "tilePath"
                      ? "Tile Image"
                      : key === "splashPath"
                      ? "Splash Image"
                      : "Uncentered Splash"
                  } file is too large (approximately ${sizeMB.toFixed(
                    1
                  )}MB). Maximum size: ${maxSizeMB}MB`
                );
              }
            }

            // Store the validated path
            processedPaths[key] = value;
          }

          if (DEBUG) {
            console.log("Adding custom background:", {
              name,
              tilePath: "...[processed]...",
              splashPath: "...[processed]...",
              uncenteredSplashPath: processedPaths.uncenteredSplashPath
                ? "...[processed]..."
                : "none",
              isAnimated,
            });
          }

          // Add to customBackgrounds
          customBackgrounds = DataStore.get("customBackgrounds") || [];
          customBackgrounds.push({
            name,
            tilePath: processedPaths.tilePath,
            splashPath: processedPaths.splashPath,
            uncenteredSplashPath: processedPaths.uncenteredSplashPath,
            isAnimated,
          });

          // Clear file cache to free memory after successful save
          clearFileCache();

          return true;
        } catch (error) {
          errorMessage.textContent = error.message || "Failed to process files";
          errorMessage.style.display = "block";
          setTimeout(() => {
            errorMessage.style.display = "none";
          }, 3000);
          return false;
        } finally {
          // Remove loading indicator
          formLoadingIndicator.remove();
        }
      };

      // Process files and continue if successful
      const success = await processFileInputs();
      if (!success) return;
      DataStore.set("customBackgrounds", customBackgrounds);
      saveSettings();
      if (DEBUG) {
        console.log(
          "Updated customBackgrounds:",
          customBackgrounds,
          "DataStore:",
          DataStore.get("customBackgrounds")
        );
      }

      // Refresh renderer like Profiles UI closeButton
      if (DEBUG) {
        console.log("Custom Background UI closing, starting restore process");
      }
      customWrapper.remove();

      // Find existing wrapper or clean up duplicates
      let customizerWrapper = document.getElementById(
        "client-bg-customizer-ui-wrapper"
      );
      const existingWrappers = document.querySelectorAll(
        "#client-bg-customizer-ui-wrapper"
      );
      if (existingWrappers.length > 1) {
        if (DEBUG) {
          console.warn(
            "Multiple customizer wrappers found, removing duplicates"
          );
        }
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
        if (DEBUG) {
          console.warn("Multiple backdrops found, removing duplicates");
        }
        existingBackdrops.forEach((backdrop, index) => {
          if (index > 0) backdrop.remove();
        });
      }

      if (customizerWrapper) {
        if (DEBUG) {
          console.log("Customizer wrapper found, restoring visibility");
        }
        customizerWrapper.style.display = "block";
        const customizerUI = document.getElementById("client-bg-customizer-ui");
        const mainWindow = customizerUI?.querySelector(".main-window");
        if (customizerUI && mainWindow && window.renderSkins) {
          // Reload state from DataStore
          window.favoriteSkins = DataStore.get("favoriteSkins") || [];
          window.isFavoritesToggled =
            DataStore.get("favoritesToggled") || false;
          console.log("Restored state:", {
            favoriteSkinsCount: window.favoriteSkins.length,
            isFavoritesToggled: window.isFavoritesToggled,
            customBackgroundsCount: customBackgrounds.length,
            searchQuery: currentSearchQuery,
          });

          // Update filter dropdown UI to ensure 'All Skins'
          const filterDropdown = customizerUI.querySelector(
            ".filter-dropdown .dropdown-toggle"
          );
          const filterMenu = customizerUI.querySelector(
            ".filter-dropdown .dropdown-menu"
          );
          if (filterDropdown && filterMenu) {
            const currentFilter = "All Skins";
            filterDropdown.textContent = currentFilter;
            filterMenu.querySelectorAll(".dropdown-item").forEach((item) => {
              item.classList.toggle(
                "selected",
                item.textContent === currentFilter
              );
            });
            if (DEBUG) {
              console.log(`Filter dropdown updated to: ${currentFilter}`);
            }
          } else {
            if (DEBUG) {
              console.warn("Filter dropdown or menu not found");
            }
          }

          // Ensure previewGroups is populated with new background
          if (DEBUG) {
            console.log("Generating previewGroups for groupType: champion");
          }
          generatePreviewGroups("champion");
          if (DEBUG) {
            console.log("Updated previewGroups:", previewGroups);
          }

          // Render with 'all' filter to show new background
          const filterValue = "all";
          if (DEBUG) {
            console.log(`Rendering skins with filter: ${filterValue}`);
          }
          window.renderSkins(
            previewGroups,
            currentSearchQuery || "",
            filterValue
          );
        } else {
          if (DEBUG) {
            console.warn(
              "Customizer UI or main window missing, reinitializing"
            );
          }
          if (customizerWrapper) customizerWrapper.remove();
          const existingBackdrop = document.querySelector(
            ".client-bg-customizer-backdrop"
          );
          if (existingBackdrop) existingBackdrop.remove();
          createClientBackgroundCustomizerUI(container);
        }
      } else {
        if (DEBUG) {
          console.warn("Customizer wrapper not found, creating new UI");
        }
        const existingBackdrop = document.querySelector(
          ".client-bg-customizer-backdrop"
        );
        if (existingBackdrop) existingBackdrop.remove();
        createClientBackgroundCustomizerUI(container);
      }
    } catch (error) {
      if (DEBUG) {
        console.error("Error in addButton handler:", error);
      }
    }
  });
  customContent.appendChild(addButton);

  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
        .custom-content::-webkit-scrollbar {
            width: 6px;
        }
        .custom-content::-webkit-scrollbar-track {
            background: transparent;
        }
        .custom-content::-webkit-scrollbar-thumb {
            background: #785a28;
            border-radius: 3px;
        }
        .custom-content::-webkit-scrollbar-thumb:hover {
            background: #c8aa6e;
        }
        .toggle-switch {
            position: relative;
            display: inline-block;
            width: 40px;
            height: 20px;
        }
        .toggle-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        .toggle-slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #1e2328;
            border: 1px solid #785a28;
            transition: .4s;
            border-radius: 20px;
        }
        .toggle-slider:before {
            position: absolute;
            content: "";
            height: 14px;
            width: 14px;
            left: 3px;
            bottom: 2px;
            background-color: #cdbe91;
            transition: .4s;
            border-radius: 50%;
        }
        input:checked + .toggle-slider {
            background-color: #1e2328;
            border-color: #c8aa6e;
        }
        input:checked + .toggle-slider:before {
            transform: translateX(18px);
            background-color: #f0e6d2;
        }

        /* Loading spinner */
        .loading-spinner {
            width: 30px;
            height: 30px;
            border: 3px solid rgba(120, 90, 40, 0.3);
            border-radius: 50%;
            border-top-color: #c8aa6e;
            animation: spin 1s ease-in-out infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        /* Disable input during processing */
        .processing {
            pointer-events: none;
            opacity: 0.7;
        }
    `;
  document.head.appendChild(styleSheet);

  innerContainer.appendChild(customContent);
  customContainer.appendChild(innerContainer);

  const closeButton = document.createElement("button");
  closeButton.textContent = "Close";
  closeButton.className = "custom-close-button";
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
    // Clean up any unused file references to prevent memory leaks
    // We don't clear the entire cache to avoid issues with file references
    // that might still be in use elsewhere
    if (DEBUG) {
      console.log("Cleaning up unused file references before closing");
    }

    // Collect all file IDs that are currently in use in the form
    const usedFileIds = new Set();
    Object.values(inputElements).forEach((input) => {
      if (input.dataset && input.dataset.fileId) {
        usedFileIds.add(input.dataset.fileId);
      }
    });

    // Log cache status
    if (DEBUG) {
      console.log(
        `Cache before cleanup: ${Object.keys(fileCache).length} items`
      );
      console.log(`Used file IDs: ${usedFileIds.size} items`);
    }

    // Remove the custom UI
    customWrapper.remove();

    const customizerWrapper = document.getElementById(
      "client-bg-customizer-ui-wrapper"
    );
    if (customizerWrapper) {
      customizerWrapper.style.display = "block";
      const customizerUI = document.getElementById("client-bg-customizer-ui");
      if (customizerUI && window.renderSkins) {
        generatePreviewGroups(
          document.querySelector(
            ".custom-dropdown:not(.filter-dropdown):not(.sort-dropdown) .dropdown-item.selected"
          )?.dataset.value || "champion"
        );
        window.renderSkins(
          previewGroups,
          currentSearchQuery,
          document.querySelector(".filter-dropdown .dropdown-item.selected")
            ?.dataset.value || "all"
        );
      }
    }
  });
  customContainer.appendChild(closeButton);

  customWrapper.appendChild(customContainer);
  container.appendChild(customWrapper);
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
        if (DEBUG) {
          console.log(`Loading profile: ${profile.name}`);
        }
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
            console.log("Preparing to render skins with:", {
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
              if (DEBUG) {
                console.log(`Filter dropdown updated to: ${currentFilter}`);
              }
            } else {
              if (DEBUG) {
                console.warn("Filter dropdown or menu not found");
              }
            }
            // Directly call renderSkins with the correct filter
            const filterValue = window.isFavoritesToggled ? "favorites" : "all";
            if (DEBUG) {
              console.log(`Rendering skins with filter: ${filterValue}`);
            }
            window.renderSkins(previewGroups, currentSearchQuery, filterValue);
          } else {
            if (DEBUG) {
              console.error("Main window or renderSkins missing");
            }
          }
        } else {
          if (DEBUG) {
            console.error("Customizer UI not found");
          }
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
    if (DEBUG) {
      console.log("Profiles UI closing, starting restore process");
    }
    profilesWrapper.remove();

    // Find existing wrapper or clean up duplicates
    let customizerWrapper = document.getElementById(
      "client-bg-customizer-ui-wrapper"
    );
    const existingWrappers = document.querySelectorAll(
      "#client-bg-customizer-ui-wrapper"
    );
    if (existingWrappers.length > 1) {
      if (DEBUG) {
        console.warn("Multiple customizer wrappers found, removing duplicates");
      }
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
      if (DEBUG) {
        console.warn("Multiple backdrops found, removing duplicates");
      }
      existingBackdrops.forEach((backdrop, index) => {
        if (index > 0) backdrop.remove();
      });
    }

    if (customizerWrapper) {
      if (DEBUG) {
        console.log("Customizer wrapper found, restoring visibility");
      }
      customizerWrapper.style.display = "block";
      const customizerUI = document.getElementById("client-bg-customizer-ui");
      const mainWindow = customizerUI?.querySelector(".main-window");
      if (customizerUI && mainWindow && window.renderSkins) {
        // Reload state from DataStore
        window.favoriteSkins = DataStore.get("favoriteSkins") || [];
        window.isFavoritesToggled = DataStore.get("favoritesToggled") || false;
        console.log("Restored state:", {
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
          if (DEBUG) {
            console.log("Favorites toggle updated");
          }
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
          if (DEBUG) {
            console.log(`Filter dropdown updated to: ${currentFilter}`);
          }
        }

        // Ensure previewGroups is populated
        if (!previewGroups.length) {
          if (DEBUG) {
            console.warn("previewGroups empty, regenerating");
          }
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
        if (DEBUG) {
          console.log(`Rendering skins with filter: ${filterValue}`);
        }
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
            if (DEBUG) {
              console.log(`Highlighted selected skin: ${savedSkin.name}`);
            }
          } else {
            if (DEBUG) {
              console.warn(`Selected skin not found: ${savedSkin.name}`);
            }
          }
        }
      } else {
        if (DEBUG) {
          console.warn("Customizer UI or main window missing, reinitializing");
        }
        // Remove existing wrapper and backdrop to avoid duplicates
        if (customizerWrapper) customizerWrapper.remove();
        const existingBackdrop = document.querySelector(
          ".client-bg-customizer-backdrop"
        );
        if (existingBackdrop) existingBackdrop.remove();
        createClientBackgroundCustomizerUI(container);
      }
    } else {
      if (DEBUG) {
        console.warn("Customizer wrapper not found, creating new UI");
      }
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
    if (DEBUG) {
      console.log("Hiding customizer UI");
    }
    customizerWrapper.style.display = "none";
  } else {
    if (DEBUG) {
      console.warn("Customizer wrapper not found during profiles UI init");
    }
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
  opacitySlider.value = storedOpacity;
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
    storedOpacity = newValue;
    opacityValue.textContent = newValue.toString();
    currentOpacity = storedOpacity;
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
    storedOpacity = newValue;
    opacityValue.textContent = newValue.toString();
    currentOpacity = storedOpacity;
    saveSettings();
    checkAndApplyBackground();
  });
  opacitySlider.addEventListener("input", () => {
    storedOpacity = parseFloat(opacitySlider.value);
    opacityValue.textContent = storedOpacity.toString();
    currentOpacity = storedOpacity;
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
        if (DEBUG) {
          console.log("Cleared selected TFT skin");
        }
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

  // New Debug Section
  const debugSettingsTitle = document.createElement("h4");
  debugSettingsTitle.textContent = "Debug";
  debugSettingsTitle.style.cssText = `
        color: #f0e6d2;
        font-size: 18px;
        font-weight: bold;
        margin: 10px 0 5px 0;
        text-transform: uppercase;
    `;
  settingsContent.appendChild(debugSettingsTitle);

  const debugSeparator = document.createElement("hr");
  debugSeparator.style.cssText = `
        border: 0;
        border-top: 1px solid #785a28;
        margin: 10px 0;
    `;
  settingsContent.appendChild(debugSeparator);

  const debugContainer = document.createElement("div");
  debugContainer.className = "toggle-btn";
  debugContainer.style.cssText = `margin-bottom: 15px;`;
  const debugLabel = document.createElement("span");
  debugLabel.textContent = "Enable Debug Mode:";
  const debugSwitch = document.createElement("label");
  debugSwitch.className = "toggle-switch";
  const debugInput = document.createElement("input");
  debugInput.type = "checkbox";
  debugInput.checked = DEBUG;
  const debugSlider = document.createElement("span");
  debugSlider.className = "toggle-slider";
  debugSwitch.appendChild(debugInput);
  debugSwitch.appendChild(debugSlider);
  debugContainer.appendChild(debugLabel);
  debugContainer.appendChild(debugSwitch);
  settingsContent.appendChild(debugContainer);

  debugInput.addEventListener("change", () => {
    DEBUG = debugInput.checked;
    if (DEBUG) {
      console.log("Debug mode toggled:", DEBUG);
    }
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
    if (DEBUG) {
      console.log("Close button clicked");
    }
    settingsWrapper.remove();
    settingsVisible = false;
    const customizerWrapper = document.getElementById(
      "client-bg-customizer-ui-wrapper"
    );
    if (customizerWrapper) {
      if (DEBUG) {
        console.log("Restoring customizer UI");
      }
      customizerWrapper.style.display = "block";
      const customizerUI = document.getElementById("client-bg-customizer-ui");
      if (customizerUI) {
        const typeDropdown = customizerUI.querySelector(
          ".custom-dropdown:not(.filter-dropdown):not(.sort-dropdown)"
        );
        if (typeDropdown) {
          if (DEBUG) {
            console.log("Type dropdown found");
          }
          const typeToggle = typeDropdown.querySelector(".dropdown-toggle");
          const typeMenu = typeDropdown.querySelector(".dropdown-menu");
          if (typeToggle && typeMenu) {
            if (DEBUG) {
              console.log("Updating dropdown to Champion");
            }
            typeToggle.textContent = "Champion";
            const championItem = typeMenu.querySelector(
              '.dropdown-item[data-value="champion"]'
            );
            if (championItem) {
              typeMenu
                .querySelectorAll(".dropdown-item")
                .forEach((item) => item.classList.remove("selected"));
              championItem.classList.add("selected");
              if (DEBUG) {
                console.log("Simulating Champion dropdown click");
              }
              championItem.click();
            }
          }
        } else {
          if (DEBUG) {
            console.log(
              "Type dropdown not found, falling back to manual refresh"
            );
          }
          generatePreviewGroups("champion");
          const mainWindow = customizerUI.querySelector(".main-window");
          if (mainWindow && window.renderSkins) {
            if (DEBUG) {
              console.log("Manually rendering skins");
            }
            window.renderSkins(previewGroups, currentSearchQuery);
          } else {
            if (DEBUG) {
              console.log("renderSkins not available or mainWindow not found");
            }
          }
        }
      } else {
        if (DEBUG) {
          console.log("Customizer UI not found");
        }
      }
    } else {
      if (DEBUG) {
        console.log("Customizer wrapper not found, recreating UI");
      }
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
    if (DEBUG) {
      console.log("Cleared previous shuffle cycle");
    }
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
        if (DEBUG) {
          console.log("No valid favorites, falling back to all skins");
        }
      }
    } else {
      allItems = previewGroups.flatMap((group) =>
        group.items.filter((item) => tftEnabled || !item.isTFT)
      );
    }
    if (allItems.length === 0) {
      if (DEBUG) {
        console.log("No items available for shuffle cycle");
      }
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
      isAnimated: randomItem.isAnimated,
    });
    applyBackground(randomItem);
    if (DEBUG) {
      console.log(`Shuffle cycle applied: ${randomItem.name}`);
    }
  }, cycleInterval * 1000);
  if (DEBUG) {
    console.log(`Started shuffle cycle with interval ${cycleInterval} seconds`);
  }
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
    if (DEBUG) {
      console.warn(
        "Existing customizer wrapper found, removing to prevent duplicates"
      );
    }
    existingWrapper.remove();
  }
  let existingBackdrop = document.querySelector(
    ".client-bg-customizer-backdrop"
  );
  if (existingBackdrop) {
    if (DEBUG) {
      console.warn("Existing backdrop found, removing to prevent duplicates");
    }
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
      if (DEBUG) {
        console.log(`Selected type: ${selectedType}`);
      }
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
      if (DEBUG) {
        console.error("Main window not found");
      }
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
      renderGroups.sort((a, b) => a.title.localeCompare(b.title));
      renderGroups.forEach((group) => {
        group.items.sort((a, b) => a.name.localeCompare(b.name));
      });
    }

    // Ensure Custom Background group is first
    const customGroupIndex = renderGroups.findIndex(
      (group) => group.title === "Custom Background"
    );
    if (customGroupIndex !== -1) {
      const customGroup = renderGroups.splice(customGroupIndex, 1)[0];
      renderGroups.unshift(customGroup);
    }

    if (
      renderGroups.length === 0 &&
      !searchQuery &&
      selectedFilter !== "favorites"
    ) {
      if (DEBUG) {
        console.warn(
          "No groups to render, regenerating with champion grouping"
        );
      }
      generatePreviewGroups("champion");
      renderGroups = previewGroups;
      const customGroupIndex = renderGroups.findIndex(
        (group) => group.title === "Custom Background"
      );
      if (customGroupIndex !== -1) {
        const customGroup = renderGroups.splice(customGroupIndex, 1)[0];
        renderGroups.unshift(customGroup);
      }
    }

    if (DEBUG) {
      console.log("Rendering groups:", renderGroups);
    }

    renderGroups.forEach((group, groupIndex) => {
      if (group.title === "Custom Background" && groupIndex === 0) {
        const addCustomBtn = document.createElement("button");
        addCustomBtn.textContent = "ADD CUSTOM BACKGROUND";
        addCustomBtn.style.cssText = `
                    display: block;
                    margin: 10px auto 20px auto;
                    padding: 5px 16px;
                    min-width: 200px;
                    min-height: 32px;
                    color: #cdbe91;
                    font-size: 14px;
                    font-family: 'LoL Display', 'BeaufortforLOL', sans-serif;
                    font-weight: bold;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                    text-align: center;
                    cursor: pointer;
                    background: #1e2328;
                    border: 2px solid #785a28;
                    box-shadow: 0 0 1px 1px #010a13, inset 0 0 1px 1px #010a13;
                    box-sizing: border-box;
                    transition: color 0.2s, border-color 0.2s, box-shadow 0.2s;
                `;
        addCustomBtn.addEventListener("mouseover", () => {
          addCustomBtn.style.color = "#f0e6d2";
          addCustomBtn.style.borderColor = "#c8aa6e";
          addCustomBtn.style.boxShadow =
            "0 0 8px 4px rgba(212, 184, 117, 0.5), inset 0 0 1px 1px #010a13";
        });
        addCustomBtn.addEventListener("mouseout", () => {
          addCustomBtn.style.color = "#cdbe91";
          addCustomBtn.style.borderColor = "#785a28";
          addCustomBtn.style.boxShadow =
            "0 0 1px 1px #010a13, inset 0 0 1px 1px #010a13";
        });
        addCustomBtn.addEventListener("click", () => {
          if (shuffleCycleIntervalId) {
            clearInterval(shuffleCycleIntervalId);
            shuffleCycleIntervalId = null;
            if (DEBUG) {
              console.log("Stopped shuffle cycle for custom background UI");
            }
          }
          createCustomBackgroundUI(document.body);
          const uiWrapper = document.getElementById(
            "client-bg-customizer-ui-wrapper"
          );
          if (uiWrapper) {
            uiWrapper.style.display = "none";
          }
        });
        mainWindow.appendChild(addCustomBtn);
        if (DEBUG) {
          console.log(
            "Added Add Custom button above Custom Background section"
          );
        }
      }

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
                (item) => item.name === fav.name && item.isTFT === fav.isTFT
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
                isAnimated: item.isAnimated,
              });
            }
          });
          groupFavoriteButton.classList.add("favorited");
          const skinButtons =
            groupTitle.nextElementSibling.querySelectorAll(".favorite-button");
          skinButtons.forEach((btn) => btn.classList.add("favorited"));
        }
        DataStore.set("favoriteSkins", favoriteSkins);
        renderSkins(previewGroups, searchQuery, selectedFilter, sortOverride);
      });
      groupTitle.appendChild(groupFavoriteButton);
      mainWindow.appendChild(groupTitle);

      const skinGroup = document.createElement("div");
      skinGroup.className = "skin-group";

      // Render items or placeholder for Custom Background
      if (group.title === "Custom Background" && group.items.length === 0) {
        const noCustomMessage = document.createElement("div");
        noCustomMessage.className = "no-custom-message";
        noCustomMessage.textContent = "No custom backgrounds added.";
        noCustomMessage.style.cssText = `
                    color: #cdbe91;
                    font-family: 'LoL Display', 'BeaufortforLOL', sans-serif;
                    font-size: 14px;
                    text-align: center;
                    padding: 20px;
                `;
        skinGroup.appendChild(noCustomMessage);
      } else {
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
            if (DEBUG) {
              console.log(
                `Image failed to load for ${item.name}: ${item.tilePath}`
              );
            }
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
              isAnimated: item.isAnimated,
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
                (fav) => !(fav.name === item.name && fav.isTFT === fav.isTFT)
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
                isAnimated: item.isAnimated,
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
            renderSkins(
              previewGroups,
              searchQuery,
              selectedFilter,
              sortOverride
            );
          });
          skinImage.appendChild(skinFavoriteButton);

          if (group.title === "Custom Background") {
            const deleteButton = document.createElement("button");
            deleteButton.className = "delete-button";
            deleteButton.innerHTML = "🗑️";
            deleteButton.style.cssText = `
                            position: absolute;
                            bottom: 5px;
                            left: 5px;
                            width: 24px;
                            height: 24px;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            background: rgba(30, 35, 40, 0.8);
                            border: 1px solid #785a28;
                            border-radius: 4px;
                            color: #cdbe91;
                            font-size: 14px;
                            cursor: pointer;
                            transition: background 0.2s, border-color 0.2s, color 0.2s;
                        `;
            deleteButton.addEventListener("mouseover", () => {
              deleteButton.style.background = "rgba(30, 35, 40, 1)";
              deleteButton.style.borderColor = "#c8aa6e";
              deleteButton.style.color = "#f0e6d2";
            });
            deleteButton.addEventListener("mouseout", () => {
              deleteButton.style.background = "rgba(30, 35, 40, 0.8)";
              deleteButton.style.borderColor = "#785a28";
              deleteButton.style.color = "#cdbe91";
            });

            deleteButton.addEventListener("click", (e) => {
              try {
                e.stopPropagation();
                if (DEBUG) {
                  console.log(
                    "Attempting to delete custom background:",
                    item.name
                  );
                }

                // Find and update the Custom Background group in previewGroups
                const customGroupIdx = previewGroups.findIndex(
                  (g) => g.title === "Custom Background"
                );
                if (customGroupIdx === -1) {
                  if (DEBUG) {
                    console.warn(
                      "Custom Background group not found in previewGroups"
                    );
                  }
                  return;
                }
                const customGroup = previewGroups[customGroupIdx];
                if (DEBUG) {
                  console.log(
                    "Before deletion - previewGroups Custom Background items:",
                    customGroup.items
                  );
                }

                // Remove the item from previewGroups
                customGroup.items = customGroup.items.filter(
                  (bg) => bg.name !== item.name
                );
                if (DEBUG) {
                  console.log(
                    "After deletion - previewGroups Custom Background items:",
                    customGroup.items
                  );
                }

                // Update customBackgrounds and DataStore
                customBackgrounds = customBackgrounds.filter(
                  (bg) => bg.name !== item.name
                );
                DataStore.set("customBackgrounds", customBackgrounds);
                if (DEBUG) {
                  console.log("Updated customBackgrounds:", customBackgrounds);
                }
                if (DEBUG) {
                  console.log(
                    "DataStore after save:",
                    DataStore.get("customBackgrounds")
                  );
                }

                // Check if the deleted background is the currently selected skin
                const selectedSkin = DataStore.get("selectedSkin");
                if (
                  selectedSkin &&
                  selectedSkin.name === item.name &&
                  selectedSkin.isTFT === item.isTFT
                ) {
                  DataStore.set("selectedSkin", null);
                  removeBackground();
                  if (DEBUG) {
                    console.log(
                      "Cleared selectedSkin and removed background as it matched deleted item:",
                      item.name
                    );
                  }
                }

                // Re-render UI with current filter and search query
                const selectedFilter =
                  document.querySelector(
                    ".filter-dropdown .dropdown-item.selected"
                  )?.dataset.value || "all";
                const selectedSort =
                  document.querySelector(
                    ".sort-dropdown .dropdown-item.selected"
                  )?.dataset.value || "alphabetical";
                if (DEBUG) {
                  console.log(
                    "Re-rendering skins with filter:",
                    selectedFilter
                  );
                }
                renderSkins(
                  previewGroups,
                  currentSearchQuery || "",
                  selectedFilter,
                  selectedSort
                );

                // Save settings to ensure DataStore consistency
                saveSettings();
              } catch (error) {
                if (DEBUG) {
                  console.error("Error in deleteButton handler:", error);
                }
              }
            });
            skinImage.appendChild(deleteButton);
          }

          skinContainer.appendChild(skinImage);

          const label = document.createElement("div");
          label.className = "skin-label";
          label.textContent = item.name;
          skinContainer.appendChild(label);

          skinGroup.appendChild(skinContainer);
        });
      }

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
      const customGroupIndex = previewGroups.findIndex(
        (group) => group.title === "Custom Background"
      );
      if (customGroupIndex !== -1) {
        const customGroup = previewGroups.splice(customGroupIndex, 1)[0];
        previewGroups.unshift(customGroup);
      }
      renderSkins(previewGroups, searchQuery, selectedFilter, sortOverride);
    };

    if (DEBUG) {
      console.log(
        "Rendered skins, Custom Background group:",
        renderGroups.find((group) => group.title === "Custom Background")
      );
    }
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
      if (DEBUG) {
        console.log("No items available to randomize");
      }
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
      if (DEBUG) {
        console.log("Stopped shuffle cycle for profiles UI");
      }
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
    if (DEBUG) {
      console.log("Stopped existing shuffle cycle");
    }
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
    /* Hide the entire placeholder invited container when background is enabled */
    .custom-background .placeholder-invited-container {
      display: none !important;
    }
  </style>
`
);
