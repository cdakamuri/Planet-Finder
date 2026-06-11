import React, { useEffect, useState, useCallback } from 'react';
import { Starfield } from '@/components/Starfield';
import { fetchSamples, predictExoplanet, Sample, PredictionResult } from '@/lib/api';
import { LightCurveChart } from '@/components/LightCurveChart';
import { Sparkline } from '@/components/Sparkline';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export default function Home() {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loadingSamples, setLoadingSamples] = useState(true);
  const [samplesError, setSamplesError] = useState<string | null>(null);
  
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);
  const [predicting, setPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [predictionError, setPredictionError] = useState<string | null>(null);

  useEffect(() => {
    // Force dark mode on mount
    document.documentElement.classList.add('dark');
    
    fetchSamples()
      .then(data => {
        setSamples(data);
        setLoadingSamples(false);
      })
      .catch(err => {
        setSamplesError('Failed to initialize connection to observatory servers.');
        setLoadingSamples(false);
      });
  }, []);

  const exoplanetSamples = samples.filter(s => s.label === 1);
  const nonExoplanetSamples = samples.filter(s => s.label === 0);

  const handleSelectSample = useCallback((sample: Sample) => {
    setSelectedSample(sample);
    setPredictionResult(null);
    setPredictionError(null);
  }, []);

  const handlePredict = useCallback(async () => {
    if (!selectedSample) return;
    setPredicting(true);
    setPredictionResult(null);
    setPredictionError(null);

    try {
      const result = await predictExoplanet(selectedSample.raw_values);
      setPredictionResult(result);
    } catch (err) {
      setPredictionError('Error running prediction sequence.');
    } finally {
      setPredicting(false);
    }
  }, [selectedSample]);

  return (
    <div className="min-h-screen text-foreground relative overflow-hidden font-sans pb-24">
      <Starfield />
      
      <div className="container mx-auto px-4 pt-16">
        <header className="text-center mb-16 space-y-4">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-primary drop-shadow-[0_0_15px_rgba(0,255,255,0.5)]">
            PLANET FINDER
          </h1>
          <p className="text-xl text-muted-foreground font-light max-w-2xl mx-auto">
            Detect exoplanets from stellar light curves using machine learning.
          </p>
        </header>

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
            <div className="lg:col-span-1 space-y-8 h-[calc(100vh-300px)] overflow-y-auto pr-4 custom-scrollbar">
              
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
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-semibold">Target System: #{selectedSample.index}</h2>
                      <p className="text-muted-foreground">True label: {selectedSample.label_name}</p>
                    </div>
                    <Button 
                      size="lg" 
                      onClick={handlePredict} 
                      disabled={predicting}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 h-12 shadow-[0_0_15px_rgba(0,255,255,0.3)] hover:shadow-[0_0_25px_rgba(0,255,255,0.5)] transition-all"
                    >
                      {predicting ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          ANALYZING...
                        </>
                      ) : (
                        'ANALYZE LIGHT CURVE'
                      )}
                    </Button>
                  </div>

                  <LightCurveChart data={selectedSample.raw_values} />

                  {predictionError && (
                    <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-lg">
                      {predictionError}
                    </div>
                  )}

                  {predictionResult && (
                    <Card className="border-border bg-card/80 backdrop-blur-md overflow-hidden relative">
                      <div className={`absolute top-0 left-0 w-1 h-full ${predictionResult.is_exoplanet ? 'bg-green-500' : 'bg-purple-500'}`}></div>
                      <CardHeader className="pb-4">
                        <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">Analysis Result</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                          <div className="text-center md:text-left">
                            <h3 className={`text-4xl md:text-5xl font-bold tracking-tight ${predictionResult.is_exoplanet ? 'text-green-500 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]' : 'text-purple-500 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]'}`}>
                              {predictionResult.is_exoplanet ? 'EXOPLANET DETECTED' : 'NO EXOPLANET'}
                            </h3>
                          </div>
                          
                          <div className="w-full md:w-1/2 space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground uppercase tracking-widest">Confidence</span>
                              <span className="font-mono text-primary">{(predictionResult.confidence * 100).toFixed(2)}%</span>
                            </div>
                            <Progress value={predictionResult.confidence * 100} className="h-3" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
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
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: hsl(var(--card));
          border-radius: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--border));
          border-radius: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--muted-foreground));
        }
      `}} />
    </div>
  );
}

function SampleCard({ sample, isSelected, onSelect }: { sample: Sample, isSelected: boolean, onSelect: () => void }) {
  return (
    <div 
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
          <Badge variant={sample.label === 1 ? 'default' : 'secondary'} className={sample.label === 1 ? 'bg-primary/20 text-primary hover:bg-primary/30 border-primary/30' : ''}>
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
