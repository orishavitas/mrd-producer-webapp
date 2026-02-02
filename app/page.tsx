'use client';

import { useState, FormEvent } from 'react';

interface FormData {
  productConcept: string;
  targetMarket: string;
  additionalDetails: string;
}

export default function Home() {
  const [formData, setFormData] = useState<FormData>({
    productConcept: '',
    targetMarket: '',
    additionalDetails: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

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
                  <span>Generating...</span>
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
            <h2 style={{ marginBottom: '1rem' }}>Generated MRD</h2>
            <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
              {result}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}
