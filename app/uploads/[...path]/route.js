import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
// import mime from 'mime-types'; // removed to avoid dependency

export async function GET(request, { params }) {
    // 1. Get the file path from the URL
    const { path: pathSegments } = params;
    const filePathParam = pathSegments.join('/');

    // 2. Construct absolute path
    // Note: we assume files are in /app/public/uploads (Docker) or project/public/uploads (Local)
    // process.cwd() in Docker is /app
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const filePath = path.join(uploadsDir, filePathParam);

    // 3. Security: Prevent directory traversal
    const relative = path.relative(uploadsDir, filePath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
        return new NextResponse('Forbidden', { status: 403 });
    }

    // 4. Check if file exists
    if (!fs.existsSync(filePath)) {
        return new NextResponse('File not found', { status: 404 });
    }

    // 5. Read file
    try {
        const fileBuffer = fs.readFileSync(filePath);

        // 6. Determine content type
        // Simple fallback if mime-types isn't available
        let contentType = 'application/octet-stream';
        const ext = path.extname(filePath).toLowerCase();
        const mimeMap = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.pdf': 'application/pdf',
            '.svg': 'image/svg+xml',
        };
        if (mimeMap[ext]) contentType = mimeMap[ext];

        // 7. Return response
        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (error) {
        console.error('Error serving file:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
