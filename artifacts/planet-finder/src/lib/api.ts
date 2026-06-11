export interface Sample {
  index: number;
  label: number;
  label_name: string;
  preview: number[];
  raw_values: number[];
}

export interface PredictionResult {
  label: number;
  label_name: string;
  confidence: number;
  is_exoplanet: boolean;
}

export async function fetchSamples(): Promise<Sample[]> {
  const res = await fetch('/model-api/samples');
  if (!res.ok) throw new Error('Failed to fetch samples');
  return res.json();
}

export async function predictExoplanet(values: number[]): Promise<PredictionResult> {
  const res = await fetch('/model-api/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ values, preprocess: true })
  });
  if (!res.ok) throw new Error('Failed to run prediction');
  return res.json();
}
