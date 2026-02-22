let toastApi = null;

// Simple utility to set the toast API from the ToastProvider and use it in non-React code
export const setNotifier = (api) => {
  toastApi = api;
};

// Simple wrapper around the toast API for easy use across the app
export const notify = {
  success: (msg) => toastApi?.success(msg),
  error: (msg) => toastApi?.error(msg),
  info: (msg) => toastApi?.info(msg),

  // drop in alert replacement
  alert: (msg) => toastApi?.info(msg),
};