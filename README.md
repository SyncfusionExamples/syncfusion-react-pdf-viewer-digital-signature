# Syncfusion React PDF Viewer - Digital Signature

A React 19 + Vite sample showcasing Syncfusion PDF Viewer features, including digital signatures, signature validation, form-field replication, page organization, PDF merging, and document flattening.

## Features

- Default Viewer with thumbnail, stamp, form-field, page organizer merge document, and flatten support.
- Digital Signature sample that signs PDFs entirely in the browser using a PFX certificate and Syncfusion PDF Library.
- Supports signature appearance customization with image, signer details, location, reason, and date.
- Automatically discovers and signs existing signature fields in loaded PDFs.
- Stamp Annotations can be added using the built-in Annotation toolbar and are preserved in the document.
- Signature fields can be replicated across all pages sharing the same field name.
- Thumbnail pane opens by default for easy navigation.
- Organize Pages allows page insertion, deletion, rotation, reordering, and PDF merging.
- Flatten PDF, annotations, or form fields and reload the flattened result directly in the viewer.
- No backend service is required. All signing and validation operations run locally in the browser.

## Command to run the standalone sample

```bash
npm install
npm run dev
```

---

## Building APK for Android

Follow these steps to convert the React application into an APK file for Android deployment.

### 1. Build the React Application

```bash
npm run build
```

This creates an optimized production build in the `dist` directory.

### 2. Install Capacitor

```bash
npm install @capacitor/core @capacitor/cli
npx cap init
```

During the `cap init` command, you'll be prompted to enter your app name and App ID (e.g., `com.syncfusion.pdfviewer`).

### 3. Configure Capacitor

Ensure configurations were proper in `capacitor.config.ts` file in your project root:

```typescript
const config = {
  appId: 'com.syncfusion.pdfviewer',
  appName: 'PdfViewer',
  webDir: 'dist'
};
export default config;
```

**Note:** Make sure the `webDir` points to your build output directory (typically `dist` for Vite projects).

### 4. Add Android Platform

```bash
npm install @capacitor/android
npx cap add android
npx cap copy
```

### 5. Open in Android Studio

```bash
npx cap open android
```

This opens the Android project in Android Studio where you can build the APK.

### 6. Generate Signed APK

In Android Studio:

1. Navigate to **Build** menu
2. Select **Generate Signed Bundle / APK**
3. Choose **APK** 
4. Click **Finish** to generate the APK


