import React, { useState } from "react";
import axios from "axios";

const LinkAccess: React.FC = () => {
  const [linkId, setLinkId] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [folderId, setFolderId] = useState<string | null>(null);

  const handleAccess = async () => {
    setStatus("");
    try {
      const res = await axios.post("http://localhost:4000/api/share-link/validate", { linkId, password });
      setFolderId(res.data.folderId);
      setStatus("Access granted!");
    } catch (err: any) {
      setStatus(err.response?.data?.error || "Access denied.");
      setFolderId(null);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded shadow mb-8">
      <h2 className="text-xl font-bold mb-4">Access Shared Folder</h2>
      <input
        type="text"
        placeholder="Enter link ID"
        value={linkId}
        onChange={e => setLinkId(e.target.value)}
        className="border p-2 rounded w-full mb-2"
      />
      <input
        type="password"
        placeholder="Password (if required)"
        value={password}
        onChange={e => setPassword(e.target.value)}
        className="border p-2 rounded w-full mb-2"
      />
      <button onClick={handleAccess} className="bg-blue-600 text-white px-4 py-2 rounded mb-2">Access</button>
      {status && <div className={folderId ? "text-green-600" : "text-red-500"}>{status}</div>}
      {folderId && <div className="mt-4">Folder ID: {folderId}</div>}
    </div>
  );
};

export default LinkAccess;
