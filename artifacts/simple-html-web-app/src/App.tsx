import { useEffect, useRef, useState, type ChangeEvent } from 'react';

type Finding = { category: string; title: string; detail: string; level: 'low' | 'mid' | 'high' };

type Analysis = { score: number; summary: string; findings: Finding[] };

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function analyzeImage(file: File): Promise<Analysis> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 180;
      const scale = Math.min(size / img.width, size / img.height, 1);
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error('画像を読み込めませんでした')); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let brightness = 0, sat = 0, contrast = 0, count = 0;
      const buckets = new Array(12).fill(0);
      for (let i = 0; i < data.length; i += 16) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        const v = max / 255;
        brightness += v;
        sat += max === 0 ? 0 : (max - min) / max;
        const hue = Math.round((Math.atan2(Math.sqrt(3) * (g - b), 2 * r - g - b) * 180 / Math.PI + 360) % 360);
        buckets[Math.floor(hue / 30)]++;
        count++;
      }
      brightness /= count; sat /= count;
      for (let i = 0; i < data.length; i += 16) { const v = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255; contrast += Math.abs(v - brightness); }
      contrast /= count;
      const dominant = buckets.indexOf(Math.max(...buckets));
      const findings: Finding[] = [];
      if (sat > 0.58 && contrast > 0.25) findings.push({ category: '色', title: '色の主張が強め', detail: '色の鮮やかさと明暗差が同時に高め。主役を1色に絞るとまとまりやすい可能性があります。', level: 'mid' });
      else if (sat < 0.18 && contrast < 0.12) findings.push({ category: '色', title: '全体が少し平坦', detail: '彩度と明暗差が低め。靴・バッグ・アクセなどに小さな差し色を入れると立体感が出やすいです。', level: 'low' });
      else findings.push({ category: '色', title: '色のバランスは比較的安定', detail: '画像全体の彩度と明暗差からは、大きな色の衝突は検出されませんでした。', level: 'low' });
      const ratio = img.height / img.width;
      if (ratio < 0.85) findings.push({ category: 'シルエット', title: '横長構図で全身バランスを判定しにくい', detail: '写真の縦横比から、全身の上下バランスを十分に読み取れない可能性があります。', level: 'mid' });
      else if (ratio > 1.8) findings.push({ category: 'シルエット', title: '縦のラインが強め', detail: '縦長の写真です。上半身と下半身の境目が小さく見えるため、シルエット判定は参考値です。', level: 'low' });
      else findings.push({ category: 'シルエット', title: '構図から大きな偏りは未検出', detail: '画像の縦横比と明暗分布から、極端な構図上の偏りは検出されませんでした。', level: 'low' });
      if (brightness < 0.27) findings.push({ category: '季節感', title: '暗めの写真で季節感が判定しにくい', detail: '照明が暗いため、素材や色の季節感は控えめに判定しています。', level: 'mid' });
      else if (brightness > 0.78) findings.push({ category: '季節感', title: '明るい写真。素材感は判定注意', detail: '露出が高めなので、白系アイテムの色味や素材感は実物より明るく見えている可能性があります。', level: 'low' });
      else findings.push({ category: '季節感', title: '写真条件は比較的安定', detail: '明るさから見て、画像条件による大きな季節感の誤判定は起きにくい状態です。', level: 'low' });
      const penalty = findings.reduce((s, f) => s + (f.level === 'high' ? 25 : f.level === 'mid' ? 12 : 3), 0);
      const score = clamp(100 - penalty, 0, 100);
      const hueName = ['赤〜橙','橙〜黄','黄〜緑','緑〜青緑','青緑〜青','青〜紫','紫〜赤紫','赤紫〜赤','赤','橙','黄','緑'][dominant] ?? '混色';
      URL.revokeObjectURL(url);
      resolve({ score, summary: `画像からは「${hueName}系」の色成分が比較的多く検出されました。これは画像の色・明暗・構図を使った簡易チェックです。`, findings });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('画像を読み込めませんでした')); };
    img.src = url;
  });
}

function App() {
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState('');
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => () => { if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current); }, []);

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]; event.currentTarget.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    const nextUrl = URL.createObjectURL(file);
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = nextUrl;
    setPhotoUrl(nextUrl); setPhotoName(file.name); setAnalysis(null); setError('');
  };

  const runAnalysis = async () => {
    const fileInput = inputRef.current;
    if (!fileInput?.files?.[0]) { setError('写真をもう一度選択してください'); return; }
    setBusy(true); setError('');
    try { setAnalysis(await analyzeImage(fileInput.files[0])); }
    catch (e) { setError(e instanceof Error ? e.message : '分析に失敗しました'); }
    finally { setBusy(false); }
  };

  return (
    <main className="outfit-app">
      <div className="outfit-frame">
        <header className="outfit-header"><div className="outfit-mark">PRIVATE STYLING COMPANION</div><div className="outfit-meta">01 / 01</div></header>
        <section className="outfit-hero"><p className="outfit-eyebrow">LOOK CHECK</p><h1 className="outfit-title">服の違和感検知器</h1><p className="outfit-copy">「なんか違う」を、色・シルエット・季節感からチェック。</p></section>
        <section className="outfit-workspace" aria-label="コーデ写真の選択">
          <input ref={inputRef} className="hidden-file-input" type="file" accept="image/*" onChange={handlePhotoChange} />
          {photoUrl ? <>
            <div className="photo-preview-surface"><img className="photo-preview" src={photoUrl} alt="選択したコーデの写真" /><span className="photo-preview-caption">{photoName || 'TODAY’S LOOK'}</span></div>
            <div className="photo-actions"><button className="analyze-button" type="button" onClick={runAnalysis} disabled={busy}>{busy ? '分析中…' : 'このコーデを分析する'}</button><button className="reselect-button" type="button" onClick={() => inputRef.current?.click()}>写真を選び直す</button></div>
            {error && <p className="analysis-notice" role="alert">{error}</p>}
          </> : <div className="photo-drop"><div className="photo-prompt"><div className="photo-glyph" aria-hidden="true">＋</div><p className="photo-prompt-title">今日のコーデを一枚</p><p className="photo-prompt-detail">全身でも、一部でも大丈夫</p><label className="photo-select" htmlFor="outfit-photo">写真を選択する</label></div></div>}
          <input id="outfit-photo" className="hidden-file-input" type="file" accept="image/*" onChange={handlePhotoChange} />
        </section>
        {analysis && <section className="analysis-panel" aria-live="polite"><div className="analysis-score"><span>違和感チェック</span><strong>{analysis.score}</strong><small>/ 100</small></div><p className="analysis-summary">{analysis.summary}</p><div className="finding-list">{analysis.findings.map((f, i) => <article className="finding" key={`${f.category}-${i}`}><div className="finding-head"><span>{f.category}</span><b>{f.title}</b></div><p>{f.detail}</p></article>)}</div><p className="analysis-disclaimer">※外部AIやサーバーへ写真を送信せず、この端末のブラウザ内で画像の色・明るさ・構図を簡易分析しています。服の種類や素材を完全に認識するものではありません。</p></section>}
        <footer className="outfit-footer">写真はこの画面の中だけで扱われます。<br />うまく言葉にできない違和感も、そのままで。</footer>
      </div>
    </main>
  );
}

export default App;
