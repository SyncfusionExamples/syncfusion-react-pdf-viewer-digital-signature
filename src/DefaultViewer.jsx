import * as React from 'react';
import { useRef, useState } from 'react';

import {
    PdfViewerComponent,
    Toolbar,
    Magnification,
    Navigation,
    LinkAnnotation,
    BookmarkView,
    ThumbnailView,
    Print,
    TextSelection,
    TextSearch,
    Annotation,
    FormFields,
    FormDesigner,
    PageOrganizer,
    Inject
} from '@syncfusion/ej2-react-pdfviewer';

import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { PdfDocument } from '@syncfusion/ej2-pdf';

import './pdf.component.css';

function Default() {
    const viewerRef = useRef(null);
    const isReplicatingRef = useRef(false);
    const [message, setMessage] = useState('');

    const onFormFieldAdd = (args) => {
        if (isReplicatingRef.current || !viewerRef.current) return;

        console.log('FormFieldAdd:', args);

        const field = args.field || args.formField;
        const fieldType = field?.formFieldAnnotationType || field?.type;

        if (!field || !['SignatureField', 'Signature'].includes(fieldType)) return;

        isReplicatingRef.current = true;

        try {
            const viewer = viewerRef.current;
            const pageNumber = args.pageNumber ?? field.pageNumber ?? 1;
            const fieldName = field.name || field.fieldName || `SignatureField_${Date.now()}`;
            const bounds = field.bounds || {};

            for (let page = 1; page <= viewer.pageCount; page++) {
                if (page === pageNumber) continue;

                const exists = viewer.formFieldCollections?.some(
                    f =>
                        (f.name === fieldName || f.fieldName === fieldName) &&
                        f.pageNumber === page
                );

                if (exists) continue;

                viewer.formDesignerModule.addFormField('SignatureField', {
                    name: fieldName,
                    pageNumber: page,
                    bounds: {
                        X: bounds.x ?? bounds.X ?? 100,
                        Y: bounds.y ?? bounds.Y ?? 100,
                        Width: bounds.width ?? bounds.Width ?? 150,
                        Height: bounds.height ?? bounds.Height ?? 50
                    }
                });
            }

            setMessage(`Signature field '${fieldName}' added to all pages.`);
        } catch (e) {
            console.error(e);
            setMessage('Failed to replicate signature field.');
        } finally {
            isReplicatingRef.current = false;
        }
    };

    const flattenPdf = async () => {
        try {
            if (!viewerRef.current) return;

            setMessage('');

            const viewer = viewerRef.current;
            const annotationCount = (viewer.annotation && viewer.annotation.actionCollection && viewer.annotation.actionCollection.length) || 0;
            const formFieldCount = viewer.formFieldCollections.length || 0;

            if (!annotationCount && !formFieldCount) {
                setMessage('No form fields or annotations are present for flattening.');
                return;
            }

            const blob = await viewer.saveAsBlob();
            const reader = new FileReader();

            reader.onloadend = async () => {
                try {
                    const document = new PdfDocument(new Uint8Array(reader.result));

                    document.flatten = true;

                    const flattenedBlob = new Blob(
                        [await document.save()],
                        { type: 'application/pdf' }
                    );

                    document.destroy();

                    const loadReader = new FileReader();

                    loadReader.onloadend = () => {
                        viewer.load(loadReader.result, null);
                        setMessage('Document flattened successfully.');
                    };

                    loadReader.readAsDataURL(flattenedBlob);
                } catch (e) {
                    console.error(e);
                    setMessage('Failed to flatten document.');
                }
            };

            reader.readAsArrayBuffer(blob);
        } catch (e) {
            console.error(e);
            setMessage('Failed to flatten document.');
        }
    };

    return (
        <div className="pdfviewer-component">
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12
                }}
            >
                <ButtonComponent
                    cssClass="e-primary"
                    onClick={flattenPdf}
                >
                    Flatten Document
                </ButtonComponent>

                {message && (
                    <span style={{ color: '#1e40af', fontWeight: 500 }}>
                        {message}
                    </span>
                )}
            </div>

            <div className="control-section">
                <PdfViewerComponent
                    ref={viewerRef}
                    id="container"
                    documentPath="https://cdn.syncfusion.com/content/pdf/pdf-succinctly.pdf"
                    resourceUrl="https://cdn.syncfusion.com/ej2/23.2.6/dist/ej2-pdfviewer-lib"
                    formFieldAdd={onFormFieldAdd}
                     style={{
        height: window.innerWidth < 768 ? '60vh' : '100%',
        width: '100%'
    }}

                    isThumbnailViewOpen={true}
                >
                    <Inject
                        services={[
                            Toolbar,
                            Magnification,
                            Navigation,
                            LinkAnnotation,
                            BookmarkView,
                            ThumbnailView,
                            Print,
                            TextSelection,
                            TextSearch,
                            Annotation,
                            FormFields,
                            FormDesigner,
                            PageOrganizer
                        ]}
                    />
                </PdfViewerComponent>
            </div>
        </div>
    );
}

export default Default;
