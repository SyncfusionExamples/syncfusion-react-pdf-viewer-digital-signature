/**
 * Visible Digital Signature sample
 */
import * as React from 'react';
import { useState, useRef } from 'react';
import {
    PdfViewerComponent, Toolbar, Magnification, Navigation, Annotation, LinkAnnotation,
    BookmarkView, ThumbnailView, Print, TextSelection, TextSearch, FormFields,
    FormDesigner, Inject
} from '@syncfusion/ej2-react-pdfviewer';
import { NumericTextBoxComponent, TextBoxComponent, UploaderComponent } from '@syncfusion/ej2-react-inputs';
import { ButtonComponent, CheckBoxComponent } from '@syncfusion/ej2-react-buttons';
import { MessageComponent } from '@syncfusion/ej2-react-notifications';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { ToolbarComponent, ItemsDirective, ItemDirective } from '@syncfusion/ej2-react-navigations';
import { isNullOrUndefined, select } from '@syncfusion/ej2-base';
import { DatePickerComponent } from '@syncfusion/ej2-react-calendars';
import { PdfDocument, PdfSignatureField } from '@syncfusion/ej2-pdf';
import { signPdf, validateSignatures } from './pdf-signature-service.js';

import './pdf.component.css';

const ImageList = React.forwardRef(({ imageUrlsProp, selectedIndexProp }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(selectedIndexProp);
    const [imageUrls, setImageUrls] = useState(imageUrlsProp);

    // Mirror state into refs so the imperative handle always sees the latest values
    // (avoids stale-closure bugs where the parent's "Sign Document" click reads the
    // initial render's imageUrls/selectedIndex instead of the current ones).
    const imageUrlsRef = React.useRef(imageUrls);
    const selectedIndexRef = React.useRef(selectedIndex);
    React.useEffect(() => { imageUrlsRef.current = imageUrls; }, [imageUrls]);
    React.useEffect(() => { selectedIndexRef.current = selectedIndex; }, [selectedIndex]);

    const handleImageClick = (index) => setSelectedIndex(index);
    const handleImageDelete = (args, index) => {
        args.stopPropagation();
        setImageUrls((images) => images.filter((_, i) => i !== index));
        if (selectedIndex >= index) setSelectedIndex(selectedIndex - 1);
    };

    React.useImperativeHandle(ref, () => ({
        addImageUrls: (url) => {
            setImageUrls((prev) => {
                // Sync the selected index *inside* the updater so it reflects the
                // new array length even before React commits the state change.
                selectedIndexRef.current = prev.length;
                return [...prev, url];
            });
            setSelectedIndex((prev) => prev); // trigger re-render
        },
        getSelectedImageUrl: () => {
            const urls = imageUrlsRef.current;
            const idx = selectedIndexRef.current;
            return idx >= 0 && idx < urls.length ? urls[idx] : urls[0];
        },
        updateSelectedIndex: (index) => setSelectedIndex(index)
    }));

    return (imageUrls.length > 0 && (
        <div className="e-pv-visible-sign-uploaded-images">
            {imageUrls.map((src, index) => (
                <div key={index} className={`e-pv-visible-sign-image-wrapper ${selectedIndex === index ? 'selected' : ''}`} onClick={() => handleImageClick(index)}>
                    {index !== 0 && (
                        <ButtonComponent iconCss="e-icons e-close" cssClass="e-round e-small" className="e-pv-visible-sign-image-delete" onClick={(args) => handleImageDelete(args, index)} />
                    )}
                    <img className="e-pv-visible-sign-image" src={src} alt={`Signature ${index}`} />
                </div>
            ))}
        </div>
    ));
});
ImageList.displayName = 'ImageList';

const VisibleDigitalSignature = () => {
    const displayModes = ['Image only', 'With signer details', 'Signer details only'];
    const digestAlgorithms = ['SHA1', 'SHA256', 'SHA384', 'SHA512', 'RIPEMD160'];
    const x = useRef(24);
    const y = useRef(12);
    const height = useRef(120);
    const width = useRef(200);
    const signatureType = useRef('CAdES');
    const displayMode = useRef(displayModes[1]);
    const digestAlgorithm = useRef(digestAlgorithms[1]);
    const signatureField = useRef('Signature Field 1');
    const imageListRef = useRef(null);
    const toolbarRef = useRef(null);
    const fileInputRef = useRef(null);
    const fileName = useRef('visibleDigitalSignature');
    const documentData = useRef('');
    const viewer = useRef(null);
    const hasDigitalSignature = useRef(false);
    const signSuccessTimer = useRef(null);
    // PFX certificate used for client-side signing (same asset the Syncfusion
    // samples use). Fetched on demand and kept only in memory.
    const PFX_URL = 'https://cdn.syncfusion.com/content/pdf/localhost.pfx';
    const PFX_PASSWORD = 'Syncfusion@123';
    const certificateData = useRef(null);
    const existingFieldNames = useRef([]);

    /**
     * Fetches (and caches) the PFX certificate bytes for client-side signing.
     * The browser equivalent of the server samples' `GetByteArrayAsync` call.
     */
    const getCertificateData = async () => {
        if (certificateData.current) return certificateData.current;
        const response = await fetch(PFX_URL);
        if (!response.ok) throw new Error(`Failed to download the signing certificate (HTTP ${response.status}).`);
        const buffer = await response.arrayBuffer();
        certificateData.current = new Uint8Array(buffer);
        return certificateData.current;
    };

    React.useEffect(() => {
    getCertificateData().catch(console.error);
}, []);

    const [showSignatureImages, setShowSignatureImages] = useState(true);
    const [signDocVisibility, setSignDocVisibility] = useState(true);
    const [downloadVisibility, setDownloadVisibility] = useState(true);
    const [activeTab, setActiveTab] = useState(0);
    const [checkboxStates, setCheckboxStates] = useState({ signer: true, reason: true, location: true, date: true });
    const [successVisible, setSuccessVisible] = useState(false);
    const [warningVisible, setWarningVisible] = useState(false);
    const [errorVisible, setErrorVisible] = useState(false);
    const [isSigning, setIsSigning] = useState(false);
    const [msgText, setMsgText] = useState({
        success: 'The document has been digitally signed and all the signatures are valid',
        warning: 'The document has been digitally signed and at least one signature has problem',
        error: 'The document has been digitally signed, but it has been modified since it was signed and at least one signature is invalid'
    });

    let uploaderObj;
    let displayModeDropDownObj;

    const blobToBase64 = (blob) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });

    const formatDate = (inputDate) => {
        const month = String(inputDate.getMonth() + 1).padStart(2, '0');
        const date = String(inputDate.getDate()).padStart(2, '0');
        const year = String(inputDate.getFullYear()).slice(-2);
        return `${month}-${date}-${year}`;
    };

    const textBoxValues = useRef({
        signer: 'James Carter',
        reason: 'I am the Author',
        location: 'Austin',
        date: formatDate(new Date())
    });

    const tabHeaders = [{ key: 0, text: 'Create new' }, { key: 1, text: 'Existing Field' }];
    const todayMax = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

    const defaultSignImage = "data:image/png;base64,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";

    const renderTabHeader = () => (
        <div>
            <div className="e-pv-visible-sign-header-title">
                <div className="e-pv-visible-sign-group-title">Signature Field</div>
            </div>
            <div className="e-pv-visible-sign-tab-header">
                {tabHeaders.map((header) => (
                    <div key={header.key} onClick={() => setActiveTab(header.key)} className={`e-pv-visible-sign-tab-header-item${activeTab === header.key ? ' active' : ''}`}>
                        <div className="e-pv-visible-sign-tab-header-item-text">{header.text}</div>
                    </div>
                ))}
            </div>
        </div>
    );

    const handleCheckboxChange = (field, checked) => setCheckboxStates((prev) => ({ ...prev, [field]: checked }));
    const handleTextFieldChange = (field, value) => {
        if (field === 'date') value = formatDate(new Date(value));
        textBoxValues.current[field] = value;
    };

    const onFileSelect = (args) => { uploaderObj.upload(args.filesData); args.cancel = true; };
    const onFileSuccess = async (args) => {
        if (args.file.rawFile instanceof Blob) {
            const imageBase64 = await blobToBase64(args.file.rawFile);
            imageListRef.current?.addImageUrls(imageBase64);
            uploaderObj.clearAll();
        } else {
            console.error('Unexpected file data type:', typeof args.file.rawFile);
        }
    };
    const browseOpen = (args) => {
        const browseButton = select('#e-pv-visible-sign-image-uploader .e-file-select-wrap button', document);
        if (!isNullOrUndefined(browseButton)) browseButton.click();
        args.preventDefault();
    };
    const handleSignImagesVisibility = (args) => {
        setShowSignatureImages(args.checked);
        displayModeDropDownObj.value = args.checked ? displayModes[1] : displayModes[2];
    };

    const renderSignatureImageGroup = () => (
        <>
            <div className="e-pv-visible-sign-signature-image-group">
                <div className="e-pv-visible-sign-signature-image-header">
                    <CheckBoxComponent label="Signature image" checked={showSignatureImages} change={(args) => handleSignImagesVisibility(args)} />
                </div>
                {showSignatureImages && (
                    <>
                        <div id="e-pv-visible-sign-image-uploader" style={{ display: 'none' }}>
                            <UploaderComponent id="signature-image-uploader" ref={(scope) => { uploaderObj = scope; }} allowedExtensions=".jpg,.jpeg,.png" dropArea=".e-pv-visible-sign-tab-panel"  success={onFileSuccess} showFileList={false} selected={onFileSelect} multiple={false} />
                        </div>
                        
                    </>
                )}
            </div>
            {showSignatureImages && <ImageList imageUrlsProp={[defaultSignImage]} selectedIndexProp={0} ref={imageListRef} />}
        </>
    );

    const renderSignatureDescription = () => (
        <div className="e-pv-visible-sign-group">
            <div className="e-pv-visible-sign-group-title" style={{ marginBottom: '6px' }}><span>Signature Description</span></div>
            <table className="e-pv-visible-sign-inner-table">
                <tbody>
                    {(['signer', 'reason', 'location', 'date']).map((field) => (
                        <tr key={field}>
                            <td>
                                <CheckBoxComponent checked={checkboxStates[field]} change={(e) => handleCheckboxChange(field, e.checked)} label={`Show ${field}`} />
                            </td>
                            <td>
                                {field === 'date' ? (
                                    <DatePickerComponent placeholder={`Enter ${field}`} value={new Date(textBoxValues.current[field])} format="MM-dd-yy" inputFormats={['dd-MM-yy', 'MM-dd-yy']} enabled={checkboxStates[field]} allowEdit={false} max={todayMax} showClearButton={false} change={(e) => handleTextFieldChange(field, e.value)} />
                                ) : (
                                    <TextBoxComponent placeholder={`Enter ${field}`} value={textBoxValues.current[field]} enabled={checkboxStates[field]} change={(e) => handleTextFieldChange(field, e.value)} />
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const renderDropdowns = () => (
        <div className="e-pv-visible-sign-group">
            <table className="e-pv-visible-sign-inner-table">
                <tbody>
                    <tr>
                        <td><div className="e-pv-visible-sign-dropdown-label"><span>Display mode</span></div></td>
                        <td>
                            <DropDownListComponent ref={(scope) => { displayModeDropDownObj = scope; }} enabled={showSignatureImages} dataSource={displayModes} value={displayMode.current} change={(args) => { displayMode.current = args.value; }} placeholder="Select display mode" />
                        </td>
                    </tr>
                    <tr>
                        <td><div className="e-pv-visible-sign-dropdown-label"><span>Signature Type</span></div></td>
                        <td>
                            <DropDownListComponent dataSource={['CAdES', 'CMS']} value={signatureType.current} change={(args) => { signatureType.current = args.value; }} placeholder="Select signature type" />
                        </td>
                    </tr>
                    <tr>
                        <td><div className="e-pv-visible-sign-dropdown-label"><span>Digest Algorithm</span></div></td>
                        <td>
                            <DropDownListComponent dataSource={digestAlgorithms} value={digestAlgorithm.current} change={(args) => { digestAlgorithm.current = args.value; }} placeholder="Select Digest Algorithm" />
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );

    const createNewContent = () => (
        <div>
            <div className="e-pv-visible-sign-group">
                <div className="e-pv-visible-sign-group-title"><span>Position</span></div>
                <table className="e-pv-visible-sign-position-table">
                    <tbody>
                        <tr>
                            <td>
                                <div className="e-pv-visible-sign-text-content">
                                    <span>X</span>
                                    <div className="e-pv-visible-sign-input-item">
                                        <NumericTextBoxComponent showSpinButton={false} placeholder="24" format="###.##" min={0} change={(args) => { x.current = args.value; }} value={x.current} />
                                    </div>
                                </div>
                            </td>
                            <td>
                                <div className="e-pv-visible-sign-text-content">
                                    <span>Y</span>
                                    <div className="e-pv-visible-sign-input-item">
                                        <NumericTextBoxComponent showSpinButton={false} placeholder="12" format="###.##" min={0} change={(args) => { y.current = args.value; }} value={y.current} />
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div className="e-pv-visible-sign-group" style={{ marginTop: '6px' }}>
                <div className="e-pv-visible-sign-group-title"><span>Size</span></div>
                <table className="e-pv-visible-sign-size-table">
                    <tbody>
                        <tr>
                            <td>
                                <div className="e-pv-visible-sign-text-content">
                                    <span>Width</span>
                                    <div className="e-pv-visible-sign-input-item">
                                        <NumericTextBoxComponent placeholder="200" format="###.##" min={0} change={(args) => { width.current = args.value; }} value={width.current} />
                                    </div>
                                </div>
                            </td>
                            <td>
                                <div className="e-pv-visible-sign-text-content">
                                    <span>Height</span>
                                    <div className="e-pv-visible-sign-input-item">
                                        <NumericTextBoxComponent placeholder="120" format="###.##" min={0} change={(args) => { height.current = args.value; }} value={height.current} />
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );

    const existingFieldContent = () => (
        <div>
            <div className="e-pv-visible-sign-group">
                <table className="e-pv-visible-sign-inner-table">
                    <tbody>
                        <tr>
                            <td><div className="e-pv-visible-sign-dropdown-label"><span>Existing Field</span></div></td>
                            <td>
                                <div className="e-pv-visible-sign-text-content">
                                    <DropDownListComponent
                                        dataSource={existingFieldNames.current.length > 0 ? existingFieldNames.current : ['Signature Field 1']}
                                        value={signatureField.current}
                                        change={(args) => { signatureField.current = args.value; }}
                                        placeholder="Select existing field"
                                    />
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );

    const createContent = (index) => (
        <div className="e-pv-visible-sign-tab">
            <div className="e-pv-visible-sign-tab-content">
                {index === 0 ? createNewContent() : existingFieldContent()}
                <hr />
                {renderSignatureImageGroup()}
                <hr />
                {renderSignatureDescription()}
                <hr />
                {renderDropdowns()}
            </div>
        </div>
    );

    const renderCertificateGroup = () => (
        <div className="e-pv-visible-sign-group">
            <table className="e-pv-visible-sign-inner-table">
                <tbody>
                    <tr>
                        <td>
                            <div style={{ fontSize: '11px', color: '#666' }}>
                                The signing certificate is downloaded from the Syncfusion CDN and the document is signed locally in the browser - no server involved.
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );

    const renderSignDocumentButton = () => (
        <div className="e-pv-visible-sign-tab-content-footer">
            <ButtonComponent id="visibleSign_button_signDocument" cssClass="e-primary" disabled={!signDocVisibility || isSigning} onClick={() => signDocument()}>
                {isSigning ? 'Signing...' : 'Sign Document'}
            </ButtonComponent>
        </div>
    );

    const signDocument = async () => {
        try {
            if (!viewer.current) {
                console.error('Sign Document: PDF viewer is not ready yet.');
                return;
            }

            setIsSigning(true);

            // Download the PFX certificate (browser equivalent of the server
            // samples' httpClient.GetByteArrayAsync call), then sign locally.
            const pfxBytes = await getCertificateData();

            // Capture the live document from the viewer as base64.
            const blob = await viewer.current.saveAsBlob();
            const pdfBase64 = await blobToBase64(blob);

            // Sign fully in the browser with the Syncfusion JavaScript PDF Library.
            const settings = {
                x: x.current,
                y: y.current,
                width: width.current,
                height: height.current,
                signatureType: signatureType.current,
                digestAlgorithm: digestAlgorithm.current,
                displayMode: displayMode.current,
                imageData: showSignatureImages && displayMode.current !== displayModes[2] ? imageListRef.current?.getSelectedImageUrl() : null,
                includeSigner: checkboxStates.signer,
                includeReason: checkboxStates.reason,
                includeLocation: checkboxStates.location,
                includeDate: checkboxStates.date,
                signerName: textBoxValues.current.signer,
                reason: textBoxValues.current.reason,
                location: textBoxValues.current.location,
                date: textBoxValues.current.date,
                existingFieldName: activeTab === 1 ? signatureField.current : null
            };

            const { signedDocument } = await signPdf(pdfBase64, pfxBytes, PFX_PASSWORD, settings);

            documentData.current = signedDocument;
            viewer.current.load(signedDocument, null);
            viewer.current.fileName = fileName.current;
            viewer.current.downloadFileName = fileName.current;

            // Lock further signing and allow the signed PDF to be downloaded,
            // then validate the freshly-signed document in the client too.
            setSignDocVisibility(false);
            setDownloadVisibility(false);
            hasDigitalSignature.current = true;
            validateSignature(signedDocument);
        } catch (error) {
            console.error('Client-side signing failed:', error);
            setMsgText((m) => ({ ...m, error: `Signing failed: ${error?.message || 'Unknown error'}` }));
            setErrorVisible(true);
            setWarningVisible(false);
            setSuccessVisible(false);
        } finally {
            setIsSigning(false);
        }
    };

    const toolbarClickHandler = (args) => {
        if (args.item.id === 'visibleSign_download') viewer.current.download();
        else if (args.item.id === 'file_Open') fileInputRef.current?.click();
    };

    // Handle a file picked via the Open toolbar icon. Mirrors the Invisible
    // signature sample's readFile(): load the local PDF, store the base64 in
    // documentData (so a subsequent Sign can use it) and run validation.
    const readFile = (evt) => {
        const file = evt.target.files && evt.target.files[0];
        if (!file) return;
        fileName.current = file.name;
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const dataUrl = e.target ? e.target.result : '';
            documentData.current = dataUrl;
            // Reset validation UI for a freshly opened file.
            setSignDocVisibility(true);
            setDownloadVisibility(true);
            hasDigitalSignature.current = false;
            setSuccessVisible(false);
            setWarningVisible(false);
            setErrorVisible(false);
            // Re-discover signature fields in the newly opened document.
            existingFieldNames.current = getSignatureFieldNames(dataUrl);
            if (existingFieldNames.current.length > 0) signatureField.current = existingFieldNames.current[0];
            viewer.current.load(dataUrl, null);
            viewer.current.fileName = file.name;
            viewer.current.downloadFileName = file.name;
        };
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Validates all signatures in the document entirely on the client using the
    // Syncfusion JavaScript PDF Library (no backend service) and reflects the
    // result in the message UI + Sign/Download buttons.
    const validateSignature = async (payload) => {
        try {
            const result = await validateSignatures(payload);

            if (result.hasSignature) {
                // Document already has a signature: lock signing for the
                // current form-field choice and enable download.
                hasDigitalSignature.current = true;
                setSignDocVisibility(false);
            }
            setDownloadVisibility(result.hasSignature ? false : true);
            if (result.successVisible) {
                setMsgText((m) => ({ ...m, success: result.message || m.success }));
                setSuccessVisible(true);
                setWarningVisible(false);
                setErrorVisible(false);
                if (signSuccessTimer.current) clearTimeout(signSuccessTimer.current);
                signSuccessTimer.current = setTimeout(() => setSuccessVisible(false), 5000);
            }
            if (result.warningVisible) {
                setMsgText((m) => ({ ...m, warning: result.message || m.warning }));
                setWarningVisible(true);
                setErrorVisible(false);
            }
            if (result.errorVisible) {
                setMsgText((m) => ({ ...m, error: result.message || m.error }));
                setErrorVisible(true);
                setWarningVisible(false);
            }
        } catch (err) {
            console.error('Client-side signature validation failed:', err);
        }
    };

    // documentLoad event from the PdfViewerComponent. Receives the loaded
    // document as base64 via args.documentData (set by the Syncfusion viewer
    // for URL/Blob/Base64 loads), so we can validate it without re-reading.
    const documentLoaded = async (args) => {
        if (fileName.current && args && args.documentName) fileName.current = args.documentName;

        // Discover signature fields in the loaded document client-side so the
        // "Existing Field" tab lists real fields.
        try {
            const blob = await viewer.current.saveAsBlob();
            const pdfBase64 = await blobToBase64(blob);
            documentData.current = pdfBase64;
            existingFieldNames.current = getSignatureFieldNames(pdfBase64);
            if (existingFieldNames.current.length > 0) signatureField.current = existingFieldNames.current[0];
        } catch (e) {
            console.warn('Could not inspect loaded document:', e);
        }

        //if (documentData.current) validateSignature(documentData.current);
    };

    // Extracts all signature field names from a base64 PDF (client-side).
    const getSignatureFieldNames = (pdfBase64) => {
        let doc = null;
        try {
            const bytes = new Uint8Array(base64ToArrayBuffer(pdfBase64));
            doc = new PdfDocument(bytes);
            const names = [];
            for (let i = 0; i < doc.form.count; i++) {
                const f = doc.form.fieldAt(i);
                if (f instanceof PdfSignatureField) names.push(f.name);
            }
            return names;
        } catch (e) {
            console.warn('Failed to read signature fields:', e);
            return [];
        } finally {
            if (doc) doc.destroy();
        }
    };

    // Converts a base64 data URL to an ArrayBuffer.
    const base64ToArrayBuffer = (base64) => {
        const pureBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
        const binary = atob(pureBase64);
        const buffer = new ArrayBuffer(binary.length);
        const view = new Uint8Array(buffer);
        for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
        return buffer;
    };

    return (
        <div className="pdfviewer-component">
            <div className="row">
                <div className="control-section col-12 col-lg-8" style={{height: window.innerWidth < 768 ? '400px' : '100vh'}}>
                    <div className="e-pv-visible-sign-pdfviewer-tab-container">
                        <div className="e-pv-visible-sign-toolbar">
                            <ToolbarComponent ref={toolbarRef} clicked={toolbarClickHandler}>
                                <ItemsDirective>
                                    <ItemDirective prefixIcon="e-icons e-folder-open" tooltipText="Open" id="file_Open" cssClass="e-pv-button-container" />
                                    <ItemDirective prefixIcon="e-icons e-download" tooltipText="Download" id="visibleSign_download" disabled={downloadVisibility} align="Right" cssClass="e-pv-download-document-container" />
                                </ItemsDirective>
                            </ToolbarComponent>
                        </div>
                        <div className="e-pv-visible-sign-message">
                            <MessageComponent id="msg_success" content={msgText.success} visible={successVisible} severity="Success" />
                            <MessageComponent id="msg_warning" content={msgText.warning} visible={warningVisible} showCloseIcon={true} severity="Warning" />
                            <MessageComponent id="msg_error" content={msgText.error} visible={errorVisible} showCloseIcon={true} severity="Error" />
                        </div>
                        <div className="e-pv-visible-sign-pdfviewer-container">
                            <PdfViewerComponent
                                ref={viewer}
                                enableAnnotationToolbar={false}
                                enableFormDesignerToolbar={false}
                                enableNavigationToolbar={false}
                                enableToolbar={false}
                                zoomMode="FitToPage"
                                documentPath="https://cdn.syncfusion.com/content/pdf/visible-digital-signature.pdf"
                                resourceUrl="https://cdn.syncfusion.com/ej2/27.2.2/dist/ej2-pdfviewer-lib"
                                documentLoad={documentLoaded}
                                style={{ height: '100%', width: '100%' }}
                            >
                                <Inject services={[Toolbar, Magnification, Navigation, Annotation, LinkAnnotation, BookmarkView, ThumbnailView, Print, TextSelection, TextSearch, FormFields, FormDesigner]} />
                            </PdfViewerComponent>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-lg-4 e-pv-visible-sign-tab-panel" style={{ height: '100vh'}}>
                    {renderTabHeader()}
                    {createContent(activeTab)}
                    <hr />
                    {renderCertificateGroup()}
                    <hr />
                    {renderSignDocumentButton()}
                </div>
            </div>
            <input ref={fileInputRef} type="file" id="fileUpload" accept=".pdf" onChange={readFile} style={{ display: 'block', visibility: 'hidden', width: 0, height: 0 }} />
        </div>
    );
};

export default VisibleDigitalSignature;
