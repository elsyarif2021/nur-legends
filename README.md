# NUR LEGENDS: GUARDIANS OF LIGHT

Gim strategi aksi MOBA **5 vs 5** bertema peradaban fantasi bernuansa Islami dalam **Bahasa Indonesia**, dirancang ramah keluarga untuk perangkat seluler (layar sentuh) dan desktop web.

---

## Pilar Desain & Etika Permainan

1. **Alur Permainan Fungsional**: Pertandingan real-time dengan penghancuran menara pertahanan dan Inti Cahaya lawan sebagai kondisi kemenangan.
2. **Mesin Gim Stabil**: Phaser 3 + React + TypeScript dengan loop berbasis *delta-time* terklamp (`<= 50ms`) dan isolasi siklus hidup kanvas.
3. **Kontrol Sentuh Mobile, Laptop & PC**: Stick Virtual analog interaktif (seret/klik mouse atau trackpad di laptop/PC maupun multi-sentuh di layar sentuh, lengkap dengan cerminan gerak `WASD`/Panah dan tombol toggle `V`) beserta tombol Serang, 3 Skill, Ultimate, Pulang (`B`), dan Pemulihan (`G`).
4. **Mekanik Pertempuran**: Serangan jarak dekat/jauh, tabrakan proyektil, perisai, penyembuhan, efek area (*AoE*), konsumsi Mana, cooldown skill, target lock-on, dan proteksi aggro menara.
5. **Bot AI Lokal Cerdas**: *Finite-State Machine* (`LANE`, `COMBAT`, `PUSH_TOWER`, `RETREAT`, `HEAL_BASE`, `ASSIST`) tanpa ketergantungan API eksternal.
6. **Optimasi Performa**: *Object pooling* untuk proyektil, minion, teks damage melayang, dan partikel cahaya, serta opsi kualitas grafis (`Ringan`, `Sedang`, `Tinggi`).
7. **Estetika Islami Beretika**: Potret karakter manusia realistis berpakaian sopan nan megah di lobi & koleksi pahlawan, arsitektur istana marmer & taman zamrud, tanpa penggambaran sosok suci, tanpa ayat suci sebagai mantra tempur, dan tanpa kekerasan grafis (pahlawan gugur terurai menjadi partikel cahaya).
8. **Fitur Edukasi & Akhlak**: Kuis Islami interaktif dengan penjelasan dan ulasan, Misi Harian, serta Pesan Cepat/Emote positif dalam arena (`Terima Kasih!`, `Sabar, Tetap Tenang!`, `Bagus Sekali!`, `Ayo Bersatu!`, `Mohon Bantuan!`, `Tetap Semangat!`).
9. **Skalabilitas Multipemain & Akun**: Server Express + WebSocket (`/ws`) untuk pertandingan daring lintas dunia, WebRTC peer-to-peer untuk kamera & mikrofon, serta autentikasi akun berbasis nama, email, dan password dengan sinkronisasi progres ke server.

---

## Arsitektur Proyek

- `src/types/game.ts`: Definisi tipe data pahlawan, item, kuis, pesan cepat, HUD snapshot, akun pengguna, papan peringkat, ruang online, dan input bridge.
- `convex/`: Skema database Convex (`schema.ts`), data awal (`seedData.ts`), query/mutasi katalog & leaderboard (`catalog.ts`), fungsi internal akun (`accountsDb.ts`), dan aksi autentikasi Node.js terenkripsi `scrypt` (`authActions.ts`).
- `src/services/convexClient.ts` & `src/services/gameCatalog.ts`: Klien Convex reaktif untuk menyinkronkan data **7 pahlawan**, **8 artefak item**, **12 soal kuis**, **6 pesan cepat**, dan **papan peringkat global** dari database Convex.
- `src/game/ArenaConfig.ts`: Konfigurasi peta `2800x2800`, 3 jalur, 14 struktur, 2 Penjaga Kristal netral, dan rintangan taman/pilar.
- `src/game/TextureGenerator.ts`: Generator tekstur prosedural Phaser 3 untuk seluruh entitas & proyektil.
- `src/game/BattleScene.ts`: Mesin simulasi MOBA Phaser 3, pooling, AI bot FSM, pertempuran, gelembung pesan cepat, dan sinkronisasi host/klien daring.
- `server.ts`: Server Express + WebSocket (`/ws`) untuk ruang pertandingan global, matchmaking cepat, relai input/state real-time, signaling WebRTC kamera/mikrofon, dan fallback autentikasi/leaderboard lokal.
- `src/network/MatchTransport.ts`: Kontrak `IMatchTransport` dan `LocalBotTransport` untuk simulasi offline & antrean perintah.
- `src/network/OnlineRoomClient.ts` & `src/network/WebRTCManager.ts`: Klien WebSocket multipemain dunia dan manajer WebRTC peer-to-peer kamera/mikrofon + deteksi bicara.
- `src/components/`: `AuthModal.tsx`, `Lobby.tsx`, `LobbyModals.tsx` (termasuk `LeaderboardModal`), `OnlineLobbyModal.tsx`, `VoiceVideoStrip.tsx`, `BattleArena.tsx`, `GameHUD.tsx`, `MobileControls.tsx`, `HeroAvatar.tsx`, `GeometricOrnament.tsx`.
- `src/services/`: `authClient.ts` (autentikasi ke Convex/server & token di memori), `storage.ts` (LocalStorage), dan `sound.ts` (Web Audio API synthesizer & suara alam).

---

## Checklist Pengembangan & Status Implementasi

### Fase 1 — Prototipe Pertempuran Inti
- [x] Kanvas Phaser 3 terisolasi dari re-render React dengan delta-time clamp
- [x] Pahlawan dapat digerakkan dengan Joystick Virtual Mobile dan keyboard `WASD`/Panah
- [x] Sistem serangan dasar, proyektil, HP/Mana, perisai, dan kebangkitan (*respawn*) di markas
- [x] Gelombang minion otomatis, menara pertahanan, dan kondisi Menang/Kalah melalui Inti Cahaya

### Fase 2 — Ekspansi 3 Jalur, Pahlawan, & 5 vs 5
- [x] 7 pahlawan unik dengan potret manusia realistis dan masing-masing 4 skill aktif (28 skill total: termasuk **Pangeran Mumtaz** dan **Putri Aina**)
- [x] Peta 3 jalur (Atas, Tengah, Bawah), sungai diagonal, 3 jembatan, mata air pemulih, dan 2 Penjaga Kristal netral
- [x] Simulasi penuh 5 vs 5 (1 pemain + 4 bot sekutu vs 5 bot lawan) dan Mode Latihan
- [x] Bot AI FSM (`LANE`, `COMBAT`, `PUSH_TOWER`, `RETREAT`, `HEAL_BASE`, `ASSIST`) dengan penghindaran rintangan & pembelian item otomatis
- [x] Seleksi target (*tap/click lock-on*) dengan retikel emas dan sistem proteksi aggro menara terhadap penyerang sekutu

### Fase 3 — Lobi, Toko Item, Edukasi, & Poles UX
- [x] Lobi utama berlatar istana fantasi dengan pratinjau pahlawan, level, XP, Emas, dan tombol Layar Penuh
- [x] Koleksi Pahlawan, Misi Harian, Riwayat Pertempuran, Pengaturan Audio/Grafis, dan penyimpanan `LocalStorage`
- [x] Toko Artefak Cahaya dalam pertandingan (8 item) dan Papan Skor langsung
- [x] Kuis Islami interaktif (skor, penjelasan, mode ulasan, hadiah terpisah dari kekuatan tempur)
- [x] Sistem Pesan Cepat & Emote positif dalam arena beserta gelembung ucapan di atas pahlawan dan balasan bot sekutu
- [x] Tutorial awal bagi pemain baru dan synthesizer audio prosedural Web Audio API

### Fase 4 — Optimasi Performa, Multipemain Dunia, & Akun
- [x] *Object pooling* untuk proyektil, minion, teks damage melayang, dan partikel cahaya
- [x] Pengaturan kualitas grafis (`Ringan`, `Sedang`, `Tinggi`)
- [x] Abstraksi perintah deterministik `IMatchTransport` (`LocalBotTransport`) untuk kesiapan relai jaringan
- [x] Server relai WebSocket multipemain daring (*online PvP matchmaking*, ruang publik/kode undangan, & obrolan)
- [x] Komunikasi Kamera & Mikrofon langsung WebRTC peer-to-peer di lobi online & arena pertempuran
- [x] Sistem Login & Pendaftaran Akun (Nama, Email, & Password ter-hash `scrypt` di Convex/server) beserta sinkronisasi progres akun
- [x] Papan peringkat global persisten (*global leaderboard* di Convex)

---

## Perintah Pengembangan

```bash
npm run dev      # Menjalankan server Express + WebSocket + Vite pada port 3000
npm run lint     # Pemeriksaan tipe TypeScript (tsc --noEmit)
npm run build    # Kompilasi produksi Vite ke folder dist/
npm start        # Menjalankan server produksi Node.js (server.ts)
npx tsx src/tests/verifyGameSystems.ts  # Uji integritas sistem & logika gim
```

---

## Integrasi Convex & Deployment Vercel

Proyek ini sudah terintegrasi dengan database **Convex** (`/convex`) dan konfigurasi **Vercel** (`vercel.json`) untuk build Vite SPA (`dist/`), dukungan `Permissions-Policy` (`camera=(self), microphone=(self), fullscreen=(self)`), serta dukungan CORS dan WebSocket tervalidasi untuk origin Vercel (`https://nur-legends-git-main-elsyarif2021s-projects.vercel.app`).

1. **Konfigurasi Database Convex & Vercel**:
   - Di **Vercel Project Settings -> Environment Variables**, tambahkan:
     - `VITE_CONVEX_URL` = URL deployment Convex Anda (contoh: `https://pleasant-squid-36.convex.cloud`)
     - `CONVEX_DEPLOY_KEY` = Deploy key produksi Convex (disimpan hanya di Environment Variables server/CI, tidak pernah di kode klien)
   - Dengan `VITE_CONVEX_URL`, fitur **Login/Daftar Akun, Sinkronisasi Progres, Katalog Pahlawan/Item/Kuis/Pesan Cepat, dan Papan Peringkat Global** berjalan langsung ke Convex tanpa server backend tambahan.
2. **Konfigurasi WebSocket Multipemain `/ws` (Opsional untuk PvP Dunia)**:
   - Jalankan `server.ts` pada host Node.js persisten (misalnya Cloud Run, Railway, Render, atau Fly.io) dengan `ALLOWED_ORIGINS="https://nur-legends-git-main-elsyarif2021s-projects.vercel.app"`, lalu tambahkan `VITE_WS_URL` (`wss://.../ws`) di Environment Variables Vercel.
   - Jika dijalankan tanpa server WebSocket eksternal, mode **5 vs 5 Bot** dan **Mode Latihan** tetap berfungsi penuh di browser.
