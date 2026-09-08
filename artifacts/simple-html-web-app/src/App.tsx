import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState('');
  const [hasAnalysisNotice, setHasAnalysisNotice] = useState(false);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.currentTarget.files?.[0];

    // Resetting allows the same file to be chosen again after reselecting.
    event.currentTarget.value = '';

    if (!nextFile || !nextFile.type.startsWith('image/')) {
      return;
    }

    const nextObjectUrl = URL.createObjectURL(nextFile);
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    objectUrlRef.current = nextObjectUrl;
    setPhotoUrl(nextObjectUrl);
    setPhotoName(nextFile.name);
    setHasAnalysisNotice(false);
  };

  const openPhotoPicker = () => {
    inputRef.current?.click();
  };

  return (
    <main className="outfit-app">
      <div className="outfit-frame">
        <header className="outfit-header">
          <div className="outfit-mark">PRIVATE STYLING COMPANION</div>
          <div className="outfit-meta">01 / 01</div>
        </header>

        <section className="outfit-hero" aria-labelledby="page-title">
          <p className="outfit-eyebrow">TODAY&apos;S CHECK-IN</p>
          <h1 className="outfit-title" id="page-title" data-testid="text-page-title">
            服の違和感検知器
          </h1>
          <p className="outfit-copy" data-testid="text-page-description">
            「なんか違う」を見つけるために、今日のコーデを見せて。
          </p>
        </section>

        <section className="outfit-workspace" aria-label="コーデ写真の選択">
          <input
            ref={inputRef}
            className="hidden-file-input"
            id="outfit-photo"
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            data-testid="input-outfit-photo"
          />

          {photoUrl ? (
            <>
              <div className="photo-preview-surface" data-testid="preview-outfit-photo">
                <img className="photo-preview" src={photoUrl} alt="選択したコーデの写真" />
                <span className="photo-preview-caption">{photoName || "TODAY'S LOOK"}</span>
              </div>
              <div className="photo-actions">
                <button
                  className="analyze-button"
                  type="button"
                  onClick={() => setHasAnalysisNotice(true)}
                  data-testid="button-analyze-outfit"
                >
                  このコーデを分析する
                </button>
                <button
                  className="reselect-button"
                  type="button"
                  onClick={openPhotoPicker}
                  data-testid="button-reselect-photo"
                >
                  写真を選び直す
                </button>
              </div>
              {hasAnalysisNotice && (
                <p
                  className="analysis-notice"
                  role="status"
                  aria-live="polite"
                  data-testid="status-analysis"
                >
                  分析機能は次のアップデートで追加します
                </p>
              )}
            </>
          ) : (
            <div className="photo-drop" data-testid="empty-photo-state">
              <div className="photo-prompt">
                <div className="photo-glyph" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
                    <path
                      d="M4 7.5A2.5 2.5 0 0 1 6.5 5h2l1.1-1.5h4.8L15.5 5h2A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-9Z"
                      stroke="currentColor"
                      strokeWidth="1.35"
                    />
                    <circle cx="12" cy="12" r="3.25" stroke="currentColor" strokeWidth="1.35" />
                  </svg>
                </div>
                <p className="photo-prompt-title">今日のコーデを一枚</p>
                <p className="photo-prompt-detail">全身でも、一部でも大丈夫</p>
                <label className="photo-select" htmlFor="outfit-photo">
                  写真を選択する
                </label>
              </div>
            </div>
          )}
        </section>

        <footer className="outfit-footer">
          写真はこの画面の中だけで扱われます。<br />
          うまく言葉にできない違和感も、そのままで。
        </footer>
      </div>
    </main>
  );
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
