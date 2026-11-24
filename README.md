# NUR LEGENDS: GUARDIANS OF LIGHT

Gim strategi aksi MOBA **5 vs 5** bertema peradaban fantasi bernuansa Islami dalam **Bahasa Indonesia**, dirancang ramah keluarga untuk perangkat seluler (layar sentuh) dan desktop web.

---

## Pilar Desain & Etika Permainan

1. **Alur Permainan Fungsional**: Pertandingan real-time dengan penghancuran menara pertahanan dan Inti Cahaya lawan sebagai kondisi kemenangan.
2. **Mesin Gim Stabil**: Phaser 3 + React + TypeScript dengan loop berbasis *delta-time* terklamp (`<= 50ms`) dan isolasi siklus hidup kanvas.
3. **Kontrol Sentuh Mobile & Desktop**: Joystick virtual mengambang multi-sentuh simultan dengan tombol Serang, 3 Skill, Ultimate, Pulang (`B`), dan Pemulihan (`G`).
4. **Mekanik Pertempuran**: Serangan jarak dekat/jauh, tabrakan proyektil, perisai, penyembuhan, efek area (*AoE*), konsumsi Mana, cooldown skill, target lock-on, dan proteksi aggro menara.
5. **Bot AI Lokal Cerdas**: *Finite-State Machine* (`LANE`, `COMBAT`, `PUSH_TOWER`, `RETREAT`, `HEAL_BASE`, `ASSIST`) tanpa ketergantungan API eksternal.
6. **Optimasi Performa**: *Object pooling* untuk proyektil, minion, teks damage melayang, dan partikel cahaya, serta opsi kualitas grafis (`Ringan`, `Sedang`, `Tinggi`).
7. **Estetika Islami Beretika**: Karakter bergaya fantasi tanpa wajah (*stylized faceless*), arsitektur istana marmer & taman zamrud, tanpa penggambaran sosok suci, tanpa ayat suci sebagai mantra tempur, dan tanpa kekerasan grafis (pahlawan gugur terurai menjadi partikel cahaya).
8. **Fitur Edukasi & Akhlak**: Kuis Islami interaktif dengan penjelasan dan ulasan, Misi Harian, serta Pesan Cepat/Emote positif dalam arena (`Terima Kasih!`, `Sabar, Tetap Tenang!`, `Bagus Sekali!`, `Ayo Bersatu!`, `Mohon Bantuan!`, `Tetap Semangat!`).
9. **Skalabilitas Multipemain**: Abstraksi `IMatchTransport` dan antrean `MatchCommand` untuk mendukung relai WebSocket/WebRTC di fase berikutnya.

---

## Arsitektur Proyek

- `src/types/game.ts`: Definisi tipe data pahlawan, item, kuis, pesan cepat, HUD snapshot, dan input bridge.
- `src/data/heroes.ts`: 5 pahlawan unik (**Amin**, **Faris**, **Hakim**, **Zahra**, **Zaid**) beserta statistik dan 20 skill.
- `src/data/items.ts`: 8 artefak Toko Item dalam pertandingan.
- `src/data/quiz.ts`: 12 soal Kuis Akhlak, Adab, dan Pengetahuan Islam beserta penjelasan.
- `src/data/quickChat.ts`: 6 pesan cepat positif & nilai moral.
- `src/game/ArenaConfig.ts`: Konfigurasi peta `2800x2800`, 3 jalur, 14 struktur, 2 Penjaga Kristal netral, dan rintangan taman/pilar.
- `src/game/TextureGenerator.ts`: Generator tekstur prosedural Phaser 3 untuk seluruh entitas & proyektil.
- `src/game/BattleScene.ts`: Mesin simulasi MOBA Phaser 3, pooling, AI bot FSM, pertempuran, dan gelembung pesan cepat.
- `src/network/MatchTransport.ts`: Kontrak `IMatchTransport` dan `LocalBotTransport` untuk skalabilitas multipemain.
- `src/components/`: `Lobby.tsx`, `LobbyModals.tsx`, `BattleArena.tsx`, `GameHUD.tsx`, `MobileControls.tsx`, `HeroAvatar.tsx`, `GeometricOrnament.tsx`.
- `src/services/`: `storage.ts` (LocalStorage) dan `sound.ts` (Web Audio API synthesizer & suara alam).

---

## Checklist Pengembangan & Status Implementasi

### Fase 1 — Prototipe Pertempuran Inti
- [x] Kanvas Phaser 3 terisolasi dari re-render React dengan delta-time clamp
- [x] Pahlawan dapat digerakkan dengan Joystick Virtual Mobile dan keyboard `WASD`/Panah
- [x] Sistem serangan dasar, proyektil, HP/Mana, perisai, dan kebangkitan (*respawn*) di markas
- [x] Gelombang minion otomatis, menara pertahanan, dan kondisi Menang/Kalah melalui Inti Cahaya

### Fase 2 — Ekspansi 3 Jalur, 5 Pahlawan, & 5 vs 5
- [x] 5 pahlawan unik bergaya fantasi tanpa wajah dengan masing-masing 4 skill aktif (20 skill total)
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

### Fase 4 — Optimasi Performa & Skalabilitas Multipemain
- [x] *Object pooling* untuk proyektil, minion, teks damage melayang, dan partikel cahaya
- [x] Pengaturan kualitas grafis (`Ringan`, `Sedang`, `Tinggi`)
- [x] Abstraksi perintah deterministik `IMatchTransport` (`LocalBotTransport`) untuk kesiapan relai jaringan
- [ ] Server relai WebSocket multipemain daring (*online PvP matchmaking*)
- [ ] Sinkronisasi akun jarak jauh & papan peringkat global

---

## Perintah Pengembangan

```bash
npm run dev      # Menjalankan server pengembangan Vite pada port 3000
npm run lint     # Pemeriksaan tipe TypeScript (tsc --noEmit)
npm run build    # Kompilasi produksi Vite
npx tsx src/tests/verifyGameSystems.ts  # Uji integritas sistem & logika gim
```
