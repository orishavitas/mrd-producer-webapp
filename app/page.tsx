'use client';

import { useState, FormEvent, useCallback } from 'react';

interface FormData {
  productConcept: string;
  targetMarket: string;
  additionalDetails: string;
}

interface Source {
  title: string;
  url: string;
}

export default function Home() {
  const [formData, setFormData] = useState<FormData>({
    productConcept: '',
    targetMarket: '',
    additionalDetails: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);
    setSources([]);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to generate MRD');
      }

      const data = await response.json();
      setResult(data.mrd);
      setSources(data.sources || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const downloadDocument = useCallback(async (format: 'docx' | 'html' | 'pdf') => {
    if (!result) return;

    setIsDownloading(format);

    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          markdown: result,
          format,
          productName: formData.productConcept.slice(0, 50),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate document');
      }

      if (format === 'pdf') {
        // For PDF, open HTML in new window for printing
        const data = await response.json();
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(data.html);
          printWindow.document.close();
          printWindow.focus();
          // Delay print to allow styles to load
          setTimeout(() => {
            printWindow.print();
          }, 500);
        }
      } else {
        // For DOCX and HTML, download the file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MRD-${formData.productConcept.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 30)}-${Date.now()}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download document');
    } finally {
      setIsDownloading(null);
    }
  }, [result, formData.productConcept]);

  return (
    <main className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      <div className="flex flex-col gap-4" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1>MRD Producer</h1>
          <p style={{ color: '#64748b' }}>
            Generate comprehensive Market Requirements Documents with AI
          </p>
        </header>

        <div className="card">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="productConcept"
                style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}
              >
                Product Concept *
              </label>
              <input
                type="text"
                id="productConcept"
                name="productConcept"
                value={formData.productConcept}
                onChange={handleInputChange}
                placeholder="e.g., AI-powered task management app"
                required
                aria-required="true"
              />
            </div>

            <div>
              <label
                htmlFor="targetMarket"
                style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}
              >
                Target Market *
              </label>
              <input
                type="text"
                id="targetMarket"
                name="targetMarket"
                value={formData.targetMarket}
                onChange={handleInputChange}
                placeholder="e.g., Small business owners and freelancers"
                required
                aria-required="true"
              />
            </div>

            <div>
              <label
                htmlFor="additionalDetails"
                style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}
              >
                Additional Details
              </label>
              <textarea
                id="additionalDetails"
                name="additionalDetails"
                value={formData.additionalDetails}
                onChange={handleInputChange}
                placeholder="Any additional context or requirements..."
                rows={4}
                style={{ resize: 'vertical' }}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !formData.productConcept || !formData.targetMarket}
              style={{ marginTop: '1rem' }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-4">
                  <span className="spinner" />
                  <span>Generating MRD...</span>
                </span>
              ) : (
                'Generate MRD'
              )}
            </button>
          </form>
        </div>

        {error && (
          <div
            className="card"
            style={{
              backgroundColor: '#fef2f2',
              borderColor: '#fecaca',
              color: '#991b1b'
            }}
            role="alert"
          >
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h2 style={{ margin: 0 }}>Generated MRD</h2>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => downloadDocument('docx')}
                  disabled={isDownloading !== null}
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    backgroundColor: '#2563eb',
                  }}
                >
                  {isDownloading === 'docx' ? 'Downloading...' : 'Download Word'}
                </button>
                <button
                  type="button"
                  onClick={() => downloadDocument('pdf')}
                  disabled={isDownloading !== null}
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    backgroundColor: '#dc2626',
                  }}
                >
                  {isDownloading === 'pdf' ? 'Preparing...' : 'Print/PDF'}
                </button>
                <button
                  type="button"
                  onClick={() => downloadDocument('html')}
                  disabled={isDownloading !== null}
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    backgroundColor: '#059669',
                  }}
                >
                  {isDownloading === 'html' ? 'Downloading...' : 'Download HTML'}
                </button>
              </div>
            </div>

            {sources.length > 0 && (
              <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#f0f9ff', borderRadius: '0.375rem' }}>
                <strong style={{ fontSize: '0.875rem' }}>Research Sources:</strong>
                <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.25rem', fontSize: '0.875rem' }}>
                  {sources.map((source, i) => (
                    <li key={i}>
                      <a href={source.url} target="_blank" rel="noopener noreferrer" style={{ color: '#1d4ed8' }}>
                        {source.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div
              style={{
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                fontSize: '0.9375rem',
                lineHeight: '1.6',
                maxHeight: '600px',
                overflowY: 'auto',
                padding: '1rem',
                backgroundColor: '#fafafa',
                borderRadius: '0.375rem',
                border: '1px solid #e5e7eb',
              }}
            >
              {result}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
