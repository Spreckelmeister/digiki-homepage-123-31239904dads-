import ReactMarkdown from "react-markdown";

interface MarkdownContentProps {
  content: string;
}

export default function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <div className="prose-custom">
      <ReactMarkdown
        components={{
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold text-primary mt-6 mb-3">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold text-primary mt-4 mb-2">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="text-text-light leading-relaxed mb-4">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc ml-6 space-y-1 mb-4 text-text-light">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal ml-6 space-y-1 mb-4 text-text-light">
              {children}
            </ol>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-primary-light underline hover:text-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-text">{children}</strong>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary/30 pl-4 italic text-text-light mb-4">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
