import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Globe,
  Mic,
  MicOff,
  Play,
  Plus,
  RefreshCw,
  Send,
  Users,
  Video,
  VideoOff,
  X,
} from 'lucide-react';
import { onlineClient, OnlineConnectionStatus } from '../network/OnlineRoomClient';
import { MediaSnapshot, webrtcManager } from '../network/WebRTCManager';
import { HEROES, HERO_LIST } from '../services/gameCatalog';
import { soundEngine } from '../services/sound';
import {
  HeroId,
  OnlineChatMessage,
  OnlineRoomState,
  OnlineRoomSummary,
} from '../types/game';
import { StarEmblem } from './GeometricOrnament';
import { HeroAvatar } from './HeroAvatar';
import { StreamVideo } from './VoiceVideoStrip';

interface OnlineLobbyModalProps {
  playerName: string;
  selectedHeroId: HeroId;
  initialRoomCode?: string | null;
  onChangePlayerName: (name: string) => void;
  onSelectHero: (heroId: HeroId) => void;
  onMatchStart: (room: OnlineRoomState, localPlayerId: string) => void;
  onClose: () => void;
}

export const OnlineLobbyModal: React.FC<OnlineLobbyModalProps> = ({
  playerName,
  selectedHeroId,
  initialRoomCode,
  onChangePlayerName,
  onSelectHero,
  onMatchStart,
  onClose,
}) => {
  const [status, setStatus] = useState<OnlineConnectionStatus>(() => onlineClient.getStatus());
  const [playerId, setPlayerId] = useState<string | null>(() => onlineClient.getPlayerId());
  const [rooms, setRooms] = useState<OnlineRoomSummary[]>(() => onlineClient.getRoomList());
  const [room, setRoom] = useState<OnlineRoomState | null>(() => onlineClient.getRoom());
  const [media, setMedia] = useState<MediaSnapshot>(() => webrtcManager.getSnapshot());
  const [chatLog, setChatLog] = useState<OnlineChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [joinCode, setJoinCode] = useState(initialRoomCode || '');
  const [newRoomName, setNewRoomName] = useState(`Arena ${playerName}`);
  const [isPublic, setIsPublic] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);

  useEffect(() => {
    webrtcManager.bindRoomSignaling();
    onlineClient.connect();

    const unsubNet = onlineClient.subscribe({
      onStatusChange: (s) => setStatus(s),
      onWelcome: (id) => {
        setPlayerId(id);
        if (initialRoomCode) {
          onlineClient.joinRoom({
            code: initialRoomCode,
            playerName,
            heroId: selectedHeroId,
            camOn: webrtcManager.getSnapshot().camOn,
            micOn: webrtcManager.getSnapshot().micOn,
          });
        }
      },
      onRoomList: (list) => setRooms(list),
      onRoomState: (nextRoom) => {
        setRoom(nextRoom);
        setErrorMsg(null);
      },
      onRoomChat: (msg) => {
        setChatLog((prev) => [...prev.slice(-29), msg]);
      },
      onError: (err) => setErrorMsg(err),
      onRoomStarted: (startedRoom) => {
        const myId = onlineClient.getPlayerId();
        if (myId) {
          onMatchStart(startedRoom, myId);
        }
      },
    });

    const unsubMedia = webrtcManager.subscribe((snap) => setMedia(snap));

    return () => {
      unsubNet();
      unsubMedia();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedNotice(label);
      setTimeout(() => setCopiedNotice(null), 2000);
    } catch {
      setCopiedNotice('Salin manual dari layar');
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    onlineClient.sendRoomChat(trimmed);
    setChatInput('');
  };

  const myMember = room?.players.find((p) => p.id === playerId) || null;
  const isHost = Boolean(room && playerId && room.hostId === playerId);

  const bluePlayers = room ? room.players.filter((p) => p.team === 'blue') : [];
  const redPlayers = room ? room.players.filter((p) => p.team === 'red') : [];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-6">
      <div className="ornate-panel w-full max-w-5xl rounded-2xl p-4 sm:p-6 max-h-[92vh] flex flex-col gap-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d4af37]/25 pb-3">
          <div className="flex items-center gap-2.5">
            <StarEmblem className="w-7 h-7" />
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold text-[#fbbf24]">
                Arena Online Dunia (PvP Global)
              </h2>
              <div className="text-xs text-slate-300 flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-teal-300" />
                <span>
                  {status === 'connected'
                    ? 'Terhubung ke Server Multipemain Global'
                    : status === 'connecting'
                    ? 'Menyambungkan ke server...'
                    : 'Koneksi terputus'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Local Camera & Mic Quick Controls */}
            <button
              type="button"
              onClick={() => void webrtcManager.toggleCamera()}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-colors ${
                media.camOn
                  ? 'bg-sky-600/25 border-sky-400 text-sky-200'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
            >
              {media.camOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
              <span>{media.camOn ? 'Kamera Aktif' : 'Kamera Mati'}</span>
            </button>

            <button
              type="button"
              onClick={() => void webrtcManager.toggleMicrophone()}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-colors ${
                media.micOn
                  ? 'bg-emerald-600/25 border-emerald-400 text-emerald-200'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
            >
              {media.micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              <span>{media.micOn ? 'Mikrofon Aktif' : 'Mikrofon Mati'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                if (room) onlineClient.leaveRoom();
                webrtcManager.stopLocalMedia();
                onClose();
              }}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {(errorMsg || media.error) && (
          <div className="px-3.5 py-2 rounded-xl bg-rose-950/70 border border-rose-500/50 text-xs text-rose-200">
            {errorMsg || media.error}
          </div>
        )}

        {status === 'disconnected' && !errorMsg && (
          <div className="px-3.5 py-2 rounded-xl bg-amber-950/70 border border-amber-500/45 text-xs text-amber-200">
            Belum terhubung ke server WebSocket multipemain. Jika aplikasi dijalankan di Vercel statis, pastikan variabel{' '}
            <code className="font-mono-num text-amber-100">VITE_WS_URL</code> /{' '}
            <code className="font-mono-num text-amber-100">VITE_API_URL</code> mengarah ke server backend Node.js Anda. Mode offline{' '}
            <strong>5 vs 5</strong> dan <strong>Latihan</strong> tetap dapat dimainkan sepenuhnya.
          </div>
        )}

        {/* MAIN BODY */}
        {!room ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-y-auto custom-scroll pr-1">
            {/* Left Column: Profile + Camera Preview + Quick Match + Create/Join */}
            <div className="lg:col-span-5 flex flex-col gap-3">
              {/* Nickname & Camera/Mic Studio Preview */}
              <div className="p-3.5 rounded-xl bg-slate-900/75 border border-slate-800 space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`relative w-24 h-20 rounded-xl overflow-hidden bg-slate-950 border flex items-center justify-center shrink-0 ${
                      media.speakingIds['local']
                        ? 'border-emerald-400 ring-2 ring-emerald-400/50'
                        : 'border-[#d4af37]/40'
                    }`}
                  >
                    {media.camOn && media.localStream && media.localStream.getVideoTracks().length > 0 ? (
                      <StreamVideo
                        stream={media.localStream}
                        muted
                        mirrored
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <HeroAvatar heroId={selectedHeroId} size="md" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <label className="block text-[11px] font-semibold text-slate-300">
                      Nama Pemain Online
                    </label>
                    <input
                      type="text"
                      maxLength={20}
                      value={playerName}
                      onChange={(e) => onChangePlayerName(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                      placeholder="Nama Anda"
                    />
                    <div className="text-[11px] text-teal-300 truncate">
                      Pahlawan: {HEROES[selectedHeroId].name}
                    </div>
                  </div>
                </div>

                {/* Quick Match Global CTA */}
                <button
                  type="button"
                  disabled={status !== 'connected'}
                  onClick={() => {
                    soundEngine.playSkill(true);
                    onlineClient.quickMatch({
                      playerName,
                      heroId: selectedHeroId,
                      camOn: media.camOn,
                      micOn: media.micOn,
                    });
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg"
                >
                  <Globe className="w-4 h-4" />
                  Cari Pertandingan Global (Cepat)
                </button>
              </div>

              {/* Create Room */}
              <div className="p-3.5 rounded-xl bg-slate-900/75 border border-slate-800 space-y-2.5">
                <div className="text-xs font-bold text-[#fbbf24]">Buat Ruang Pertandingan Baru</div>
                <input
                  type="text"
                  maxLength={32}
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                  placeholder="Nama Ruang..."
                />
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Tipe Ruang</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setIsPublic(true)}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold ${
                        isPublic ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      Publik Dunia
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPublic(false)}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold ${
                        !isPublic ? 'bg-[#d4af37] text-[#07111e]' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      Privat (Kode)
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={status !== 'connected'}
                  onClick={() => {
                    soundEngine.playClick();
                    onlineClient.createRoom({
                      playerName,
                      roomName: newRoomName,
                      heroId: selectedHeroId,
                      isPublic,
                      camOn: media.camOn,
                      micOn: media.micOn,
                    });
                  }}
                  className="w-full py-2 rounded-lg bg-[#d4af37] hover:bg-[#eab308] disabled:opacity-50 text-[#07111e] font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Buat Ruang Online
                </button>
              </div>

              {/* Join by Code */}
              <div className="p-3.5 rounded-xl bg-slate-900/75 border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-200">Gabung dengan Kode Ruang</div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={8}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 font-mono-num text-xs text-white uppercase tracking-widest focus:outline-none focus:border-[#d4af37]"
                    placeholder="CONTOH: NUR84X"
                  />
                  <button
                    type="button"
                    disabled={status !== 'connected' || joinCode.trim().length < 4}
                    onClick={() => {
                      soundEngine.playClick();
                      onlineClient.joinRoom({
                        code: joinCode.trim().toUpperCase(),
                        playerName,
                        heroId: selectedHeroId,
                        camOn: media.camOn,
                        micOn: media.micOn,
                      });
                    }}
                    className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs"
                  >
                    Gabung
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Live Global Public Rooms */}
            <div className="lg:col-span-7 p-4 rounded-xl bg-slate-900/65 border border-slate-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#fbbf24]" />
                  <span className="text-sm font-bold text-white">Daftar Ruang Global Terbuka</span>
                </div>
                <button
                  type="button"
                  onClick={() => onlineClient.refreshRooms()}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Segarkan
                </button>
              </div>

              {rooms.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-10 text-slate-400 text-xs space-y-2">
                  <Globe className="w-8 h-8 text-slate-600" />
                  <p>Belum ada ruang publik terbuka saat ini.</p>
                  <p className="text-slate-500">
                    Klik &quot;Cari Pertandingan Global&quot; atau &quot;Buat Ruang Online&quot; untuk mengundang pemain dari seluruh dunia!
                  </p>
                </div>
              ) : (
                <div className="space-y-2 overflow-y-auto max-h-80 custom-scroll pr-1">
                  {rooms.map((r) => (
                    <div
                      key={r.code}
                      className="p-3 rounded-xl bg-slate-950/75 border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate">{r.name}</div>
                        <div className="text-[11px] text-slate-400">
                          Tuan Rumah: {r.hostName} · Kode: <span className="font-mono-num text-[#fbbf24]">{r.code}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono-num text-xs font-bold text-emerald-300">
                          {r.playerCount}/{r.maxPlayers}
                        </span>
                        <button
                          type="button"
                          disabled={r.status === 'playing' || r.playerCount >= r.maxPlayers}
                          onClick={() => {
                            soundEngine.playClick();
                            onlineClient.joinRoom({
                              code: r.code,
                              playerName,
                              heroId: selectedHeroId,
                              camOn: media.camOn,
                              micOn: media.micOn,
                            });
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-45 text-white font-bold text-xs"
                        >
                          {r.status === 'playing' ? 'Sedang Main' : 'Masuk'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ACTIVE ROOM STAGE */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-y-auto custom-scroll pr-1">
            {/* Room Info & Invite Bar */}
            <div className="lg:col-span-12 flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-900/80 border border-[#d4af37]/30">
              <div>
                <div className="text-sm font-bold text-white">{room.name}</div>
                <div className="text-xs text-slate-400">
                  Kode Ruang: <span className="font-mono-num font-bold text-[#fbbf24]">{room.code}</span> ·{' '}
                  {room.players.length}/{room.maxPlayers} Pemain (Slot kosong otomatis diisi Bot Cerdas)
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {copiedNotice && (
                  <span className="text-xs font-semibold text-emerald-300">{copiedNotice}</span>
                )}
                <button
                  type="button"
                  onClick={() => void handleCopy(room.code, 'Kode disalin!')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" /> Salin Kode
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}?room=${room.code}`;
                    void handleCopy(url, 'Tautan undangan disalin!');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-sky-700/60 hover:bg-sky-600/70 text-xs font-semibold text-sky-100 flex items-center gap-1"
                >
                  <Globe className="w-3.5 h-3.5" /> Salin Tautan Dunia
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onlineClient.leaveRoom();
                    setRoom(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-rose-900/70 hover:bg-rose-800 text-xs font-semibold text-rose-100"
                >
                  Keluar Ruang
                </button>
              </div>
            </div>

            {/* Teams Roster (with live Camera & Mic tiles!) */}
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(
                [
                  { team: 'blue' as const, label: 'Tim Cahaya Biru', list: bluePlayers, border: 'border-sky-500/40', titleColor: 'text-sky-300' },
                  { team: 'red' as const, label: 'Tim Cahaya Merah', list: redPlayers, border: 'border-rose-500/40', titleColor: 'text-rose-300' },
                ] as const
              ).map((col) => (
                <div
                  key={col.team}
                  className={`p-3 rounded-xl bg-slate-900/70 border ${col.border} flex flex-col gap-2`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${col.titleColor}`}>
                      {col.label} ({col.list.length}/5)
                    </span>
                    {myMember && myMember.team !== col.team && col.list.length < 5 && (
                      <button
                        type="button"
                        onClick={() => onlineClient.updateMember({ team: col.team })}
                        className="text-[11px] font-semibold text-[#fbbf24] hover:underline"
                      >
                        Pindah Tim
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    {col.list.map((p) => {
                      const isMe = p.id === playerId;
                      const stream = isMe
                        ? media.localStream
                        : media.remoteStreams[p.id] || null;
                      const showVideo = isMe
                        ? media.camOn && Boolean(stream && stream.getVideoTracks().length > 0)
                        : p.camOn && Boolean(stream && stream.getVideoTracks().length > 0);
                      const isSpeaking = Boolean(media.speakingIds[isMe ? 'local' : p.id]);

                      return (
                        <div
                          key={p.id}
                          className={`p-2 rounded-lg bg-slate-950/80 border flex items-center gap-2.5 ${
                            isSpeaking ? 'border-emerald-400' : 'border-slate-800'
                          }`}
                        >
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center shrink-0">
                            {showVideo && stream ? (
                              <StreamVideo
                                stream={stream}
                                muted={isMe}
                                mirrored={isMe}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <>
                                <HeroAvatar heroId={p.heroId} size="sm" />
                                {!isMe && stream && stream.getAudioTracks().length > 0 && (
                                  <StreamVideo
                                    stream={stream}
                                    muted={false}
                                    className="w-px h-px opacity-0 pointer-events-none absolute"
                                  />
                                )}
                              </>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-white truncate">
                              {p.name} {p.isHost ? '· Tuan Rumah' : ''}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              {HEROES[p.heroId].name} · {p.ready ? 'Siap' : 'Menunggu'}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {p.micOn ? (
                              <Mic className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <MicOff className="w-3.5 h-3.5 text-slate-600" />
                            )}
                            {p.camOn ? (
                              <Video className="w-3.5 h-3.5 text-sky-400" />
                            ) : (
                              <VideoOff className="w-3.5 h-3.5 text-slate-600" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Right Sidebar: Hero Quick Pick + Room Chat + Start Button */}
            <div className="lg:col-span-4 flex flex-col gap-3">
              {/* Hero Selector in Room */}
              <div className="p-3 rounded-xl bg-slate-900/75 border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-[#fbbf24]">Pilih Pahlawan Anda</div>
                <div className="flex flex-wrap gap-1.5">
                  {HERO_LIST.map((h) => {
                    const active = (myMember?.heroId || selectedHeroId) === h.id;
                    return (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          onSelectHero(h.id);
                          onlineClient.updateMember({ heroId: h.id });
                        }}
                        className={`p-1 rounded-lg border transition-colors ${
                          active
                            ? 'bg-[#102944] border-[#fbbf24]'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-600'
                        }`}
                        title={h.name}
                      >
                        <HeroAvatar heroId={h.id} size="sm" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Room Chat */}
              <div className="flex-1 p-3 rounded-xl bg-slate-900/75 border border-slate-800 flex flex-col gap-2 min-h-[160px]">
                <div className="text-xs font-bold text-slate-200">Obrolan Ruang</div>
                <div className="flex-1 overflow-y-auto max-h-36 space-y-1 text-xs custom-scroll">
                  {chatLog.length === 0 ? (
                    <div className="text-slate-500 text-[11px]">
                      Sapa rekan setim Anda atau aktifkan kamera & mikrofon di atas!
                    </div>
                  ) : (
                    chatLog.map((c) => (
                      <div key={c.id} className="text-slate-200 leading-snug">
                        <span className="font-bold text-[#fbbf24]">{c.senderName}: </span>
                        <span>{c.text}</span>
                      </div>
                    ))
                  )}
                </div>
                <form onSubmit={handleSendChat} className="flex gap-1.5">
                  <input
                    type="text"
                    maxLength={160}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Tulis pesan..."
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white"
                    aria-label="Kirim Pesan"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>

              {/* Start / Ready Button */}
              {isHost ? (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playSkill(true);
                    onlineClient.startMatch();
                  }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#d97706] hover:brightness-110 text-[#07111e] font-display font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl"
                >
                  <Play className="w-4 h-4" /> MULAI PERTANDINGAN ONLINE
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    onlineClient.updateMember({ ready: !(myMember?.ready ?? false) })
                  }
                  className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 ${
                    myMember?.ready
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  {myMember?.ready ? 'Siap Bertarung (Menunggu Host)' : 'Tandai Siap'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
