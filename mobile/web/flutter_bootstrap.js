{{flutter_js}}
{{flutter_build_config}}

// Disable service worker caching to ensure users always receive the latest app updates immediately
_flutter.loader.load({
  serviceWorkerSettings: null
});
