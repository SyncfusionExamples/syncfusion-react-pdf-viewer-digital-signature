import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Syncfusion PDF Viewer demo endpoints live on https://document.syncfusion.com
// but do NOT return CORS headers, so the browser blocks direct XHR calls from
// http://localhost:5173. Proxy them through the Vite dev server so the browser
// sees same-origin requests.
const SYNCFUSION_PDF_HOST = 'https://document.syncfusion.com'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            // PDF Viewer web API (AddVisibleSignature, FileUploader/Save, etc.).
            // The PDFium runtime files are NOT proxied — they are loaded by a
            // Web Worker via importScripts(), which requires a fully same-origin
            // URL. Loading them directly from cdn.syncfusion.com works because
            // that host already serves the right CORS headers.
            '/syncfusion-pdf-api': {
                target: SYNCFUSION_PDF_HOST,
                changeOrigin: true,
                secure: true,
                rewrite: (path) => path.replace(/^\/syncfusion-pdf-api/, '/web-services/pdf-viewer/api')
            }
        }
    }
})
