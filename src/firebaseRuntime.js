let runtimePromise;

export function firebaseConfigured() {
  return Boolean(
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID &&
    import.meta.env.VITE_FIREBASE_APP_ID &&
    (import.meta.env.DEV || import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY)
  );
}

export function getFirebaseRuntime() {
  if (!firebaseConfigured()) {
    throw new Error("Firebase AI Logic is not configured for this app. Check the Firebase web settings and production App Check site key.");
  }
  if (!runtimePromise) {
    runtimePromise = Promise.all([
      import("firebase/app"),
      import("firebase/app-check"),
      import("firebase/ai")
    ]).then(([appSdk, appCheckSdk, aiSdk]) => {
      const config = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID
      };
      const app = appSdk.getApps().length ? appSdk.getApp() : appSdk.initializeApp(config);

      if (import.meta.env.DEV) {
        // The generated debug token must be safelisted in Firebase App Check for local development.
        self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
        appCheckSdk.initializeAppCheck(app, { isTokenAutoRefreshEnabled: true });
      } else {
        appCheckSdk.initializeAppCheck(app, {
          provider: new appCheckSdk.ReCaptchaEnterpriseProvider(import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY),
          isTokenAutoRefreshEnabled: true
        });
      }

      const ai = aiSdk.getAI(app, { backend: new aiSdk.GoogleAIBackend() });
      return { app, ai, ...aiSdk };
    }).catch(error => {
      runtimePromise = undefined;
      throw error;
    });
  }
  return runtimePromise;
}
