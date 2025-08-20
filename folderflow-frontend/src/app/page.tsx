import { Metadata } from "next";
import FolderUpload from "../components/FolderUpload";
import DashboardNav from "../components/DashboardNav";
import ShareLinkModal from "../components/ShareLinkModal";
import DownloadPage from "../components/DownloadPage";
import AuthForm from "../components/AuthForm";
import PlanPayment from "../components/PlanPayment";
import UserProfile from "../components/UserProfile";

export const metadata: Metadata = {
  title: "FolderFlow - Large File Sharing Made Simple",
  description: "Send large folders with preserved structure. No zipping required.",
};
import DashboardNav from "../components/DashboardNav";
import ShareLinkModal from "../components/ShareLinkModal";
import DownloadPage from "../components/DownloadPage";
import AuthForm from "../components/AuthForm";
import PlanPayment from "../components/PlanPayment";
import UserProfile from "../components/UserProfile";

import React, { useState, useEffect } from "react";
import axios from "axios";

export default function Home() {
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [showDownloadPage, setShowDownloadPage] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem("token"));
  const [transfers, setTransfers] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsAuthenticated(false);
  };

  useEffect(() => {
    if (isAuthenticated) {
      const token = localStorage.getItem("token");
      if (!token) return;
      let userId = "";
      try {
        userId = JSON.parse(atob(token.split('.')[1])).id;
      } catch {
        userId = "";
      }
      axios.get("http://localhost:4000/api/transfers", {
        headers: { Authorization: `Bearer ${token}` },
        params: { userId },
      })
        .then(res => setTransfers(res.data))
        .catch(() => setTransfers([]));
      axios.get("http://localhost:4000/api/folder/1/metadata", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => setFolders(res.data))
        .catch(() => setFolders([]));
    }
  }, [isAuthenticated]);

  const handleFolderUpload = async (files: FileList, setProgress: (p: number) => void, setError: (e: string) => void) => {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i], files[i].webkitRelativePath || files[i].name);
    }
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post("http://localhost:4000/api/folder/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
        onUploadProgress: progressEvent => {
          const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setProgress(percent);
        },
      });
      setShareLink(res.data.link || "https://folderflow.in/download/abc123");
      setShowShareModal(true);
      setProgress(0);
    } catch (err: any) {
      setError("Upload failed. Please try again.");
      setProgress(0);
    }
  };

  const handleDownload = () => {
    alert("Download started!");
  };

  if (!isAuthenticated) {
    return <AuthForm onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 flex flex-col items-center">
      <div className="w-full flex justify-end mb-4">
        <button className="bg-red-500 text-white px-4 py-2 rounded" onClick={handleLogout}>
          Logout
        </button>
      </div>
  <DashboardNav />
  <UserProfile />
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-blue-700 mb-2">FolderFlow Dashboard</h1>
        <p className="text-gray-600">Send Large Folders. No Zipping. No Waiting.</p>
      </header>
      <section className="w-full max-w-xl mb-8">
        <FolderUpload onUpload={handleFolderUpload} />
        <button
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
          onClick={() => setShowDownloadPage(true)}
        >
          Go to Download Page
        </button>
      </section>
      <PlanPayment />
      <section className="w-full max-w-xl mb-8">
        <h2 className="text-xl font-semibold mb-4">Recent Transfers</h2>
        <div className="bg-white rounded-lg shadow p-4">
          {transfers.length === 0 ? (
            <p className="text-gray-400">No transfers yet.</p>
          ) : (
            <ul className="list-disc pl-5">
              {transfers.map((t: any) => (
                <li key={t.id} className="text-gray-700">{t.action} - {t.timestamp}</li>
              ))}
            </ul>
          )}
        </div>
      </section>
      <section className="w-full max-w-xl mb-8" aria-labelledby="your-folders-title">
        <h2 id="your-folders-title" className="text-xl font-semibold mb-4">Your Folders</h2>
        <div className="bg-white rounded-lg shadow p-4">
          {folders.length === 0 ? (
            <p className="text-gray-400">No folders found.</p>
          ) : (
            <ul className="pl-0 divide-y divide-gray-200">
              {folders.map((f: any) => (
                <li key={f.id} className="py-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4 text-gray-700">
                  <span className="font-medium" aria-label="Folder name">{f.name}</span>
                  <span className="text-xs text-gray-500" aria-label="Folder size">({f.size} bytes)</span>
                  <div className="mt-2 w-full">
                    {/* Audit log for this folder */}
                    <React.Suspense fallback={<div>Loading access history...</div>}>
                      {typeof window !== 'undefined' && (
                        <>
                          {require('../components/FolderAuditLog').default && (
                            React.createElement(require('../components/FolderAuditLog').default, { folderId: f.id })
                          )}
                        </>
                      )}
                    </React.Suspense>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      {showShareModal && (
        <ShareLinkModal link={shareLink} onClose={() => setShowShareModal(false)} />
      )}
      {showDownloadPage && (
        <DownloadPage
          folderName={folders[0]?.name || "Demo Folder"}
          files={folders[0]?.files ?? ["file1.jpg", "file2.mp4", "file3.pdf"]}
          onDownload={handleDownload}
        />
      )}
    </div>
  );
}
