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

export default function MRDPage() {
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to generate MRD');

      const data = await response.json();
      setResult(data.mrd);
      setSources(data.sources || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const downloadDocument = useCallback(async (format: 'docx' | 'html' | 'pdf') => {
    if (!result) return;
    setIsDownloading(format);

    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markdown: result,
          format,
          productName: formData.productConcept.slice(0, 50),
        }),
      });

      if (!response.ok) throw new Error('Failed to generate document');

      if (format === 'pdf') {
        const data = await response.json();
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(data.html);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => { printWindow.print(); }, 500);
        }
      } else {
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
    <main className="page">
      <div className="container page-shell">
        <header className="page-hero">
          <p className="eyebrow">AI-assisted MRDs</p>
          <h1>MRD Producer</h1>
          <p className="subtitle">
            Generate comprehensive Market Requirements Documents with focused inputs
            and actionable research.
          </p>
        </header>

        <div className="card form-card">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="field">
              <label htmlFor="productConcept">Product Concept *</label>
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

            <div className="field">
              <label htmlFor="targetMarket">Target Market *</label>
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

            <div className="field">
              <label htmlFor="additionalDetails">Additional Details</label>
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

            <div className="actions">
              <button
                type="submit"
                className="btn-primary"
                disabled={isLoading || !formData.productConcept || !formData.targetMarket}
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
              <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
                Typical turnaround: under 1 minute.
              </span>
            </div>
          </form>
        </div>

        {error && (
          <div className="card alert" role="alert">
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && (
          <div className="card result-card">
            <div className="result-header">
              <h2 style={{ margin: 0 }}>Generated MRD</h2>
              <div className="result-actions">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => downloadDocument('docx')}
                  disabled={isDownloading !== null}
                >
                  {isDownloading === 'docx' ? 'Downloading...' : 'Download Word'}
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => downloadDocument('pdf')}
                  disabled={isDownloading !== null}
                >
                  {isDownloading === 'pdf' ? 'Preparing...' : 'Print/PDF'}
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => downloadDocument('html')}
                  disabled={isDownloading !== null}
                >
                  {isDownloading === 'html' ? 'Downloading...' : 'Download HTML'}
                </button>
              </div>
            </div>

            {sources.length > 0 && (
              <div className="sources">
                <strong>Research Sources:</strong>
                <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.25rem', fontSize: '0.875rem' }}>
                  {sources.map((source, i) => (
                    <li key={i}>
                      <a href={source.url} target="_blank" rel="noopener noreferrer">
                        {source.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="result-body">
              {result}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
