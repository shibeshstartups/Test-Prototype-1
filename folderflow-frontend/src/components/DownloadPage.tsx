import React from "react";

interface DownloadPageProps {
  folderName: string;
  files: string[];
  onDownload: () => void;
}

const DownloadPage: React.FC<DownloadPageProps> = ({ folderName, files, onDownload }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-8">
    <header className="mb-6 text-center">
      <h1 className="text-2xl font-bold text-blue-700 mb-2">Download Folder</h1>
      <p className="text-gray-600">{folderName}</p>
    </header>
    <div className="bg-white rounded-lg shadow p-6 w-full max-w-md mb-6">
      <h2 className="text-lg font-semibold mb-2">Files</h2>
      <ul className="list-disc pl-5 mb-4">
        {files.map((file, idx) => (
          <li key={idx} className="text-gray-700">{file}</li>
        ))}
      </ul>
      <button onClick={onDownload} className="bg-blue-600 text-white px-4 py-2 rounded w-full">Download Folder</button>
    </div>
  </div>
);

export default DownloadPage;
