// src/components/PixiWrapper.jsx - FORCE FULLSCREEN
import { useRef, useEffect } from 'react';
import pixiApp from '../pixi/PixiApp';

const PixiWrapper = () => {
  const containerRef = useRef();
  const initializedRef = useRef(false);  // Track if we've already initialized
  const lastDPIRef = useRef(window.devicePixelRatio || 1);  // Track DPI changes

  useEffect(() => {
    // Prevent double initialization in React Strict Mode
    if (initializedRef.current) {
      console.log('🔗 PixiJS already initialized, skipping...');
      return;
    }

    const initPixi = async () => {
      if (containerRef.current) {
        try {
          console.log('🔗 Initializing PixiJS from React...');
          initializedRef.current = true;

          // FORCE CONTAINER TO EXACT VIEWPORT SIZE
          const container = containerRef.current;

          console.log('🖥️ Viewport:', window.innerWidth, 'x', window.innerHeight);
          console.log('🖥️ Initial DPI:', window.devicePixelRatio);

          // Set exact pixel dimensions
          container.style.width = window.innerWidth + 'px';
          container.style.height = window.innerHeight + 'px';
          container.style.position = 'fixed';
          container.style.top = '0px';
          container.style.left = '0px';
          container.style.zIndex = '9999';
          container.style.margin = '0px';
          container.style.padding = '0px';
          container.style.border = '0px';
          container.style.maxWidth = 'none';
          container.style.maxHeight = 'none';

          console.log('📦 Container set to:', container.style.width, 'x', container.style.height);

          await pixiApp.init(containerRef.current);

          console.log('✅ PixiJS initialized successfully in React');
        } catch (error) {
          console.error('❌ Failed to initialize PixiJS:', error);
        }
      }
    };

    // Force full screen on window resize AND check for DPI changes
    const handleResize = () => {
      if (containerRef.current) {
        const container = containerRef.current;
        const currentDPI = window.devicePixelRatio || 1;

        // Update container size
        container.style.width = window.innerWidth + 'px';
        container.style.height = window.innerHeight + 'px';

        // Check if DPI changed (monitor switch)
        if (currentDPI !== lastDPIRef.current) {
          console.log('🖥️ DPI CHANGED in React:', lastDPIRef.current, '→', currentDPI);
          lastDPIRef.current = currentDPI;
        }

        console.log('📐 Resized container to:', window.innerWidth, 'x', window.innerHeight, 'DPI:', currentDPI);
      }
    };

    // Additional DPI monitoring using matchMedia (React-level backup)
    let dpiMediaQuery = null;
    let dpiChangeHandler = null;

    const setupDPIWatch = () => {
      const currentDPI = window.devicePixelRatio || 1;

      if (dpiMediaQuery) {
        dpiMediaQuery.removeEventListener('change', dpiChangeHandler);
      }

      const mqString = `(resolution: ${currentDPI}dppx)`;
      dpiMediaQuery = window.matchMedia(mqString);

      dpiChangeHandler = () => {
        console.log('🖥️ DPI change detected via React matchMedia');
        handleResize();
        setupDPIWatch(); // Re-setup for new DPI
      };

      dpiMediaQuery.addEventListener('change', dpiChangeHandler);
    };

    initPixi();
    window.addEventListener('resize', handleResize);

    // Setup DPI monitoring if supported
    if (typeof window.matchMedia !== 'undefined') {
      setupDPIWatch();
      console.log('✅ React-level DPI monitoring enabled');
    }

    return () => {
      window.removeEventListener('resize', handleResize);

      // Clean up DPI monitoring
      if (dpiMediaQuery && dpiChangeHandler) {
        dpiMediaQuery.removeEventListener('change', dpiChangeHandler);
      }

      // Don't destroy or reset on cleanup in dev mode (Strict Mode remounts)
      // Only cleanup the resize listener
      console.log('🔗 Cleanup: Removed resize and DPI listeners');
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        // NOTE: Width and height are set by JavaScript in useEffect
        // to exact pixel values based on window.innerWidth/Height.
        // Only setting non-conflicting fallback styles here.
        position: 'fixed',
        top: 0,
        left: 0,
        background: '#1a1a2e',
        margin: 0,
        padding: 0,
        border: 0,
        zIndex: 9999
      }}
    />
  );
};

export default PixiWrapper;