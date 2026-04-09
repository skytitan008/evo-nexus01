import { useEffect, useState, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { marked } from "marked";
import {
  BookOpen, ChevronRight, Search, FileText, Layout, Bot,
  Zap, Workflow, Plug, Globe, BookMarked, Menu, X, ArrowLeft,
} from "lucide-react";

const SECTION_ICONS: Record<string, React.ReactNode> = {
  "getting-started": <BookOpen className="w-4 h-4" />,
  guides: <FileText className="w-4 h-4" />,
  dashboard: <Layout className="w-4 h-4" />,
  agents: <Bot className="w-4 h-4" />,
  skills: <Zap className="w-4 h-4" />,
  routines: <Workflow className="w-4 h-4" />,
  integrations: <Plug className="w-4 h-4" />,
  "real-world": <Globe className="w-4 h-4" />,
  reference: <BookMarked className="w-4 h-4" />,
};

interface DocChild {
  title: string;
  slug: string;
  path: string;
}
interface DocSection {
  title: string;
  slug: string;
  children: DocChild[];
}
interface DocsIndex {
  sections: DocSection[];
}

// Configure marked with custom renderer for dark theme
const renderer = new marked.Renderer();

renderer.heading = ({ text, depth }: { text: string; depth: number }) => {
  const styles: Record<number, string> = {
    1: 'text-3xl font-bold text-white mt-6 mb-6',
    2: 'text-2xl font-bold text-[#e6edf3] mt-10 mb-4 pb-2 border-b border-[#21262d]',
    3: 'text-xl font-semibold text-[#e6edf3] mt-8 mb-3',
    4: 'text-lg font-semibold text-[#e6edf3] mt-6 mb-2',
  };
  return `<h${depth} class="${styles[depth] || ''}">${text}</h${depth}>`;
};

renderer.code = ({ text, lang }: { text: string; lang?: string }) =>
  `<pre class="bg-[#0d1117] border border-[#30363d] rounded-lg p-4 my-4 overflow-x-auto"><code class="text-sm font-mono text-[#e6edf3]">${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`;

renderer.codespan = ({ text }: { text: string }) =>
  `<code class="bg-[#161b22] text-[#00FFA7] px-1.5 py-0.5 rounded text-sm font-mono">${text}</code>`;

renderer.link = ({ href, text }: { href: string; text: string }) =>
  `<a href="${href}" class="text-[#00FFA7] hover:underline" target="_blank" rel="noreferrer">${text}</a>`;

renderer.image = ({ href, text }: { href: string; text: string }) => {
  const src = href.replace(/^(\.\.\/)?imgs\//, '/docs/imgs/');
  return `<img src="${src}" alt="${text}" class="rounded-lg max-w-full my-4" />`;
};

renderer.blockquote = ({ text }: { text: string }) =>
  `<blockquote class="border-l-4 border-[#00FFA7] pl-4 py-2 my-4 text-[#8b949e] bg-[#161b22] rounded-r">${text}</blockquote>`;

renderer.table = ({ header, body }: { header: string; body: string }) =>
  `<div class="overflow-x-auto my-4"><table class="w-full border-collapse">${header}${body}</table></div>`;

renderer.tablerow = ({ text }: { text: string }) =>
  `<tr class="hover:bg-[#161b22]">${text}</tr>`;

renderer.tablecell = ({ text, header }: { text: string; header: boolean }) =>
  header
    ? `<th class="px-4 py-2 text-left text-sm font-semibold text-[#e6edf3] border-b border-[#30363d]">${text}</th>`
    : `<td class="px-4 py-2 text-sm text-[#8b949e] border-b border-[#21262d]">${text}</td>`;

renderer.list = ({ body, ordered }: { body: string; ordered: boolean }) =>
  ordered
    ? `<ol class="my-3 space-y-1 list-decimal ml-6 text-[#8b949e]">${body}</ol>`
    : `<ul class="my-3 space-y-1 list-disc ml-6 text-[#8b949e]">${body}</ul>`;

renderer.listitem = ({ text }: { text: string }) =>
  `<li class="text-[#8b949e]">${text}</li>`;

renderer.paragraph = ({ text }: { text: string }) =>
  `<p class="text-[#8b949e] leading-relaxed mb-4">${text}</p>`;

renderer.hr = () => `<hr class="border-[#21262d] my-8" />`;

renderer.strong = ({ text }: { text: string }) =>
  `<strong class="text-[#e6edf3] font-semibold">${text}</strong>`;

marked.setOptions({ renderer, breaks: false, gfm: true });

export default function Docs() {
  const [index, setIndex] = useState<DocsIndex | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const contentRef = useRef<HTMLDivElement>(null);

  // Extract slug from URL path directly (more reliable than useRoute with wildcards)
  const currentSlug = location.startsWith("/docs/") ? location.slice(6) : null;

  // Load index
  useEffect(() => {
    fetch("/docs-index.json")
      .then((r) => r.json())
      .then((data) => setIndex(data))
      .catch(() => setIndex({ sections: [] }));
  }, []);

  // Load content when slug changes
  useEffect(() => {
    if (!index) return;
    let docPath: string | null = null;

    if (currentSlug) {
      for (const section of index.sections) {
        const child = section.children.find((c) => c.slug === currentSlug);
        if (child) {
          docPath = child.path;
          break;
        }
      }
    }

    if (!docPath && index.sections.length > 0 && index.sections[0].children.length > 0) {
      docPath = index.sections[0].children[0].path;
      if (!currentSlug) {
        setLocation(`/docs/${index.sections[0].children[0].slug}`, { replace: true });
      }
    }

    if (docPath) {
      setLoading(true);
      fetch(`/docs/${docPath}`)
        .then((r) => r.text())
        .then((text) => {
          setContent(text);
          setLoading(false);
          contentRef.current?.scrollTo(0, 0);
        })
        .catch(() => {
          setContent("# Not Found\n\nThis page could not be loaded.");
          setLoading(false);
        });
    }
  }, [index, currentSlug, setLocation]);

  const filteredSections =
    index?.sections
      .map((s) => ({
        ...s,
        children: s.children.filter((c) =>
          c.title.toLowerCase().includes(search.toLowerCase())
        ),
      }))
      .filter((s) => s.children.length > 0) ?? [];

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3] flex">
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-[#161b22] border border-[#30363d] text-[#8b949e] hover:text-white"
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-72 bg-[#0d1117] border-r border-[#21262d] flex flex-col z-40 transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 border-b border-[#21262d]">
          <a href="/" className="flex items-center gap-2 text-[#00FFA7] font-semibold text-sm mb-4 hover:underline">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </a>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#00FFA7]" /> Documentation
          </h2>
          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#484f58]" />
            <input
              type="search"
              placeholder="Search docs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#161b22] border border-[#30363d] rounded-lg text-sm text-[#e6edf3] placeholder-[#484f58] focus:outline-none focus:border-[#00FFA7]"
            />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-4">
          {filteredSections.map((section) => (
            <div key={section.slug}>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#8b949e] uppercase tracking-wider px-2 mb-1">
                {SECTION_ICONS[section.slug] || <FileText className="w-4 h-4" />}
                {section.title}
              </div>
              <ul className="space-y-0.5">
                {section.children.map((child) => (
                  <li key={child.slug}>
                    <a
                      href={`/docs/${child.slug}`}
                      onClick={(e) => {
                        e.preventDefault();
                        setLocation(`/docs/${child.slug}`);
                        setSidebarOpen(false);
                      }}
                      className={`block px-3 py-1.5 rounded text-sm transition-colors ${
                        currentSlug === child.slug
                          ? "bg-[#00FFA7]/10 text-[#00FFA7] font-medium"
                          : "text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#161b22]"
                      }`}
                    >
                      {child.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-[#21262d] text-xs text-[#484f58]">
          <a
            href="/docs/llms-full.txt"
            className="flex items-center gap-1 hover:text-[#00FFA7] transition-colors"
          >
            <FileText className="w-3 h-3" /> llms-full.txt
          </a>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Content */}
      <main ref={contentRef} className="flex-1 min-h-screen overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 lg:px-12 py-12 lg:py-16">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-[#484f58] text-sm">Loading...</div>
            </div>
          ) : (
            <article
              className="prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: marked.parse(content) as string }}
            />
          )}
        </div>
      </main>
    </div>
  );
}
