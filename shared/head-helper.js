/**
 * Shared Head Helper
 * Injects common dependencies (Firebase, Alpine, SweetAlert2, Styles) to reduce HTML duplication.
 */
(function () {
    const isHostDir = window.location.pathname.includes('/host/');
    const prefix = isHostDir ? '../' : './';

    // 1. Meta & Icons
    const headContent = `
        <link rel="icon" type="image/svg+xml" href="${prefix}images/favicon.svg" />
        <link rel="manifest" href="${prefix}manifest.json" />
        <meta name="theme-color" content="#1565c0" />
        <link rel="stylesheet" href="${prefix}shared/styles.css?v=1.6" />
    `;
    document.head.insertAdjacentHTML('beforeend', headContent);

    // 2. Dependencies
    const dependencies = [
        // Core Utilities
        { src: `${prefix}shared/version.js` },
        { src: `${prefix}shared/ui-components.js` },
        { src: `${prefix}shared/data-service.js` },
        { src: `${prefix}shared/ai-helper.js` },
        { src: 'https://cdn.jsdelivr.net/npm/sweetalert2@11' },

        // Firebase Compat
        { src: 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js' },
        { src: 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js' },
        { src: 'https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js' },
        { src: 'https://www.gstatic.com/firebasejs/9.22.0/firebase-storage-compat.js' },
        { src: 'https://www.gstatic.com/firebasejs/9.22.0/firebase-analytics-compat.js' },
        { src: 'https://www.gstatic.com/firebasejs/9.22.0/firebase-performance-compat.js' },

        // App Configuration
        { src: `${prefix}config/firebase-config.js?v=cachebust-fix` },
        { src: `${prefix}shared/firebase-helper.js` },
        { src: `${prefix}shared/quiz-parser.js` },

        // Alpine.js (Must be last and defer)
        { src: 'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js', defer: true },
    ];

    dependencies.forEach((dep) => {
        const script = document.createElement('script');
        script.src = dep.src;
        if (dep.defer) {
            script.defer = true;
        } else {
            script.async = false; // Ensure sequential execution for non-deferred scripts
        }
        document.head.appendChild(script);
    });

    console.log('[HeadHelper] Common dependencies injected');
})();
