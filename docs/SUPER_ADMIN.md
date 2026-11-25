# Super Admin

Verifikasi identitas administrator melalui kanal tepercaya, lalu ambil ID akun yang sudah terdaftar dari dashboard Convex (tabel `accounts`, kolom `_id`). Untuk server Express tanpa Convex, ambil `id` akun dari penyimpanan akun server. Saat memakai Convex, gunakan ID dari deployment yang sama dengan frontend.

Atur variabel berikut di backend Express (misalnya Railway).

- `SUPER_ADMIN_ACCOUNT_IDS` berisi daftar ID akun yang diizinkan, dipisahkan dengan koma.
- `CONVEX_URL` menunjuk deployment Convex produksi jika frontend memakai autentikasi Convex.

Konfigurasi lama `SUPER_ADMIN_EMAILS` harus diganti dengan daftar ID sebelum backend baru diterapkan. Jika daftar ID kosong, dashboard menolak akses. Pengaturan ini hanya berada di backend.

Deploy ulang backend. Setelah masuk, akun yang diizinkan akan melihat tombol **Super Admin**. Dashboard hanya menampilkan data pemantauan. Periksa bahwa permintaan tanpa sesi dan sesi pemain biasa mendapatkan 403, sementara sesi yang diizinkan mendapatkan 200.
