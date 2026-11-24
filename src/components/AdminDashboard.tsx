import React, { useEffect, useState } from 'react';
import { authClient, type AdminOverview } from '../services/authClient';
export function AdminDashboard({onClose}:{onClose:()=>void}) {
 const [data,setData]=useState<AdminOverview|null>(null);
 const [status,setStatus]=useState('Memeriksa akses...');
 useEffect(()=>{
   const controller=new AbortController();
   let busy=false;
   const load=async()=>{
     if(busy||controller.signal.aborted)return;
     busy=true;
     try { const result=await authClient.getAdminOverview(controller.signal); if(controller.signal.aborted)return; setData(result);setStatus(result?'':'Akses admin tidak tersedia.'); }
     catch { if(!controller.signal.aborted){setData(null);setStatus('Gagal menghubungi backend admin.');} }
     finally {busy=false;}
   };
   void load();const timer=window.setInterval(load,5000);
   return ()=>{controller.abort();window.clearInterval(timer);};
 },[]);
 return <div role="dialog" aria-modal="true" aria-label="Super Admin" className="fixed inset-0 z-[70] bg-black/85 p-3 flex items-center justify-center">
 <section className="w-full max-w-4xl max-h-[92dvh] overflow-y-auto rounded-2xl border border-amber-500/50 bg-slate-950 text-white p-4 sm:p-6">
 <header className="flex items-center justify-between gap-3 mb-4"><h2 className="text-xl font-bold text-amber-300">Super Admin · NUR LEGENDS</h2><button onClick={onClose} className="min-h-11 px-4 rounded bg-slate-800">Tutup</button></header>
 {status&&<p role="status">{status}</p>}
 {data&&<><p className="text-xs text-slate-400 mb-3">Diperbarui {new Date(data.timestamp).toLocaleTimeString()} · setiap 5 detik · {data.simulation}</p>
 <div className="grid grid-cols-2 md:grid-cols-3 gap-2">{[['Online',data.playersOnline],['Reconnect',data.reconnecting],['Ruang menunggu',data.roomsWaiting],['Pertandingan aktif',data.roomsPlaying],['RAM server (MB)',data.memoryMb],['Uptime (menit)',Math.floor(data.uptimeSec/60)]].map(([label,value])=><div key={label} className="rounded-xl bg-slate-900 border border-slate-700 p-3"><div className="text-xs text-slate-300">{label}</div><strong className="text-2xl text-emerald-300">{value}</strong></div>)}</div>
 <h3 className="font-bold mt-5 mb-2">Ruang pertandingan</h3>
 <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr className="border-b border-slate-700"><th className="p-2">Nama</th><th>Status</th><th>Pemain</th><th>Akses</th></tr></thead><tbody>{data.rooms.map(r=><tr key={r.code} className="border-b border-slate-800"><td className="p-2">{r.name}</td><td>{r.status==='playing'?'Bermain':'Menunggu'}</td><td>{r.playerCount}/{r.maxPlayers}</td><td>{r.isPublic?'Publik':'Privat'}</td></tr>)}</tbody></table>{!data.rooms.length&&<p className="p-3 text-slate-400">Belum ada ruang.</p>}</div>
 </>}
 </section></div>;
}
