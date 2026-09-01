/**
 * Client-side PDF digital signature service.
 *
 * Uses the Syncfusion JavaScript PDF Library (@syncfusion/ej2-pdf) to sign and
 * inspect PDF documents fully in the browser — no backend/web service needed.
 *
 * Reference: https://help.syncfusion.com/document-processing/pdf/pdf-library/javascript/digitalsignature
 */
import {
    PdfDocument,
    PdfSignature,
    PdfSignatureField,
    CryptographicStandard,
    DigestAlgorithm,
    PdfStandardFont,
    PdfFontFamily,
    PdfBrush,
    PdfBitmap
} from '@syncfusion/ej2-pdf';

/** Maps the UI digest string to the library enum key. */
const DIGEST_MAP = {
    SHA1: 'sha1',
    SHA256: 'sha256',
    SHA384: 'sha384',
    SHA512: 'sha512'
};

/** Maps the UI signature type to the library enum key. */
const STANDARD_MAP = {
    CAdES: 'cades',
    CMS: 'cms'
};

/**
 * Converts a base64 data URL or raw base64 string into Uint8Array.
 *
 * @param {string} base64 - The base64 string (with or without the data URL prefix).
 * @returns {Uint8Array} Decoded bytes.
 */
export const base64ToUint8Array = (base64) => {
    const pureBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
    const binary = atob(pureBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
};

/**
 * Converts Uint8Array binary data into a base64 data URL.
 *
 * @param {Uint8Array} bytes - Binary data to encode.
 * @returns {string} The base64 data URL.
 */
export const uint8ArrayToBase64 = (bytes) => {
    let binary = '';
    const CHUNK_SIZE = 0x8000; // 32KB chunks to avoid call-stack overflow on large PDFs.
    for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK_SIZE));
    }
    return `data:application/pdf;base64,${btoa(binary)}`;
};

/**
 * Signs a PDF entirely on the client with the given PFX certificate.
 *
 * @param {string|Uint8Array} pdfData - Base64 (data URL) or raw bytes of the PDF to sign.
 * @param {Uint8Array|string} pfxData - PFX (.pfx/.p12) certificate bytes or raw base64 string.
 * @param {string} password - The PFX certificate password.
 * @param {object} settings - Signature settings.
 * @param {number} settings.x - Signature field X position (points from left).
 * @param {number} settings.y - Signature field Y position (points from bottom).
 * @param {number} settings.width - Signature field width in points.
 * @param {number} settings.height - Signature field height in points.
 * @param {string} settings.signatureType - 'CAdES' or 'CMS'.
 * @param {string} settings.digestAlgorithm - 'SHA1'|'SHA256'|'SHA384'|'SHA512'|'RIPEMD160'.
 * @param {string} settings.displayMode - 'Image only' | 'With signer details' | 'Signer details only'.
 * @param {string|null} settings.imageData - Optional base64 image for the signature appearance.
 * @param {boolan} settings.includeSigner - Draw signer name in the appearance.
 * @param {boolean} settings.includeReason - Draw reason in the appearance.
 * @param {boolean} settings.includeLocation - Draw location in the appearance.
 * @param {boolean} settings.includeDate - Draw date in the appearance.
 * @param {string} settings.signerName - Signer name.
 * @param {string} settings.reason - Reason for signing.
 * @param {string} settings.location - Location of signing.
 * @param {string} settings.date - Formatted signing date text.
 * @param {string|null} settings.existingFieldName - When set, signs the existing (unsigned) field by name instead of creating a new one.
 * @returns {Promise<object>} - { signedDocument: base64 string, signatureDetails: object }
 */
export const signPdf = async (pdfData, pfxData, password, settings) => {
    const docBytes = typeof pdfData === 'string' ? base64ToUint8Array(pdfData) : pdfData;

    let document = null;
    try {
        // 1. Load the existing PDF.
        document = new PdfDocument(docBytes);
        const form = document.form;

        // 2. Create the digital signature from the PFX certificate.
        const options = {
            cryptographicStandard: CryptographicStandard[STANDARD_MAP[settings.signatureType] ?? 'cms'],
            digestAlgorithm: DigestAlgorithm[DIGEST_MAP[settings.digestAlgorithm] ?? 'sha256'],
            contactInfo: settings.signerName
        };
        if (settings.includeReason && settings.reason) options.reason = settings.reason;
        if (settings.includeLocation && settings.location) options.locationInfo = settings.location;
        if (settings.includeSigner && settings.signerName) options.signedName = settings.signerName;

        const signature = PdfSignature.create(pfxData, password, options);

        // 3. Resolve the target signature field.
        let field;

       if (settings.existingFieldName) {

    let target = null;

    for (let i = 0; i < form.count; i++) {

        const f = form.fieldAt(i);

        if (
            f instanceof PdfSignatureField &&
            f.name === settings.existingFieldName
        ) {
            target = f;
            break;
        }
    }

    if (!target) {
        throw new Error(
            `Signature field "${settings.existingFieldName}" was not found.`
        );
    }

    const bounds = target.bounds;

    field = new PdfSignatureField(
        target.page,
        `${target.name}_signed`,
        {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height
        }
    );

    form.add(field);

    target.flatten = true;
} else {
            // Create a new visible signature field on the first page.
            const page = document.getPage(0);
            field = new PdfSignatureField(page, `SignatureField_${Date.now()}`, {
                x: settings.x,
                y: settings.y,
                width: settings.width,
                height: settings.height
            });
        }

        // 4. Customize the visible appearance (image + signer details).
        //if (!settings.existingFieldName) {
        applyAppearance(field, settings);
        //}

        // 5. Bind the signature and register the field.
        field.setSignature(signature);
        if (!settings.existingFieldName) {
            form.add(field);
        }

        // 6. Save (async to support timestamp-aware signing paths).
        const signedBytes = await document.saveAsync();
        const signedBase64 = uint8ArrayToBase64(signedBytes);

        // 7. Inspect the freshly applied signature for display details.
        let signatureDetails = null;
        try {
            signatureDetails = inspectSignature(field);
        } catch (e) {
            console.warn('Signature inspection failed:', e);
        }

        return { signedDocument: signedBase64, signatureDetails };
    } finally {
        if (document) document.destroy();
    }
};

/**
 * Draws the visible appearance for a signature field (image and/or signer text).
 *
 * @param {PdfSignatureField} field - The signature field to decorate.
 * @param {object} settings - Signature settings (see signPdf).
 * @returns {void}
 */
const applyAppearance = (field, settings) => {

    const graphics =
        field.getAppearance().normal.graphics;

    const fieldWidth = field.bounds.width;
    const fieldHeight = field.bounds.height;

    const drawText =
        settings.displayMode !== 'Image only';

    const drawImage =
        settings.imageData &&
        settings.displayMode !== 'Signer details only';

    let imageAreaWidth = fieldWidth;
    let textAreaX = 0;
    let textAreaWidth = fieldWidth;

    if (drawImage && drawText) {

        imageAreaWidth = fieldWidth * 0.57;

        textAreaX = imageAreaWidth;
        textAreaWidth = fieldWidth * 0.43;
    }

    if (drawImage) {

        const imageBytes =
            base64ToUint8Array(settings.imageData);

        const bitmap =
            new PdfBitmap(imageBytes);

        const bounds =
            getVisibleSignImageBounds(
                fieldHeight,
                imageAreaWidth,
                bitmap.height,
                bitmap.width
            );

graphics.drawImage(bitmap, {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height
});

    }

    if (drawText) {

        const font =
            new PdfStandardFont(
                PdfFontFamily.helvetica,
                8
            );

        const brush =
            new PdfBrush({ r: 0, g: 0, b: 0 });

        const lines = [];

        if (settings.includeSigner)
            lines.push(
                `Digitally signed by ${settings.signerName}`
            );

        if (settings.includeReason)
            lines.push(
                `Reason: ${settings.reason}`
            );

        if (settings.includeLocation)
            lines.push(
                `Location: ${settings.location}`
            );

        if (settings.includeDate)
            lines.push(
                `Date: ${settings.date}`
            );

        const totalTextHeight = lines.length * 10;
let y = (fieldHeight - totalTextHeight) / 2;

        lines.forEach(line => {

            graphics.drawString(
    line,
    font,
    {
        x: textAreaX + 4,
        y: y,
        width: textAreaWidth - 8,
        height: 10
    },
    brush
);

            y += 10;
        });
    }
};
/**
 * Calculates image bounds while preserving aspect ratio.
 */
const getVisibleSignImageBounds = (
    boundsHeight,
    boundsWidth,
    imageHeight,
    imageWidth
) => {

    const imageAspect = imageWidth / imageHeight;
    const boundsAspect = boundsWidth / boundsHeight;

    let drawWidth;
    let drawHeight;
    let offsetX;
    let offsetY;

    if (imageAspect > boundsAspect) {
        // Wider image
        drawWidth = boundsWidth;
        drawHeight = boundsWidth / imageAspect;

        offsetX = 0;
        offsetY = (boundsHeight - drawHeight) / 2;
    }
    else {
        // Taller image
        drawHeight = boundsHeight;
        drawWidth = boundsHeight * imageAspect;

        offsetX = (boundsWidth - drawWidth) / 2;
        offsetY = 0;
    }

    return {
        x: offsetX,
        y: offsetY,
        width: drawWidth,
        height: drawHeight
    };
};
/**
 * Extracts signature information from a signature field.
 *
 * @param {PdfSignatureField} field - The signature field to inspect.
 * @returns {object} - { signedName, reason, location, signedDate, subjectName, issuerName, validFrom, validTo, algorithm }
 */
export const inspectSignature = (field) => {
    const signature = field.getSignature();
    const options = signature.getSignatureOptions();
    const certificateInfo = signature.getCertificateInformation();

    let digestName = 'Unknown';
    if (typeof options.digestAlgorithm === 'number') {
        digestName = Object.keys(DigestAlgorithm)[options.digestAlgorithm] || 'Unknown';
    }

    return {
        signedName: options.signedName,
        reason: options.reason,
        location: options.locationInfo,
        signedDate: signature.getSignedDate(),
        subjectName: certificateInfo.subjectName,
        issuerName: certificateInfo.issuerName,
        validFrom: certificateInfo.validFrom,
        validTo: certificateInfo.validTo,
        algorithm: digestName
    };
};

/**
 * Inspects all signature fields in a PDF (client-side, no service).
 *
 * @param {string|Uint8Array} pdfData - Base64 (data URL) or raw bytes of the PDF.
 * @returns {Promise<object>} - Validation-style result:
 *   { hasSignature, successVisible, warningVisible, errorVisible, message, signatures }
 */
export const validateSignatures = async (pdfData) => {
    const docBytes = typeof pdfData === 'string' ? base64ToUint8Array(pdfData) : pdfData;

    let document = null;
    try {
        document = new PdfDocument(docBytes);
        const form = document.form;
        const signatures = [];

        for (let i = 0; i < form.count; i++) {
            const field = form.fieldAt(i);
            if (!(field instanceof PdfSignatureField)) continue;
            if (!field.isSigned) continue;

            const details = inspectSignature(field);
            signatures.push({
                fieldName: field.name,
                ...details,
                isCertificateExpired: details.validTo ? new Date(details.validTo) < new Date() : false
            });
        }

        // Build the same banner semantics the old ValidateSignature service used.
        let hasSignature = signatures.length > 0;
        let successVisible = false;
        let warningVisible = false;
        let errorVisible = false;
        let message = '';

        if (hasSignature) {
            const anyExpired = signatures.some((s) => s.isCertificateExpired);
            if (anyExpired) {
                warningVisible = true;
                message = 'The document has been digitally signed and at least one signature has problem - the signer certificate has expired.';
            } else {
                successVisible = true;
                message = 'The document has been digitally signed and all the signatures are valid.';
            }
        }

        return {
            hasSignature,
            successVisible,
            warningVisible,
            errorVisible,
            message,
            signatures
        };
    } finally {
        if (document) document.destroy();
    }
};