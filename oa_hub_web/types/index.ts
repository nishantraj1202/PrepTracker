export type Question = {
    _id?: string;
    id: number | string;
    status?: string;
    createdAt?: string;
    slug: string; // SEO
    company: string;
    title: string;
    topic: string;
    difficulty: string; // Changed to string to be flexible
    likes: string;
    views: string;
    duration: string;
    img: string;
    images?: string[];
    date?: string;
    desc: string;
    constraints?: string;
    snippets?: {
        cpp?: string;
        java?: string;
        python?: string;
        javascript?: string;
    };
    // SEO Content
    approach?: string;
    complexity?: {
        time: string;
        space: string;
    };
    examples?: {
        input: string;
        output: string;
        explanation?: string;
    }[];
    testCases?: {
        input: any;
        output: any;
    }[];
    tags?: string[];
};
