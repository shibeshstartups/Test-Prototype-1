# FolderFlow Backend

## Setup
1. Install dependencies:
   ```sh
   npm install
   ```
2. Configure environment variables in `.env` (see template).
3. Start the server:
   ```sh
   node index.js
   ```

## Features
### Example Usage

1. Configure your `.env` file using `.env.example`.
2. Use the provided `db.js` to query PostgreSQL:

```js
const pool = require('./db');

// Example query
pool.query('SELECT NOW()', (err, res) => {
   if (err) throw err;
   console.log(res.rows);
});
```

Refer to the [pg documentation](https://node-postgres.com/) for advanced usage.

## Cloudflare CDN Integration

To serve files from Backblaze B2 with zero egress fees, set up a Cloudflare Worker or use Cloudflare's custom domain integration for your B2 bucket:

- [Backblaze B2 + Cloudflare setup guide](https://www.backblaze.com/blog/backblaze-b2-cloudflare-integration/)
- Point your custom domain to B2 via Cloudflare DNS and enable CDN features.
- Use public B2 URLs or Cloudflare Worker endpoints in your download API responses for cold storage files.

Example (in download API):
```js
const b2Url = `https://cdn.yourdomain.com/file/${b2Key}`;
res.redirect(b2Url);
```
- AWS S3 & Backblaze B2 storage
- CORS enabled

## Next Steps
- Implement API routes for folder upload, sharing, download, payments, and storage management.
- Connect to frontend via REST API.
