import React, { useState } from "react";

import axios from "axios";

interface ShareLinkModalProps {
  folderId?: string;
  link?: string;
  onClose: () => void;
}

const ShareLinkModal: React.FC<ShareLinkModalProps> = ({ folderId, link: initialLink = "", onClose }) => {
  const [password, setPassword] = useState("");
  const [expiry, setExpiry] = useState(24);
  const [link, setLink] = useState(initialLink);
  const [error, setError] = useState("");

  const handleCreateLink = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`http://localhost:4000/api/folder/${folderId}/share-link`, {
        password,
        expiryHours: expiry,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLink(res.data.link);
    } catch (err: any) {
      setError("Failed to create link.");
    }
  };

  const handleCopy = () => {
    if (link) {
      navigator.clipboard.writeText(link);
      alert("Link copied!");
    }
  };

  const handleWhatsAppShare = () => {
    if (link) {
      const url = `https://wa.me/?text=${encodeURIComponent(link)}`;
      window.open(url, "_blank");
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-link-title"
      tabIndex={-1}
    >
      <div
        className="bg-white rounded-lg p-4 shadow-lg w-full max-w-md mx-2 sm:p-6"
        style={{ outline: 'none' }}
      >
        <h3 id="share-link-title" className="text-lg font-bold mb-2">Share Folder Link</h3>
        <form
          onSubmit={e => { e.preventDefault(); handleCreateLink(); }}
          className="flex flex-col gap-3"
        >
          <div className="flex flex-col sm:flex-row gap-2 mb-2">
            <label htmlFor="password" className="sr-only">Password (optional)</label>
            <input
              id="password"
              type="password"
              placeholder="Password (optional)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="flex-1 p-2 border rounded focus:ring-2 focus:ring-blue-500"
              autoComplete="new-password"
              aria-label="Password (optional)"
            />
            <label htmlFor="expiry" className="sr-only">Expiry (hours)</label>
            <input
              id="expiry"
              type="number"
              min={1}
              max={168}
              value={expiry}
              onChange={e => setExpiry(Number(e.target.value))}
              className="w-full sm:w-20 p-2 border rounded focus:ring-2 focus:ring-blue-500"
              title="Expiry (hours)"
              aria-label="Expiry (hours)"
            />
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white px-3 py-2 rounded mb-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Generate Link"
          >
            Generate Link
          </button>
        </form>
        {link && (
          <div className="flex flex-col gap-2 mb-2">
            <label htmlFor="share-link" className="sr-only">Shareable Link</label>
            <input
              id="share-link"
              type="text"
              value={link}
              readOnly
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              aria-label="Shareable Link"
            />
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleCopy}
            className="bg-blue-600 text-white px-3 py-2 rounded w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Copy Link"
          >Copy Link</button>
          <button
            onClick={handleWhatsAppShare}
            className="bg-green-500 text-white px-3 py-2 rounded w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-green-500"
            aria-label="Share on WhatsApp"
          >WhatsApp</button>
          <button
            onClick={onClose}
            className="bg-gray-300 px-3 py-2 rounded w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-gray-500"
            aria-label="Close Modal"
          >Close</button>
        </div>
        {error && <div className="text-red-500 mt-2" role="alert">{error}</div>}
      </div>
    </div>
  );
};

export default ShareLinkModal;
