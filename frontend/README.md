# ⚡ TeamSync AI — Real-Time Collaborative Workspace & AI Sprint Planner

Modern yazılım ekipleri için geliştirilmiş; **gerçek zamanlı kanal iletişimi (Socket.io)**, **sürükle-bırak Kanban görev panosu**, **canlı ortak doküman/kod editörü** ve **Google Gemini AI destekli sprint otomasyonunu** tek bir çatı altında birleştiren Full-Stack SaaS uygulaması.

## 🚀 Öne Çıkan Mühendislik Özellikleri

- **Olay Güdümlü (Event-Driven) Mimari:** Socket.io odaları (`join_room`) ile izole edilmiş çoklu kanal iletişimi, canlı anketler (`/poll`) ve gerçek zamanlı görev senkronizasyonu.
- **İşlevsel AI Otomasyonu (Gemini 2.5 Flash):**
  - `/plan [konu]` komutuyla bir özelliği otomatik alt görevlere bölüp doğrudan Kanban panosuna (`To Do`) kart olarak ekleme.
  - `/task [başlık]` ile sohbet içinden anında görev ve alt kontrol listesi (subtasks) üretme.
  - `/ai [soru]` ile teknik mimari ve kod bloğu desteği.
- **Debounced Ortak Doküman & Wiki Editörü:** Anlık WebSocket yayını yaparken veritabanı (MongoDB) yazma işlemlerini **800ms Debounce** ile optimize ederek gereksiz sorgu yükünü önler.
- **Sıfır Ağır Bağımlılık (Vanilla Web APIs):** Native HTML5 Drag & Drop, Web Speech API (Sesli Komut) ve yerleşik Clipboard API kullanımı.
- **İK & Teknik Lider Demo Modu:** Kayıt/Giriş engeli olmadan sol menüden tek tıkla rol değiştirerek (`Tech Lead`, `Frontend Dev`, `Backend Dev`) çok kullanıcılı senaryoları anında test etme imkanı.

## 🛠️ Teknoloji Yığını (Tech Stack)

- **Frontend:** React 19, Vite, Tailwind CSS v4, Socket.io-Client
- **Backend:** Node.js, Express.js, Socket.io, Mongoose (MongoDB Atlas)
- **AI Entegrasyonu:** Google Generative AI SDK (`@google/generative-ai`)

## 📦 Kurulum ve Çalıştırma

```bash
# 1. Backend Kurulumu
cd backend
npm install
# .env dosyasına MONGO_URI ve GEMINI_API_KEY ekleyin
npm run dev

# 2. Frontend Kurulumu
cd frontend
npm install
npm run dev