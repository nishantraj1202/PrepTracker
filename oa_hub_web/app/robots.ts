import { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://preptracker.example.com';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/admin', '/api/', '/login', '/dashboard', '/signup'],
        },
        sitemap: `${BASE_URL}/sitemap.xml`,
    };
}
