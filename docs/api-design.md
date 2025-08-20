# FolderFlow API Design

## Auth & User
- POST /api/auth/register
- POST /api/auth/login
- GET /api/user/profile
- POST /api/user/upgrade-plan

## Folder Upload & Download
- POST /api/folder/upload
- GET /api/folder/:id/download
- GET /api/folder/:id/metadata
- POST /api/folder/:id/share-link

## Transfer History
- GET /api/transfers

## Payments
- POST /api/payments/razorpay/initiate
- POST /api/payments/razorpay/verify

## Storage Management
- POST /api/storage/move-to-cold
- GET /api/storage/status

## P2P Transfers
- POST /api/p2p/initiate
- GET /api/p2p/status

---
*All endpoints require authentication except registration/login. Use JWT for session management.*
