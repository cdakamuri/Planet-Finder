import { useEffect, useState, useCallback, useRef } from 'react';
import { Starfield } from '@/components/Starfield';
import { fetchSamples, predictExoplanet, Sample, PredictionResult } from '@/lib/api';
import { LightCurveChart } from '@/components/LightCurveChart';
import { Sparkline } from '@/components/Sparkline';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, ClipboardPaste, Database, FlaskConical, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const REQUIRED_VALUES = 3197;

type Mode = 'library' | 'custom';

function parseFluxValues(raw: string): number[] | null {
  const cleaned = raw.trim().replace(/[\r\n]+/g, ',').replace(/,+/g, ',');
  const parts = cleaned.split(',').map(s => s.trim()).filter(Boolean);
  const nums = parts.map(Number);
  if (nums.some(isNaN)) return null;
  return nums;
}

export default function Home() {
  const [mode, setMode] = useState<Mode>('library');

  const [samples, setSamples] = useState<Sample[]>([]);
  const [loadingSamples, setLoadingSamples] = useState(true);
  const [samplesError, setSamplesError] = useState<string | null>(null);
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);

  const [customText, setCustomText] = useState('');
  const [customValues, setCustomValues] = useState<number[] | null>(null);
  const [customParseError, setCustomParseError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [predicting, setPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [predictionError, setPredictionError] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.add('dark');
    fetchSamples()
      .then(data => { setSamples(data); setLoadingSamples(false); })
      .catch(() => { setSamplesError('Failed to initialize connection to observatory servers.'); setLoadingSamples(false); });
  }, []);

  const exoplanetSamples = samples.filter(s => s.label === 1);
  const nonExoplanetSamples = samples.filter(s => s.label === 0);

  const handleSelectSample = useCallback((sample: Sample) => {
    setSelectedSample(sample);
    setPredictionResult(null);
    setPredictionError(null);
  }, []);

  const handlePredict = useCallback(async (values: number[]) => {
    setPredicting(true);
    setPredictionResult(null);
    setPredictionError(null);
    try {
      const result = await predictExoplanet(values);
      setPredictionResult(result);
    } catch {
      setPredictionError('Error running prediction sequence.');
    } finally {
      setPredicting(false);
    }
  }, []);

  const handleCustomTextChange = useCallback((text: string) => {
    setCustomText(text);
    setPredictionResult(null);
    setPredictionError(null);
    setCustomParseError(null);
    setCustomValues(null);
    if (!text.trim()) return;
    const parsed = parseFluxValues(text);
    if (!parsed) {
      setCustomParseError('Could not parse values — make sure all entries are numbers.');
      return;
    }
    if (parsed.length !== REQUIRED_VALUES) {
      setCustomParseError(`Got ${parsed.length.toLocaleString()} values — need exactly ${REQUIRED_VALUES.toLocaleString()}.`);
      return;
    }
    setCustomValues(parsed);
  }, []);

  const handleFileLoad = useCallback((file: File) => {
    if (!file.name.match(/\.(csv|txt|tsv)$/i)) {
      setCustomParseError('Please upload a .csv or .txt file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      const text = (e.target?.result as string) ?? '';
      handleCustomTextChange(text);
    };
    reader.readAsText(file);
  }, [handleCustomTextChange]);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileLoad(file);
  }, [handleFileLoad]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileLoad(file);
    e.target.value = '';
  }, [handleFileLoad]);

  const switchMode = (m: Mode) => {
    setMode(m);
    setPredictionResult(null);
    setPredictionError(null);
  };

  const activeValues = mode === 'library' ? selectedSample?.raw_values ?? null : customValues;
  const canAnalyze = !predicting && activeValues !== null && activeValues.length === REQUIRED_VALUES;

  return (
    <div className="min-h-screen text-foreground relative overflow-hidden font-sans pb-24">
      <Starfield />

      <div className="container mx-auto px-4 pt-16">
        <header className="text-center mb-12 space-y-4">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-primary drop-shadow-[0_0_15px_rgba(0,255,255,0.5)]">
            PLANET FINDER
          </h1>
          <p className="text-xl text-muted-foreground font-light max-w-2xl mx-auto">
            Detect exoplanets from stellar light curves using machine learning.
          </p>
        </header>

        <div className="flex justify-center mb-10">
          <div className="inline-flex rounded-xl border border-border bg-card/60 backdrop-blur-sm p-1 gap-1">
            <button
              data-testid="tab-library"
              onClick={() => switchMode('library')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold uppercase tracking-wider transition-all duration-200 ${
                mode === 'library'
                  ? 'bg-primary text-primary-foreground shadow-[0_0_14px_rgba(6,182,212,0.4)]'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Database className="h-4 w-4" />
              Sample Library
            </button>
            <button
              data-testid="tab-custom"
              onClick={() => switchMode('custom')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold uppercase tracking-wider transition-all duration-200 ${
                mode === 'custom'
                  ? 'bg-primary text-primary-foreground shadow-[0_0_14px_rgba(6,182,212,0.4)]'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FlaskConical className="h-4 w-4" />
              Custom Input
            </button>
          </div>
        </div>

        {mode === 'library' && (
          <>
            {loadingSamples && (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="tracking-widest uppercase text-sm">INITIALIZING SENSORS...</p>
              </div>
            )}

            {samplesError && (
              <div className="bg-destructive/10 border border-destructive text-destructive p-6 rounded-lg text-center max-w-lg mx-auto">
                {samplesError}
              </div>
            )}

            {!loadingSamples && !samplesError && samples.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-8 h-[calc(100vh-340px)] overflow-y-auto pr-4 custom-scrollbar">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Confirmed Exoplanets</h3>
                    <div className="grid gap-3">
                      {exoplanetSamples.map((sample) => (
                        <SampleCard
                          key={sample.index}
                          sample={sample}
                          isSelected={selectedSample?.index === sample.index}
                          onSelect={() => handleSelectSample(sample)}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Non-Exoplanets</h3>
                    <div className="grid gap-3">
                      {nonExoplanetSamples.map((sample) => (
                        <SampleCard
                          key={sample.index}
                          sample={sample}
                          isSelected={selectedSample?.index === sample.index}
                          onSelect={() => handleSelectSample(sample)}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-8">
                  {selectedSample ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                          <h2 className="text-2xl font-semibold">Target System: #{selectedSample.index}</h2>
                          <p className="text-muted-foreground">True label: {selectedSample.label_name}</p>
                        </div>
                        <Button
                          data-testid="button-analyze-library"
                          size="lg"
                          onClick={() => handlePredict(selectedSample.raw_values)}
                          disabled={predicting}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 h-12 shadow-[0_0_15px_rgba(0,255,255,0.3)] hover:shadow-[0_0_25px_rgba(0,255,255,0.5)] transition-all"
                        >
                          {predicting ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />ANALYZING...</> : 'ANALYZE LIGHT CURVE'}
                        </Button>
                      </div>
                      <LightCurveChart data={selectedSample.raw_values} />
                      <PredictionPanel result={predictionResult} error={predictionError} />
                    </div>
                  ) : (
                    <div className="h-[400px] flex items-center justify-center border border-dashed border-border/50 rounded-xl bg-card/30 backdrop-blur-sm">
                      <p className="text-muted-foreground uppercase tracking-widest text-sm flex items-center">
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse mr-3"></span>
                        Select a target system from the registry to begin analysis
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {mode === 'custom' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-400">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <ClipboardPaste className="h-4 w-4" />
                  Paste Flux Values
                </label>
                <div className="relative">
                  <textarea
                    data-testid="input-custom-flux"
                    value={customText}
                    onChange={e => handleCustomTextChange(e.target.value)}
                    placeholder={`Paste ${REQUIRED_VALUES.toLocaleString()} comma- or newline-separated flux values here...\n\nExample:\n119.88, 100.21, 86.46, 48.68, ...`}
                    className="w-full h-64 rounded-xl border border-border bg-card/60 p-4 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all backdrop-blur-sm"
                    spellCheck={false}
                  />
                  {customText && (
                    <button
                      onClick={() => { setCustomText(''); setCustomValues(null); setCustomParseError(null); setPredictionResult(null); setPredictionError(null); }}
                      className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
                      data-testid="button-clear-custom"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload File
                </label>
                <div
                  data-testid="dropzone-file"
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`h-64 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-200 ${
                    dragOver
                      ? 'border-primary bg-primary/10 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                      : 'border-border/60 bg-card/30 hover:border-primary/50 hover:bg-card/50'
                  }`}
                >
                  <Upload className={`h-10 w-10 transition-colors ${dragOver ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">Drop a file here or click to browse</p>
                    <p className="text-xs text-muted-foreground mt-1">CSV or TXT — one value per line or comma-separated</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt,.tsv"
                    className="hidden"
                    onChange={handleFileInput}
                    data-testid="input-file-upload"
                  />
                </div>

                <div className="rounded-xl border border-border/50 bg-card/30 p-4 space-y-2 text-xs text-muted-foreground">
                  <p className="font-semibold uppercase tracking-wider text-foreground/60 text-[10px]">Format guide</p>
                  <p>• One value per line <span className="font-mono text-foreground/50">119.88\n100.21\n...</span></p>
                  <p>• Comma-separated <span className="font-mono text-foreground/50">119.88, 100.21, ...</span></p>
                  <p>• Single-column CSV (header row is ignored if non-numeric)</p>
                  <p>• Exactly {REQUIRED_VALUES.toLocaleString()} flux measurements required</p>
                </div>
              </div>
            </div>

            <ValueStatus text={customText} values={customValues} error={customParseError} />

            {customValues && !customParseError && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <LightCurveChart data={customValues} label="Custom Light Curve" />
                <div className="flex justify-end">
                  <Button
                    data-testid="button-analyze-custom"
                    size="lg"
                    onClick={() => handlePredict(customValues)}
                    disabled={!canAnalyze}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-10 h-12 shadow-[0_0_15px_rgba(0,255,255,0.3)] hover:shadow-[0_0_25px_rgba(0,255,255,0.5)] transition-all"
                  >
                    {predicting ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />ANALYZING...</> : 'ANALYZE LIGHT CURVE'}
                  </Button>
                </div>
              </div>
            )}

            <PredictionPanel result={predictionResult} error={predictionError} />
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: hsl(var(--card)); border-radius: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: hsl(var(--border)); border-radius: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: hsl(var(--muted-foreground)); }
      `}} />
    </div>
  );
}

function ValueStatus({ text, values, error }: { text: string; values: number[] | null; error: string | null }) {
  if (!text.trim()) return null;

  if (error) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive animate-in fade-in duration-200">
        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
        <span>{error}</span>
      </div>
    );
  }

  if (values && values.length === REQUIRED_VALUES) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-green-500/40 bg-green-500/10 p-4 text-sm text-green-400 animate-in fade-in duration-200">
        <CheckCircle2 className="h-5 w-5 shrink-0" />
        <span>
          <span className="font-mono font-bold">{REQUIRED_VALUES.toLocaleString()}</span> flux values loaded — ready for analysis.
        </span>
      </div>
    );
  }

  return null;
}

function PredictionPanel({ result, error }: { result: PredictionResult | null; error: string | null }) {
  if (!result && !error) return null;

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-xl animate-in fade-in duration-200">
        {error}
      </div>
    );
  }

  if (!result) return null;

  return (
    <Card className="border-border bg-card/80 backdrop-blur-md overflow-hidden relative animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className={`absolute top-0 left-0 w-1 h-full ${result.is_exoplanet ? 'bg-green-500' : 'bg-purple-500'}`} />
      <CardHeader className="pb-4">
        <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">Analysis Result</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left">
            <h3 className={`text-4xl md:text-5xl font-bold tracking-tight ${
              result.is_exoplanet
                ? 'text-green-500 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]'
                : 'text-purple-500 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]'
            }`}>
              {result.is_exoplanet ? 'EXOPLANET DETECTED' : 'NO EXOPLANET'}
            </h3>
          </div>
          <div className="w-full md:w-1/2 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground uppercase tracking-widest">Confidence</span>
              <span className="font-mono text-primary">{(result.confidence * 100).toFixed(2)}%</span>
            </div>
            <Progress value={result.confidence * 100} className="h-3" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SampleCard({ sample, isSelected, onSelect }: { sample: Sample; isSelected: boolean; onSelect: () => void }) {
  return (
    <div
      data-testid={`card-sample-${sample.index}`}
      onClick={onSelect}
      className={`group cursor-pointer rounded-xl border p-4 transition-all duration-300 ${
        isSelected
          ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(0,255,255,0.15)]'
          : 'bg-card/50 border-border hover:bg-card hover:border-primary/50'
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="text-xs text-muted-foreground font-mono mb-1">TARGET #{sample.index}</div>
          <Badge
            variant={sample.label === 1 ? 'default' : 'secondary'}
            className={sample.label === 1 ? 'bg-primary/20 text-primary hover:bg-primary/30 border-primary/30' : ''}
          >
            {sample.label_name}
          </Badge>
        </div>
      </div>
      <div className="opacity-70 group-hover:opacity-100 transition-opacity">
        <Sparkline data={sample.preview} />
      </div>
    </div>
  );
}
