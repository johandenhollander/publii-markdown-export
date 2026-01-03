/**
 * Publii Markdown Export Plugin
 *
 * Generates markdown versions of posts and pages for LLM/AI consumption.
 * When you visit website.com/post-slug.md, you get a clean markdown version.
 *
 * @license GPL-3.0
 */

const fs = require('fs');
const path = require('path');

class MarkdownExport {
    constructor(API, name, config) {
        this.API = API;
        this.name = name;
        this.config = config;
    }

    addEvents() {
        this.API.addEvent('afterRender', this.generateMarkdownFiles, 1, this);
    }

    /**
     * Main entry point - generates markdown files after site render
     */
    generateMarkdownFiles(rendererInstance) {
        const outputDir = rendererInstance.outputDir;
        const siteConfig = rendererInstance.siteConfig;
        const posts = rendererInstance.cachedItems.posts || {};
        const pages = rendererInstance.cachedItems.pages || {};

        let generatedCount = 0;

        // Build set of internal slugs for link conversion
        this.internalSlugs = new Set();
        for (const post of Object.values(posts)) {
            if (!post.status?.includes('trashed')) {
                this.internalSlugs.add(post.slug);
            }
        }
        for (const page of Object.values(pages)) {
            if (!page.status?.includes('trashed')) {
                this.internalSlugs.add(page.slug);
            }
        }

        // Generate markdown for posts
        if (this.config.exportPosts) {
            for (const [id, post] of Object.entries(posts)) {
                if (post.status?.includes('trashed')) continue;

                const markdown = this.convertToMarkdown(post, 'post', siteConfig);
                const mdPath = this.getOutputPath(outputDir, post.slug, siteConfig, 'post');

                this.writeMarkdownFile(mdPath, markdown);
                generatedCount++;
            }
        }

        // Generate markdown for pages
        if (this.config.exportPages) {
            for (const [id, page] of Object.entries(pages)) {
                if (page.status?.includes('trashed')) continue;

                const markdown = this.convertToMarkdown(page, 'page', siteConfig);
                const mdPath = this.getOutputPath(outputDir, page.slug, siteConfig, 'page');

                this.writeMarkdownFile(mdPath, markdown);
                generatedCount++;
            }
        }

        // Generate index of all markdown files
        if (this.config.generateIndex) {
            this.generateMarkdownIndex(outputDir, posts, pages, siteConfig);
            generatedCount++;
        }

        // Generate llms.txt for AI crawlers
        if (this.config.generateLlmsTxt !== false) {
            this.generateLlmsTxt(outputDir, posts, pages, siteConfig);
            generatedCount++;
        }

        // Generate markdown sitemap
        if (this.config.generateSitemap !== false) {
            this.generateMarkdownSitemap(outputDir, posts, pages, siteConfig);
            generatedCount++;
        }

        console.log(`[Markdown Export] Generated ${generatedCount} markdown files`);
    }

    /**
     * Determine output path for markdown file
     */
    getOutputPath(outputDir, slug, siteConfig, type) {
        const postsPrefix = siteConfig.advanced?.urls?.postsPrefix || '';

        if (type === 'post' && postsPrefix) {
            return path.join(outputDir, postsPrefix, `${slug}.md`);
        }

        return path.join(outputDir, `${slug}.md`);
    }

    /**
     * Convert post/page to markdown with frontmatter
     */
    convertToMarkdown(item, type, siteConfig) {
        const lines = [];

        // YAML frontmatter
        lines.push('---');
        lines.push(`title: "${this.escapeYaml(item.title)}"`);
        lines.push(`type: ${type}`);
        lines.push(`slug: ${item.slug}`);

        if (item.createdAt) {
            lines.push(`date: ${this.formatDate(item.createdAt)}`);
        }
        if (item.modifiedAt) {
            lines.push(`modified: ${this.formatDate(item.modifiedAt)}`);
        }
        if (item.author) {
            // Author can be object with name property or string
            const authorName = typeof item.author === 'object'
                ? (item.author.name || item.author.username || '')
                : item.author;
            if (authorName) {
                lines.push(`author: "${this.escapeYaml(authorName)}"`);
            }
        }
        if (item.tags && item.tags.length > 0) {
            const tagNames = item.tags.map(t => {
                const name = t.name || t;
                // Quote tag names that contain special characters
                if (/[,\[\]{}#&*!|>'"%@`]/.test(name)) {
                    return `"${this.escapeYaml(name)}"`;
                }
                return name;
            });
            lines.push(`tags: [${tagNames.join(', ')}]`);
        }
        if (item.excerpt) {
            const cleanExcerpt = this.decodeHtmlEntities(this.stripHtml(item.excerpt));
            lines.push(`excerpt: "${this.escapeYaml(cleanExcerpt)}"`);
        }

        // Add canonical URL
        const domain = siteConfig.domain || '';
        lines.push(`url: ${domain}/${item.slug}/`);

        lines.push('---');
        lines.push('');

        // Title as H1
        lines.push(`# ${item.title}`);
        lines.push('');

        // Content
        const content = this.htmlToMarkdown(item.text || '', siteConfig);
        lines.push(content);

        return lines.join('\n');
    }

    /**
     * Convert HTML to Markdown
     * Handles common HTML elements without external dependencies
     */
    htmlToMarkdown(html, siteConfig) {
        if (!html) return '';

        let md = html;
        const domain = siteConfig?.domain || '';

        // Remove scripts and styles
        md = md.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        md = md.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

        // Convert headings
        md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n');
        md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n');
        md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n');
        md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n#### $1\n');
        md = md.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, '\n##### $1\n');
        md = md.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, '\n###### $1\n');

        // Convert paragraphs
        md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n$1\n');

        // Convert line breaks
        md = md.replace(/<br\s*\/?>/gi, '\n');

        // Convert bold and italic
        md = md.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**');
        md = md.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**');
        md = md.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*');
        md = md.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*');

        // Convert links - convert internal links to .md versions
        md = md.replace(/<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, (match, href, text) => {
            let url = href;
            // Convert internal links to markdown versions
            if (this.internalSlugs && !href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('mailto:') && !href.startsWith('#')) {
                // Extract slug from URL like /slug/ or /prefix/slug/
                const slugMatch = href.match(/\/([^\/]+)\/?$/);
                if (slugMatch && this.internalSlugs.has(slugMatch[1])) {
                    url = href.replace(/\/?$/, '.md').replace(/\/\.md$/, '.md');
                }
            } else if (this.internalSlugs && (href.startsWith(domain) || href.startsWith(domain + '/'))) {
                // Absolute internal URLs
                const slugMatch = href.match(/\/([^\/]+)\/?$/);
                if (slugMatch && this.internalSlugs.has(slugMatch[1])) {
                    url = href.replace(/\/?$/, '.md').replace(/\/\.md$/, '.md');
                }
            }
            return `[${text}](${url})`;
        });

        // Convert images - make URLs absolute
        const makeAbsolute = (url) => {
            if (!url) return url;
            if (url.startsWith('http://') || url.startsWith('https://')) return url;
            if (url.startsWith('/')) return domain + url;
            return domain + '/' + url;
        };

        md = md.replace(/<img[^>]*src=["']([^"']*)["'][^>]*alt=["']([^"']*)["'][^>]*\/?>/gi, (m, src, alt) => `![${alt}](${makeAbsolute(src)})`);
        md = md.replace(/<img[^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']*)["'][^>]*\/?>/gi, (m, alt, src) => `![${alt}](${makeAbsolute(src)})`);
        md = md.replace(/<img[^>]*src=["']([^"']*)["'][^>]*\/?>/gi, (m, src) => `![](${makeAbsolute(src)})`);

        // Convert unordered lists
        md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (match, content) => {
            return '\n' + content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n') + '\n';
        });

        // Convert ordered lists
        md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match, content) => {
            let index = 1;
            return '\n' + content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (liMatch, liContent) => {
                return `${index++}. ${liContent}\n`;
            }) + '\n';
        });

        // Convert blockquotes
        md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (match, content) => {
            const lines = content.trim().split('\n');
            return '\n' + lines.map(line => `> ${line.trim()}`).join('\n') + '\n';
        });

        // Convert code blocks
        md = md.replace(/<pre[^>]*><code[^>]*class=["']language-([^"']*)["'][^>]*>([\s\S]*?)<\/code><\/pre>/gi, '\n```$1\n$2\n```\n');
        md = md.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '\n```\n$1\n```\n');
        md = md.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, '\n```\n$1\n```\n');

        // Convert inline code
        md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');

        // Convert horizontal rules
        md = md.replace(/<hr[^>]*\/?>/gi, '\n---\n');

        // Remove remaining HTML tags
        md = md.replace(/<[^>]+>/g, '');

        // Decode HTML entities
        md = this.decodeHtmlEntities(md);

        // Clean up whitespace
        md = md.replace(/\n{3,}/g, '\n\n');
        md = md.trim();

        return md;
    }

    /**
     * Decode common HTML entities
     */
    decodeHtmlEntities(text) {
        const entities = {
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>',
            '&quot;': '"',
            '&#39;': "'",
            '&apos;': "'",
            '&nbsp;': ' ',
            '&mdash;': '—',
            '&ndash;': '–',
            '&hellip;': '...',
            '&copy;': '©',
            '&reg;': '®',
            '&trade;': '™',
            '&euro;': '€',
            '&pound;': '£',
            '&yen;': '¥',
        };

        let result = text;
        for (const [entity, char] of Object.entries(entities)) {
            result = result.replace(new RegExp(entity, 'g'), char);
        }

        // Numeric entities
        result = result.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
        result = result.replace(/&#x([0-9a-f]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)));

        return result;
    }

    /**
     * Strip HTML tags from text
     */
    stripHtml(html) {
        if (!html) return '';
        if (typeof html !== 'string') return '';
        return html.replace(/<[^>]+>/g, '').trim();
    }

    /**
     * Escape special characters for YAML
     */
    escapeYaml(text) {
        if (!text) return '';
        if (typeof text !== 'string') {
            text = String(text);
        }
        return text.replace(/"/g, '\\"').replace(/\n/g, ' ');
    }

    /**
     * Format date to ISO format
     */
    formatDate(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toISOString().split('T')[0];
    }

    /**
     * Write markdown file to disk with proper UTF-8 encoding
     */
    writeMarkdownFile(filePath, content) {
        try {
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            // Add UTF-8 BOM for universal encoding detection
            const BOM = '\uFEFF';
            fs.writeFileSync(filePath, BOM + content, { encoding: 'utf8' });
        } catch (error) {
            console.error(`[Markdown Export] Error writing ${filePath}:`, error.message);
        }
    }

    /**
     * Generate index file listing all markdown files
     */
    generateMarkdownIndex(outputDir, posts, pages, siteConfig) {
        const lines = [];
        const domain = siteConfig.domain || '';
        const siteName = siteConfig.name || 'Site';

        lines.push('---');
        lines.push(`title: "${siteName} - Markdown Index"`);
        lines.push('type: index');
        lines.push(`generated: ${new Date().toISOString()}`);
        lines.push('---');
        lines.push('');
        lines.push(`# ${siteName} - Content Index`);
        lines.push('');
        lines.push('This file lists all available markdown versions of content on this site.');
        lines.push('These files are optimized for LLM/AI consumption.');
        lines.push('');

        // List posts
        if (this.config.exportPosts && Object.keys(posts).length > 0) {
            lines.push('## Posts');
            lines.push('');

            const sortedPosts = Object.values(posts)
                .filter(p => !p.status?.includes('trashed'))
                .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

            for (const post of sortedPosts) {
                const mdUrl = `${domain}/${post.slug}.md`;
                lines.push(`- [${post.title}](${mdUrl})`);
            }
            lines.push('');
        }

        // List pages
        if (this.config.exportPages && Object.keys(pages).length > 0) {
            lines.push('## Pages');
            lines.push('');

            const sortedPages = Object.values(pages)
                .filter(p => !p.status?.includes('trashed'))
                .sort((a, b) => a.title.localeCompare(b.title));

            for (const page of sortedPages) {
                const mdUrl = `${domain}/${page.slug}.md`;
                lines.push(`- [${page.title}](${mdUrl})`);
            }
            lines.push('');
        }

        const indexPath = path.join(outputDir, 'content.md');
        this.writeMarkdownFile(indexPath, lines.join('\n'));
    }

    /**
     * Generate llms.txt file for AI crawlers
     * See: https://llmstxt.org/
     */
    generateLlmsTxt(outputDir, posts, pages, siteConfig) {
        const lines = [];
        const domain = siteConfig.domain || '';
        const siteName = siteConfig.name || 'Website';
        const siteDescription = siteConfig.description || '';

        // Header
        lines.push(`# ${siteName}`);
        lines.push('');
        if (siteDescription) {
            lines.push(`> ${siteDescription}`);
            lines.push('');
        }

        // About this file
        lines.push('This site provides markdown versions of all content for LLM/AI consumption.');
        lines.push('');

        // Quick links
        lines.push('## Quick Links');
        lines.push('');
        lines.push(`- [Content Index](${domain}/content.md) - List of all markdown files`);
        lines.push(`- [Markdown Sitemap](${domain}/sitemap-markdown.xml) - XML sitemap for markdown content`);
        lines.push('');

        // How to access
        lines.push('## Accessing Markdown Content');
        lines.push('');
        lines.push('All posts and pages are available in markdown format by appending `.md` to the slug:');
        lines.push('');
        lines.push('```');
        lines.push(`${domain}/example-post/     → HTML version`);
        lines.push(`${domain}/example-post.md   → Markdown version`);
        lines.push('```');
        lines.push('');

        // Content summary
        const postCount = Object.values(posts).filter(p => !p.status?.includes('trashed')).length;
        const pageCount = Object.values(pages).filter(p => !p.status?.includes('trashed')).length;

        lines.push('## Content Summary');
        lines.push('');
        lines.push(`- **Posts**: ${postCount}`);
        lines.push(`- **Pages**: ${pageCount}`);
        lines.push(`- **Total markdown files**: ${postCount + pageCount}`);
        lines.push('');

        // Format info
        lines.push('## Markdown Format');
        lines.push('');
        lines.push('Each markdown file includes:');
        lines.push('- YAML frontmatter with metadata (title, date, author, tags, url)');
        lines.push('- Clean markdown content');
        lines.push('- Absolute URLs for images');
        lines.push('- UTF-8 encoding with BOM');
        lines.push('');

        // Recent content
        lines.push('## Recent Posts');
        lines.push('');

        const recentPosts = Object.values(posts)
            .filter(p => !p.status?.includes('trashed'))
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
            .slice(0, 10);

        for (const post of recentPosts) {
            const date = this.formatDate(post.createdAt);
            lines.push(`- [${post.title}](${domain}/${post.slug}.md) (${date})`);
        }
        lines.push('');

        // Pages
        if (pageCount > 0) {
            lines.push('## Pages');
            lines.push('');

            const sortedPages = Object.values(pages)
                .filter(p => !p.status?.includes('trashed'))
                .sort((a, b) => a.title.localeCompare(b.title));

            for (const page of sortedPages) {
                lines.push(`- [${page.title}](${domain}/${page.slug}.md)`);
            }
            lines.push('');
        }

        const llmsPath = path.join(outputDir, 'llms.txt');
        // Write without BOM for llms.txt (plain text convention)
        try {
            fs.writeFileSync(llmsPath, lines.join('\n'), { encoding: 'utf8' });
        } catch (error) {
            console.error(`[Markdown Export] Error writing llms.txt:`, error.message);
        }
    }

    /**
     * Generate XML sitemap for markdown files
     */
    generateMarkdownSitemap(outputDir, posts, pages, siteConfig) {
        const domain = siteConfig.domain || '';
        const lines = [];

        lines.push('<?xml version="1.0" encoding="UTF-8"?>');
        lines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');

        // Add content.md
        lines.push('  <url>');
        lines.push(`    <loc>${domain}/content.md</loc>`);
        lines.push(`    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>`);
        lines.push('    <changefreq>daily</changefreq>');
        lines.push('    <priority>1.0</priority>');
        lines.push('  </url>');

        // Add posts
        const sortedPosts = Object.values(posts)
            .filter(p => !p.status?.includes('trashed'))
            .sort((a, b) => (b.modifiedAt || b.createdAt || 0) - (a.modifiedAt || a.createdAt || 0));

        for (const post of sortedPosts) {
            const lastmod = this.formatDate(post.modifiedAt || post.createdAt);
            lines.push('  <url>');
            lines.push(`    <loc>${domain}/${post.slug}.md</loc>`);
            if (lastmod) {
                lines.push(`    <lastmod>${lastmod}</lastmod>`);
            }
            lines.push('    <changefreq>monthly</changefreq>');
            lines.push('    <priority>0.8</priority>');
            lines.push('  </url>');
        }

        // Add pages
        const sortedPages = Object.values(pages)
            .filter(p => !p.status?.includes('trashed'))
            .sort((a, b) => a.title.localeCompare(b.title));

        for (const page of sortedPages) {
            const lastmod = this.formatDate(page.modifiedAt || page.createdAt);
            lines.push('  <url>');
            lines.push(`    <loc>${domain}/${page.slug}.md</loc>`);
            if (lastmod) {
                lines.push(`    <lastmod>${lastmod}</lastmod>`);
            }
            lines.push('    <changefreq>monthly</changefreq>');
            lines.push('    <priority>0.7</priority>');
            lines.push('  </url>');
        }

        lines.push('</urlset>');

        const sitemapPath = path.join(outputDir, 'sitemap-markdown.xml');
        try {
            fs.writeFileSync(sitemapPath, lines.join('\n'), { encoding: 'utf8' });
        } catch (error) {
            console.error(`[Markdown Export] Error writing sitemap-markdown.xml:`, error.message);
        }
    }
}

module.exports = MarkdownExport;
