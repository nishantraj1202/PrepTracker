import { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://preptracker.example.com';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    // 1. Static Routes
    const routes = ['', '/admin'].map((route) => ({
        url: `${BASE_URL}${route}`,
        lastModified: new Date().toISOString(),
    }));

    try {
        // 2. Fetch Companies
        const companiesRes = await fetch(`${API_URL}/companies`, { cache: 'no-store' });
        const companies = await companiesRes.json();

        const companyRoutes = companies.map((comp: any) => ({
            url: `${BASE_URL}/company/${comp.slug}`,
            lastModified: new Date().toISOString(), // In real app, use comp.updatedAt
            changeFrequency: 'weekly',
            priority: 0.8,
        }));

        const questionsRes = await fetch(`${API_URL}/questions`, { cache: 'no-store' });
        const questions = await questionsRes.json();

        // 3. Question Pages
        const questionRoutes = questions.map((q: any) => ({
            url: `${BASE_URL}/question/${q.slug || q.id}`,
            lastModified: new Date(q.date).toISOString(),
            changeFrequency: 'monthly',
            priority: 0.8,
        }));

        // 4. Topic Hubs
        const topics = ['Arrays', 'Strings', 'LinkedList', 'Trees', 'Graphs', 'DP', 'System Design', 'Heaps', 'Backtracking'];
        const topicRoutes = topics.map(t => ({
            url: `${BASE_URL}/topic/${t.toLowerCase().replace(/\s+/g, '-')}`,
            lastModified: new Date().toISOString(),
            changeFrequency: 'weekly',
            priority: 0.7
        }));

        // 5. Difficulty Hubs
        const difficulties = ['Easy', 'Medium', 'Hard'];
        const difficultyRoutes = difficulties.map(d => ({
            url: `${BASE_URL}/difficulty/${d.toLowerCase()}`,
            lastModified: new Date().toISOString(),
            changeFrequency: 'weekly',
            priority: 0.7
        }));

        // 6. Programmatic SEO: Company x Question Pages
        // Generate /company/google/two-sum
        const companyQuestionRoutes = questions.map((q: any) => ({
            url: `${BASE_URL}/company/${q.company.toLowerCase().replace(/\s+/g, '-')}/${q.slug || q.id}`,
            lastModified: new Date(q.date).toISOString(),
            changeFrequency: 'monthly',
            priority: 0.6
        }));

        return [...routes, ...companyRoutes, ...questionRoutes, ...topicRoutes, ...difficultyRoutes, ...companyQuestionRoutes];
    } catch (error) {
        console.error("Sitemap generation error:", error);
        return routes;
    }
}
