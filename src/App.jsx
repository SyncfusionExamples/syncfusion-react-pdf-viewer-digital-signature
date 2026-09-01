import { useState } from 'react';
import { TreeViewComponent } from '@syncfusion/ej2-react-navigations';

import VisibleDigitalSignature from './DigitalSignature.jsx';
import DefaultViewer from './DefaultViewer.jsx';

export default function App() {
    const [selectedSample, setSelectedSample] = useState(() => {
    return localStorage.getItem('sample') || 'digitalSignature';
});

const nodeSelected = (args) => {
    const sample = args.nodeData.id;

    setSelectedSample(sample);
    localStorage.setItem('sample', sample);

    window.history.pushState(
        {},
        '',
        `/${sample}`
    );
};

    const treeData = [
        {
            id: 'pdfviewer',
            name: 'PDF Viewer Samples',
            expanded: true,
            child: [
                {
                    id: 'default',
                    name: 'Default Viewer'
                },
                {
                    id: 'digitalSignature',
                    name: 'Digital Signature'
                }
            ]
        }
    ];

return (
    <div className="app-container">
        <div className="sidebar">
            <TreeViewComponent
                fields={{
                    dataSource: treeData,
                    id: 'id',
                    text: 'name',
                    child: 'child'
                }}
                selectedNodes={[selectedSample]}
                nodeSelected={nodeSelected}
            />
        </div>

        <div className="content">
            {selectedSample === 'default' && <DefaultViewer />}
            {selectedSample === 'digitalSignature' && (
                <VisibleDigitalSignature />
            )}
        </div>
    </div>
);
}