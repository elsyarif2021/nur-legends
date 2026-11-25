import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, Volume2, VolumeX } from 'lucide-react';
import { OnlinePlayerInfo } from '../types/game';
import { MediaSnapshot, webrtcManager } from '../network/WebRTCManager';
import { HeroAvatar } from './HeroAvatar';

interface StreamVideoProps {
  stream: MediaStream | null;
  muted: boolean;
  mirrored?: boolean;
  volume?: number;
  className?: string;
}

export const StreamVideo: React.FC<StreamVideoProps> = ({
  stream,
  muted,
  mirrored = false,
  volume = 1,
  className = '',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.srcObject !== stream) {
      el.srcObject = stream;
    }
    if (stream) {
      el.play().catch(() => {
        // Autoplay handled silently
      });
    }
  }, [stream]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = volume;
  }, [volume]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className={`${mirrored ? '-scale-x-100' : ''} ${className}`}
    />
  );
};

interface VoiceVideoStripProps {
  players: OnlinePlayerInfo[];
  localPlayerId: string | null;
  media: MediaSnapshot;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const VoiceVideoStrip: React.FC<VoiceVideoStripProps> = ({
  players,
  localPlayerId,
  media,
  collapsed = false,
  onToggleCollapse,
}) => {
  if (players.length === 0) return null;

  return (
    <div className="pointer-events-auto flex flex-col items-end gap-1.5">
      {onToggleCollapse && (
        <button
          type="button"
          onClick={onToggleCollapse}
          className="px-2.5 py-1 rounded-md bg-[#081523]/90 border border-[#d4af37]/40 text-[10px] font-bold text-[#fbbf24] hover:bg-[#10233a]"
        >
          {collapsed ? `Kamera & Suara (${players.length})` : 'Sembunyikan Video'}
        </button>
      )}

      <div className={collapsed ? 'hidden' : 'flex flex-col gap-1.5 max-h-[46vh] overflow-y-auto custom-scroll pr-0.5'}>
          {players.map((p) => {
            const isLocal = p.id === localPlayerId;
            const stream = isLocal
              ? media.localStream
              : media.remoteStreams[p.id] || null;
            const hasVideo =
              isLocal
                ? media.camOn && Boolean(stream && stream.getVideoTracks().length > 0)
                : p.camOn && Boolean(stream && stream.getVideoTracks().length > 0);
            const hasAudioTrack = Boolean(stream && stream.getAudioTracks().length > 0);
            const isMicOn = isLocal ? media.micOn : p.micOn;
            const isSpeaking = Boolean(media.speakingIds[isLocal ? 'local' : p.id]);

            return (
              <div
                key={p.id}
                className={`relative w-24 sm:w-28 rounded-lg overflow-hidden bg-[#081523]/92 border transition-colors shadow-lg ${
                  isSpeaking
                    ? 'border-emerald-400 ring-2 ring-emerald-400/50'
                    : p.team === 'blue'
                    ? 'border-sky-400/45'
                    : 'border-rose-400/45'
                }`}
              >
                <div className="relative h-16 sm:h-20 w-full bg-slate-950 flex items-center justify-center overflow-hidden">
                  {hasVideo && stream ? (
                    <StreamVideo
                      stream={stream}
                      muted={isLocal || !media.speakerOn}
                      volume={media.speakerVolume}
                      mirrored={isLocal}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <>
                      <HeroAvatar heroId={p.heroId} size="sm" />
                      {/* Keep audio playing cleanly even when camera is off */}
                      {!isLocal && hasAudioTrack && stream && (
                        <StreamVideo
                          stream={stream}
                          muted={!media.speakerOn}
                          volume={media.speakerVolume}
                          className="w-px h-px opacity-0 pointer-events-none absolute"
                        />
                      )}
                    </>
                  )}

                  {/* Top-right mic/cam indicators */}
                  <div className="absolute top-1 right-1 flex items-center gap-1">
                    <span
                      className={`p-0.5 rounded bg-black/70 ${
                        isMicOn ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isMicOn ? <Mic className="w-2.5 h-2.5" /> : <MicOff className="w-2.5 h-2.5" />}
                    </span>
                    <span
                      className={`p-0.5 rounded bg-black/70 ${
                        hasVideo ? 'text-sky-300' : 'text-slate-500'
                      }`}
                    >
                      {hasVideo ? <Video className="w-2.5 h-2.5" /> : <VideoOff className="w-2.5 h-2.5" />}
                    </span>
                  </div>
                </div>

                <div className="px-1.5 py-0.5 flex items-center justify-between gap-1 bg-[#06101c]">
                  <span className="text-[10px] font-semibold text-white truncate">
                    {isLocal ? 'Anda' : p.name}
                  </span>
                  <span
                    className={`text-[9px] font-bold ${
                      p.team === 'blue' ? 'text-sky-400' : 'text-rose-400'
                    }`}
                  >
                    {p.team === 'blue' ? 'B' : 'M'}
                  </span>
                </div>
              </div>
            );
          })}
      </div>

      {/* Quick media action strip */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => void webrtcManager.toggleCamera()}
          className={`px-2 py-1 rounded-md border text-[10px] font-bold flex items-center gap-1 ${
            media.camOn
              ? 'bg-sky-600/30 border-sky-400 text-sky-200'
              : 'bg-[#081523]/90 border-slate-700 text-slate-300'
          }`}
          title="Kamera (C)"
        >
          {media.camOn ? <Video className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
          <span>Kam</span>
        </button>
        <button
          type="button"
          onClick={() => void webrtcManager.toggleMicrophone()}
          className={`px-2 py-1 rounded-md border text-[10px] font-bold flex items-center gap-1 ${
            media.micOn
              ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200'
              : 'bg-[#081523]/90 border-slate-700 text-slate-300'
          }`}
          title="Mikrofon (M)"
        >
          {media.micOn ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
          <span>Mik</span>
        </button>
        <button
          type="button"
          aria-label="Speaker suara pemain"
          aria-pressed={media.speakerOn}
          onClick={() => webrtcManager.setSpeakerEnabled(!media.speakerOn)}
          className="flex items-center gap-1 rounded-md border border-slate-700 bg-[#081523]/90 px-2 py-1 text-[10px] font-bold text-slate-200"
        >
          {media.speakerOn ? <Volume2 aria-hidden="true" className="size-3" /> : <VolumeX aria-hidden="true" className="size-3" />}
          Speaker
        </button>
      </div>
    </div>
  );
};
