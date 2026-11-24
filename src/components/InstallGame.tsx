import { useEffect, useState } from 'react';

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
function isInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}
export function InstallGame() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(isInstalled);
  const [help, setHelp] = useState(false);
  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const onInstalled = () => { setInstalled(true); setPrompt(null); setHelp(false); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);
  const install = async () => {
    if (!prompt) { setHelp(true); return; }
    try { await prompt.prompt(); await prompt.userChoice; }
    catch { setHelp(true); }
    finally { setPrompt(null); }
  };
  if (installed) return null;
  return <>
    <button type="button" className="rounded-full bg-emerald-900 border border-emerald-400/60 px-3 py-2 text-xs font-bold text-emerald-100 shadow-lg" onClick={() => void install()}>↓ Instal Game</button>
    {help && <div role="dialog" aria-modal="true" aria-label="Cara instal NUR LEGENDS" className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-md rounded-2xl border border-amber-500/60 bg-slate-950 p-5 shadow-xl">
        <h2 className="text-lg font-bold text-amber-300">Instal NUR LEGENDS</h2>
        <div className="mt-3 space-y-3 text-sm text-slate-200">
          <p><strong>Android:</strong> Buka di Chrome, ketuk menu ⋮, pilih Instal aplikasi atau Tambahkan ke layar utama.</p>
          <p><strong>iPhone / iPad:</strong> Buka di Safari, ketuk Bagikan, lalu Tambahkan ke Layar Utama.</p>
          <p><strong>PC / Laptop:</strong> Buka di Chrome atau Edge, cari ikon instal di bilah alamat atau menu aplikasi.</p>
          <p>Jika opsi instal tidak muncul, buka melalui browser utama, bukan browser dalam aplikasi lain.</p>
        </div>
        <button type="button" className="mt-4 rounded bg-amber-400 px-4 py-2 font-bold text-slate-950" onClick={() => setHelp(false)}>Tutup</button>
      </div>
    </div>}
  </>;
}
