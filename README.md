# Syncfusion React PDF Viewer - Digital Signature

A React 19 + Vite sample showcasing Syncfusion PDF Viewer features, including digital signatures, signature validation, form-field replication, page organization, PDF merging, and document flattening. To run the application as a standalone app, use the following commands:

```bash
npm install
npm run dev
```

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

Ensure configurations were proper in `capacitor.config.json` file in your project root:

```json
{
  "appId": "com.syncfusionej2pdfviewer.app",
  "appName": "syncfusion-ej2-pdfviewer",
  "webDir": "dist"
}
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

---

## Building IPA for iOS

Follow these steps to convert the React application into an IPA file for iOS deployment.

### 1. Build the React Application

```bash
npm run build
```

This creates an optimized production build in the `dist` directory.

### 2. Install Capacitor (if not already installed)

```bash
npm install @capacitor/core @capacitor/cli
npx cap init
```

During the `cap init` command, you'll be prompted to enter your app name and App ID (e.g., `com.syncfusion.pdfviewer`).

### 3. Configure Capacitor

Ensure configurations are properly set in `capacitor.config.json` file in your project root:

```json
{
  "appId": "com.syncfusionej2pdfviewer.app",
  "appName": "syncfusion-ej2-pdfviewer",
  "webDir": "dist"
}
```

**Note:** Make sure the `webDir` points to your build output directory (typically `dist` for Vite projects).

### 4. Add iOS Platform

```bash
npm install @capacitor/ios
npx cap add ios
npx cap copy
```

### 5. Open in Xcode

```bash
npx cap open ios
```

This opens the iOS project in Xcode where you can build the IPA.

### 6. Configure Signing & Capabilities in Xcode

In Xcode:

1. Select your project in the Project Navigator (left sidebar)
2. Select the target application
3. Navigate to the **Signing & Capabilities** tab
4. Configure your Apple Developer Team and Bundle Identifier
5. Ensure the correct provisioning profile is selected

### 7. Generate Archive

In Xcode:

1. Select **Product** menu
2. Select **Archive**
3. Wait for the build and archiving process to complete

### 8. Export IPA

After archiving:

1. The **Organizer** window will open automatically showing the archive
2. Select your archive and click **Distribute App**
3. Choose **App Store Connect** or **Ad Hoc** distribution method
4. Follow the prompts to sign and export the IPA file
5. The IPA will be saved to your specified location

### Prerequisites for iOS Development

- **macOS**: Required for iOS development
- **Xcode**: Download from the Mac App Store
- **Apple Developer Account**: Required for code signing and distribution
- **Cocoapods**: Usually installed automatically with Xcode, but can be installed via: `sudo gem install cocoapods`

