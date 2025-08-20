import React, { useRef, useState } from 'react';

interface FolderUploadProps {
  onUpload: (files: FileList, setProgress: (p: number) => void, setError: (e: string) => void) => void;
}

const FolderUpload: React.FC<FolderUploadProps> = ({ onUpload }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.items) {
      const items = Array.from(e.dataTransfer.items);
      const files = items
        .filter(item => item.kind === 'file')
        .map(item => item.getAsFile())
        .filter(Boolean) as File[];
      onUpload({ length: files.length, item: (i: number) => files[i] } as FileList, setProgress, setError);
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={e => e.preventDefault()}
      className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer bg-gray-50 hover:bg-gray-100"
      onClick={handleClick}
    >
      <input
        type="file"
        multiple
        ref={inputRef}
        style={{ display: 'none' }}
        onChange={e => e.target.files && onUpload(e.target.files, setProgress, setError)}
        // @ts-ignore
        webkitdirectory="true"
        // @ts-ignore
        directory="true"
      />
      <span className="text-lg font-semibold">Drag & Drop your folder here or click to select</span>
      {progress > 0 && (
        <div className="mt-4 w-full bg-gray-200 rounded">
          <div className="bg-blue-600 h-3 rounded" style={{ width: `${progress}%` }}></div>
        </div>
      )}
      {error && <div className="text-red-500 mt-2">{error}</div>}
    </div>
  );
};

export default FolderUpload;
