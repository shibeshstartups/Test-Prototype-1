import React, { useEffect, useState } from 'react';

interface AuditLogEntry {
  action: string;
  timestamp: string;
}

export default function FolderAuditLog({ folderId }: { folderId: string }) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/folder/${folderId}/audit-log`)
      .then(res => res.json())
      .then(data => {
        setLogs(data.logs || []);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load audit logs');
        setLoading(false);
      });
  }, [folderId]);

  if (loading) return <div aria-busy="true" className="text-gray-500">Loading access history...</div>;
  if (error) return <div role="alert" className="text-red-500">{error}</div>;

  return (
    <section aria-labelledby="access-history-title" className="mt-2 mb-2">
      <h3 id="access-history-title" className="text-base font-semibold mb-1">Access History</h3>
      {logs.length === 0 ? (
        <div className="text-gray-400">No access history found.</div>
      ) : (
        <ul className="divide-y divide-gray-200 text-sm" style={{ maxHeight: 180, overflowY: 'auto' }}>
          {logs.map((log, idx) => (
            <li key={idx} className="py-1 flex flex-col sm:flex-row sm:items-center sm:gap-2">
              <time dateTime={log.timestamp} className="text-gray-500 mr-2" aria-label="Access time">
                {new Date(log.timestamp).toLocaleString()}
              </time>
              <span className="text-gray-700" aria-label="Access action">{log.action.replace('sharelink_access:', '')}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
