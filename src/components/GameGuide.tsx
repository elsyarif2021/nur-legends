import { useEffect, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Coins, X } from 'lucide-react';
import { useGameCatalog } from '../services/gameCatalog';
import type { GameMode, HeroId } from '../types/game';
import { HeroAvatar } from './HeroAvatar';

const sections = ['Mode', 'Pahlawan', 'Perlengkapan', 'Pembaruan'] as const;
const itemCategories = ['Semua', 'Serangan', 'Sihir', 'Pertahanan', 'Mobilitas'] as const;

const modes: { id: GameMode; name: string; description: string }[] = [
  { id: 'training', name: 'Latihan', description: 'Kenali kontrol dan kemampuan pahlawan dalam pertarungan 1 lawan 1 dengan minion.' },
  { id: 'duel', name: 'Duel 1v1', description: 'Hadapi satu lawan dalam duel melawan bot.' },
  { id: '3v3', name: 'Pertempuran 3v3', description: 'Bertarung bersama tim kecil dengan rekan dan lawan bot.' },
  { id: '5v5', name: 'Pertempuran 5v5', description: 'Dorong tiga jalur bersama tim, hancurkan menara, lalu rebut Inti Cahaya.' },
  { id: 'online', name: 'Multipemain', description: 'Buat ruang atau gabung menggunakan kode undangan.' },
];

const filterClass = (active: boolean) =>
  `rounded-lg border px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 ${active ? 'border-amber-300 bg-amber-300 text-slate-950' : 'border-teal-900 bg-[#0e252c] text-teal-100 hover:border-teal-400'}`;

const cardClass = 'rounded-xl border border-teal-900 bg-[#0b232b] p-4';

interface GameGuideProps {
  selectedHeroId: HeroId;
  onSelectHero: (heroId: HeroId) => void;
  onPlay: (mode: GameMode) => void;
  onClose: () => void;
}

export function GameGuide({ selectedHeroId, onSelectHero, onPlay, onClose }: GameGuideProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { heroList, shopItems } = useGameCatalog();
  const [section, setSection] = useState<(typeof sections)[number]>('Mode');
  const [category, setCategory] = useState<(typeof itemCategories)[number]>('Semua');
  const items = category === 'Semua' ? shopItems : shopItems.filter(item => item.category === category);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => { if (element?.open) element.close(); };
  }, []);

  return (
    <dialog
      ref={dialog}
      aria-labelledby="game-guide-title"
      onClose={onClose}
      className="m-auto max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-4xl overflow-hidden rounded-2xl border border-amber-400/40 bg-[#071a23] p-0 text-slate-100 shadow-2xl backdrop:bg-black/75 open:flex open:flex-col"
    >
      <header className="flex shrink-0 items-center gap-3 border-b border-amber-400/20 bg-[#102e31] p-4 sm:p-5">
        <BookOpen aria-hidden="true" className="shrink-0 text-amber-300" />
        <h2 id="game-guide-title" className="font-display text-lg font-bold text-amber-100 sm:text-2xl">Panduan NUR LEGENDS</h2>
        <button type="button" aria-label="Tutup panduan" onClick={onClose} className="ml-auto grid size-11 shrink-0 place-items-center rounded-lg border border-teal-700 hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-amber-200">
          <X aria-hidden="true" className="size-5" />
        </button>
      </header>

      <div aria-label="Bagian panduan" role="group" className="flex shrink-0 flex-wrap gap-2 border-b border-teal-900 p-3 sm:px-5">
        {sections.map(name => (
          <button key={name} type="button" aria-pressed={section === name} className={filterClass(section === name)} onClick={() => setSection(name)}>{name}</button>
        ))}
      </div>

      <div key={section} className="min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5">
        {section === 'Mode' && (
          <ul className="grid gap-3 sm:grid-cols-2">
            {modes.map(mode => (
              <li key={mode.id} className={cardClass}>
                <h3 className="font-bold text-amber-100">{mode.name}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-300">{mode.description}</p>
                <button type="button" onClick={() => onPlay(mode.id)} className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-bold text-teal-200 hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-amber-200">
                  {mode.id === 'online' ? 'Buka multipemain' : `Main ${mode.name}`} <ArrowRight aria-hidden="true" className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {section === 'Pahlawan' && (
          <ul className="grid gap-3 sm:grid-cols-2">
            {heroList.map(hero => (
              <li key={hero.id} className={cardClass}>
                <div className="flex items-center gap-3">
                  <HeroAvatar heroId={hero.id} />
                  <div>
                    <h3 className="font-bold text-amber-100">{hero.name}</h3>
                    <p className="text-sm text-teal-200">{hero.roleLabelId} · {hero.stats.isRanged ? 'Jarak jauh' : 'Jarak dekat'}</p>
                  </div>
                </div>
                <p className="my-3 text-sm text-slate-300">{hero.skills.map(skill => skill.name).join(' · ')}</p>
                <button type="button" aria-pressed={selectedHeroId === hero.id} className={filterClass(selectedHeroId === hero.id)} onClick={() => onSelectHero(hero.id)}>
                  {selectedHeroId === hero.id ? 'Dipilih' : `Pilih ${hero.name}`}
                </button>
              </li>
            ))}
          </ul>
        )}
        {section === 'Perlengkapan' && (
          <>
            <p className="mb-3 text-sm text-slate-300">Gunakan emas untuk membeli item di toko saat bertanding.</p>
            <div aria-label="Kategori perlengkapan" role="group" className="mb-4 flex flex-wrap gap-2">
              {itemCategories.map(name => (
                <button key={name} type="button" aria-pressed={category === name} className={filterClass(category === name)} onClick={() => setCategory(name)}>{name}</button>
              ))}
            </div>
            {items.length ? (
              <ul className="grid gap-3 sm:grid-cols-2">
                {items.map(item => (
                  <li key={item.id} className={cardClass}>
                    <h3 className="font-bold text-amber-100">{item.name}</h3>
                    <p className="my-1 text-sm text-slate-300">{item.description}</p>
                    <p className="flex items-center gap-2 text-sm text-amber-200"><Coins aria-hidden="true" className="size-4" />{item.cost} emas<span className="text-teal-200">· {item.category}</span></p>
                  </li>
                ))}
              </ul>
            ) : <p className="text-slate-300">Belum ada item dalam kategori ini.</p>}
          </>
        )}
        {section === 'Pembaruan' && (
          <ul className="grid gap-3 sm:grid-cols-2">
            <li className={cardClass}><h3 className="font-bold text-amber-100">Kontrol serangan</h3><p className="mt-1 text-sm text-slate-300">Pahlawan jarak jauh memakai tombol Tembak. Tahan tombol untuk mengulang serangan.</p></li>
            <li className={cardClass}><h3 className="font-bold text-amber-100">Animasi pembuka</h3><p className="mt-1 text-sm text-slate-300">Intro NUR LEGENDS tampil saat membuka sesi baru dan bisa dilewati.</p></li>
            <li className={cardClass}><h3 className="font-bold text-amber-100">Latihan offline</h3><p className="mt-1 text-sm text-slate-300">Mode Latihan bisa dibuka tanpa internet setelah aset selesai tersimpan pada kunjungan pertama.</p></li>
          </ul>
        )}
      </div>
    </dialog>
  );
}
