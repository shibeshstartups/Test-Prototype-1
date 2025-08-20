# FolderFlow

A modern file sharing application that preserves folder structure for large file transfers.

## Project Structure

```
folderflow/
├── folderflow-frontend/     # Next.js frontend application
│   ├── src/
│   │   ├── app/            # Next.js app directory
│   │   ├── components/     # React components
│   │   └── styles/        # Global styles
│   └── public/            # Static assets
├── folderflow-backend/     # Express.js backend application
│   ├── routes/            # API routes
│   ├── middleware/        # Express middleware
│   └── config/           # Configuration files
└── docs/                 # Documentation
```

## Quick Start

1. Clone the repository:
```bash
git clone https://github.com/shibeshstartups/Test-Prototype-1.git
cd Test-Prototype-1
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp folderflow-backend/.env.example folderflow-backend/.env
cp folderflow-frontend/.env.example folderflow-frontend/.env
```

4. Start the development servers:
```bash
npm run dev
```

## For Bolt.new Users

To import this project in bolt.new:

1. Use the main branch URL
2. The entry point is `folderflow-frontend/src/app/page.tsx`
3. UI components are in `folderflow-frontend/src/components`
4. Styles are in `folderflow-frontend/src/app/globals.css`

## Tech Stack

- Frontend:
  - Next.js 15.5
  - React 19.1
  - TailwindCSS
  - TypeScript

- Backend:
  - Express.js
  - PostgreSQL
  - Backblaze B2 Storage
  - Redis

## License

MIT
