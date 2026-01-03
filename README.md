# Markdown Export Plugin for Publii

Generate markdown versions of your Publii content for LLM/AI consumption.

## Why Markdown for AI?

Large Language Models (LLMs) like Claude, ChatGPT, and Gemini process text using tokens. When feeding content to these models, the format matters significantly:

### Token Efficiency

HTML is verbose. A simple paragraph requires opening and closing tags, attributes, and often nested elements:

```html
<article class="post">
  <p class="intro">Hello <strong>world</strong>!</p>
</article>
```

The same content in markdown:

```markdown
Hello **world**!
```

**Result**: Markdown uses 60-80% fewer tokens than HTML for equivalent content. This means:
- Lower API costs when using LLMs
- More content fits in context windows
- Faster processing and responses

### Cleaner Parsing

LLMs are trained on vast amounts of markdown (GitHub, documentation, technical writing). They understand markdown structure natively:

- Headers (`#`, `##`) clearly indicate document hierarchy
- Lists are unambiguous
- Links and images follow consistent patterns
- No need to filter out CSS classes, JavaScript, or HTML attributes

### Better for RAG Systems

Retrieval-Augmented Generation (RAG) systems work best with clean, structured text:

1. **Chunking** - Markdown's clear section boundaries (headers, paragraphs) make intelligent text splitting easier
2. **Embedding quality** - Clean text produces better vector embeddings
3. **Context relevance** - No HTML noise means retrieved chunks are more relevant

### AI Search Optimization

AI-powered search engines (Perplexity, SearchGPT, Bing Chat) increasingly prefer structured, clean content. Providing markdown versions ensures your content is optimally indexed and understood.

## What it does

This plugin creates `.md` (markdown) files alongside your regular HTML output when you render your site. These markdown files are optimized for:

- **AI Assistants** - Claude, ChatGPT, and other LLMs can parse markdown more efficiently than HTML
- **AI Search Engines** - Better content understanding for AI-powered search
- **RAG Applications** - Clean content for Retrieval-Augmented Generation systems
- **Lower Token Usage** - Markdown uses fewer tokens than HTML for the same content

## Features

- **Markdown Export** - Converts all posts and pages to clean markdown with YAML frontmatter
- **llms.txt** - Generates an [llms.txt](https://llmstxt.org/) file for AI crawler discovery
- **Markdown Sitemap** - Creates `sitemap-markdown.xml` for search engines and AI crawlers
- **Internal Link Conversion** - Automatically converts internal links to point to `.md` versions
- **Absolute Image URLs** - All image URLs are converted to absolute paths
- **UTF-8 BOM** - Ensures proper character encoding across all servers

## Installation

### Option 1: From ZIP (Recommended)

1. Download the latest release ZIP from [Releases](../../releases)
2. In Publii, go to **Tools & Plugins**
3. Click **Install plugin** and select the ZIP file
4. Activate the plugin for your site

### Option 2: Manual Installation

1. Download or clone this repository
2. Copy the `markdownExport` folder to your Publii plugins directory:
   - **Linux**: `~/Documents/Publii/plugins/`
   - **macOS**: `~/Documents/Publii/plugins/`
   - **Windows**: `Documents\Publii\plugins\`
3. Restart Publii
4. Go to **Tools & Plugins** and activate "Markdown Export"

## Usage

Once activated, the plugin works automatically during site rendering:

1. **Render your site** (Preview or Sync to server)
2. **Markdown files are generated** alongside HTML
3. **Access via URL**: `yoursite.com/post-slug.md`

### Generated Files

```
output/
├── index.html
├── content.md              # Index of all markdown files
├── llms.txt                # AI crawler instructions
├── sitemap-markdown.xml    # Sitemap for markdown files
├── my-first-post/
│   └── index.html
├── my-first-post.md        # Markdown version
├── about/
│   └── index.html
└── about.md                # Markdown version
```

## Configuration

Go to **Tools & Plugins → Markdown Export → Settings**:

### Content Options

| Option | Description | Default |
|--------|-------------|---------|
| **Export Posts** | Generate markdown for blog posts | ✅ |
| **Export Pages** | Generate markdown for pages | ✅ |
| **Generate Content Index** | Create `content.md` listing all markdown files | ✅ |

### AI Discovery Options

| Option | Description | Default |
|--------|-------------|---------|
| **Generate llms.txt** | Create llms.txt for AI crawlers | ✅ |
| **Generate Markdown Sitemap** | Create sitemap-markdown.xml | ✅ |

## Output Format

Each markdown file includes YAML frontmatter:

```markdown
---
title: "My Blog Post"
type: post
slug: my-blog-post
date: 2025-01-15
modified: 2025-01-20
author: "John Doe"
tags: [technology, tutorial]
excerpt: "A brief description of the post"
url: https://example.com/my-blog-post/
---

# My Blog Post

The content of your post in clean markdown format...
```

## llms.txt

The plugin generates an `llms.txt` file following the [llms.txt specification](https://llmstxt.org/). This file helps AI crawlers understand your site's structure and available content:

```
# My Website

> Site description here

This site provides markdown versions of all content for LLM/AI consumption.

## Quick Links

- [Content Index](https://example.com/content.md)
- [Markdown Sitemap](https://example.com/sitemap-markdown.xml)

## Recent Posts

- [Post Title](https://example.com/post-slug.md) (2025-01-15)
...
```

## Use Cases

### AI Web Crawlers

Add to your `robots.txt`:

```
# Allow AI crawlers to access markdown versions
User-agent: GPTBot
User-agent: ClaudeBot
User-agent: anthropic-ai
Allow: /*.md$
Allow: /llms.txt
Allow: /sitemap-markdown.xml
```

### Feeding Content to LLMs

```python
import requests

# Fetch markdown version directly
response = requests.get("https://yoursite.com/my-post.md")
markdown_content = response.text

# Use in LLM context - fewer tokens than HTML!
```

### Content Discovery for RAG

```python
# Get the content index
index = requests.get("https://yoursite.com/content.md").text

# Or use the sitemap for structured discovery
sitemap = requests.get("https://yoursite.com/sitemap-markdown.xml").text
```

### AI Assistant Integration

Point AI assistants to your `llms.txt`:

```
Read https://yoursite.com/llms.txt to understand the site structure,
then fetch relevant markdown files for context.
```

## Technical Details

### HTML to Markdown Conversion

The plugin converts the following HTML elements:

- Headings (h1-h6)
- Paragraphs and line breaks
- Bold and italic text
- Links (with internal link conversion)
- Images (with absolute URLs)
- Ordered and unordered lists
- Blockquotes
- Code blocks (with language preservation)
- Inline code
- Horizontal rules

### Character Encoding

Files are written with UTF-8 encoding and include a BOM (Byte Order Mark) to ensure proper character display across all web servers, even those without explicit charset configuration.

### Internal Link Conversion

Links to other posts or pages on your site are automatically converted to point to the `.md` version:

```
/about/           → /about.md
/blog/my-post/    → /blog/my-post.md
```

## Requirements

- Publii 0.44.0 or higher
- No external dependencies

## Building from Source

```bash
# Clone the repository
git clone https://github.com/your-username/publii-markdown-export.git
cd publii-markdown-export

# Build the ZIP file
./build.sh

# Output: ../publii-markdown-export_x.x.x.zip
```

## License

GPL-3.0 - Same as Publii

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Changelog

### 1.0.0

- Initial release
- Markdown export for posts and pages
- YAML frontmatter with metadata (title, date, author, tags, url)
- Content index generation (`content.md`)
- `llms.txt` generation for AI crawler discovery
- `sitemap-markdown.xml` for search engines
- Internal link conversion to `.md` versions
- Absolute image URL conversion
- UTF-8 BOM for universal encoding support

## Credits

Developed for the Publii community to make static site content more accessible to AI systems.

## Links

- [Publii CMS](https://getpublii.com/)
- [llms.txt Specification](https://llmstxt.org/)
- [Publii Plugin Development](https://github.com/GetPublii/Publii/discussions/1359)
