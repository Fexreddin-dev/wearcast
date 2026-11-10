Salam Claude. Sən WearCast startapının Baş Texniki Memarı, UI/UX Dizayneri və Full-Stack Developerisən. Bu, əvvəlki söhbətlərin davamıdır. Əvvəl bunları oxu, sonra işə başla:

1. `C:\Users\Asus TUF Gaming\Desktop\WearCast\CLAUDE.md` — məhsul tələbləri (PRD).
2. `C:\Users\Asus TUF Gaming\Desktop\WearCast\PROGRESS.md` — nə hazırdır, nə qalıb (Phase 1, Phase 2, Hero v2 və Hero v3 bölmələri).
3. Memory qovluğundakı `wearcast-decisions.md` — təsdiqlənmiş qərarlar (CLAUDE.md ilə ziddiyyət olarsa, bu qərarlar üstündür).

## Vəziyyət
- **Phase 1 tamamdır:** `WearCast/full/` — Next.js 16 (App Router, TS, Tailwind 4), dizayn tokenləri, EN/AZ/TR (`/en|az|tr`), Dark/Light, Supabase auth, admin qapısı, `supabase/migrations/0001_init.sql` (istifadəçi işə salıb), `.env.local` doldurulub.
- **Phase 2 tamamdır:**
  - 12 baza avatar × 2 bucaq (ön + yan), şəffaf fon — `public/assets/avatars/<id>-{front,side}.{png,webp}` (m1–m3, f1–f3, h1–h2, tb1–tb2, tg1–tg2)
  - 8 demo geyim, şəffaf fon — `public/assets/wardrobe/<id>.{png,webp}` + `manifest.json`
  - Hero: 3 fəsilli kəsilməz kamera filmi (Your Weather → Your Wardrobe → Your Style), Lenis + GSAP ScrollTrigger — `src/components/hero/Hero.tsx`, `film.json`, `layout.mjs`, `public/assets/hero/{film,v2}`. **Hero hazırdır, mən istəməsəm ona toxunma.**
  - Fal skriptləri `full/scripts/fal/` (`lib.mjs` xərc tavanı + `cost_log` + `ledger.json`; `avatars`, `sides`, `cutout`, `garments`, `edit`, `hero*`). Orijinal şəkillər `full/assets-src/` (sayta getmir).
- **Fal.ai büdcəsi:** $10-dan $5.57 xərclənib, ~$4.40 qalıb. Hər try-on (FASHN) $0.075, Kontext $0.04, Kling video $0.35. Pul xərcləyən hər addımdan əvvəl xərc cədvəli göstər və təsdiq al. `lib.mjs`-dəki tavanı yalnız mənim təsdiqimlə qaldır.
- Supabase layihəsi `support.wearcast@gmail.com` hesabındadır, sənin MCP-in başqa hesaba bağlıdır. Supabase-ə heç nə tətbiq etmə, yalnız yeni SQL migration faylları yaz (`supabase/migrations/0002_...sql`), mən SQL Editor-da işə salacağam.
- `.env.local` faylını OXUMA və açarları heç yerdə çap etmə. Lazım olan dəyişənin boş olub-olmadığını məndən soruş. (`GEMINI_API_KEY` və `OPENWEATHER_API_KEY` də doldurulub.)
- Məlum kiçik problem: `src/components/ThemeToggle.tsx`-də Phase 1-dən qalan lint xətası (react-hooks/set-state-in-effect) — fürsət olanda düzəlt.

## İndi: Phase 3 — WARDROBE (3 sütunlu əsas iş ekranı)
CLAUDE.md 4-A bölməsinə uyğun:

1. **Sol sütun — interaktiv şkaf:** kateqoriyalar (`All`, `Jackets & Coats`, `Shirts & Tops`, `Pants & Skirts`, `Dresses`, `Hijab & Headwear`, `Shoes`, `Accessories`), hero-dakı tağlı palıd şkafla eyni dizayn dilində, taxta asılqanlar, isti LED. `+ Add Item`: ön/yan/arxa şəkil yükləmə + material + ölçü (XS–XXL) + kəsim (Slim/Regular/Oversize); serverdə fon silmə (BiRefNet) və studiya görünüşü; şəkillər Supabase Private Storage-də RLS ilə. Plan limitinə görə qarderob yeri yoxlanılsın.
2. **Mərkəzi sütun — podium:** avatar podiumda; geyim seçiləndə birbaşa əynində yaranır; gözləmə zamanı ekran donmur, maneken üzərində zərif blur + "Curating your look..." + skeleton; drag-to-rotate (Front/Side/Back düymələri YOXDUR — hazırda ön və yan bucaq var, arxa bucaq və daha çox bucaq lazımdırsa təklif və xərc göstər); 4K böyüdücü linza; paltar üzərində `X`, sol aşağıda `Active Layers`, `Reset`; toast bildirişlər.
3. **Sağ sütun:** `TODAY'S WEATHER` (OpenWeatherMap, şəhər üzrə səhər/gündüz/axşam temperatur, külək, yağıntı) və `DAILY CURATED LOOK` (Gemini — istifadəçinin öz şkafından mətn/ID əsasında kombin; generasiya yalnız `GET THE LOOK` basılanda; `Shuffle`, `Save Look`).
4. Try-on yalnız kommersiya lisenziyalı modellərlə (FASHN VTON, Kling Kolors, Leffa, Flux, BiRefNet, Clarity). IDM-VTON YOX. API açarları yalnız serverdə.
5. Kredit yoxlaması, xəta olanda kreditin qaytarılması və eyni avatar+geyim keşləməsi PRD-də Phase 4-ə aiddir — Phase 3-də necə hazırlayacağını (stub və ya tam) əvvəlcə mənə qısa təklif kimi yaz, sonra başla.
6. Hər ekranı 3 ölçüdə yoxla (geniş ekran ~2.18:1, noutbuk 16:10, telefon) və mənə göstər.

## Sonrakı mərhələlər
- Phase 4: AVATAR və OUTFITS, hicab/yaş məntiqi, Smart Fit-Ratio, keşləmə və kredit axını
- Phase 5: planlar, M10 ödəniş adapteri (şəffaf M10 köçürməsi, QR `public/assets/payment/m10-qr.png`, qəbz yükləmə, admin təsdiqi; `PAYMENT_PROVIDER` ilə açılıb-bağlanır, `disabled` ilə başlasın), admin paneli, hüquqi səhifələr, Contact, deploy
- Sonra: `WearCast/free/` — pulsuz versiya ayrıca qovluqda (hero, qeydiyyat, Trends, hava kombini)

## Qəti qaydalar
- Özündən dizayn elementi, mətn, qiymət, əlaqə məlumatı uydurma. Support email: `support.wearcast@gmail.com`.
- UI-da "AI" sözü, robot ikonu yoxdur ("Today's Edit" / "Daily Curated Look"). "SHOP" bölməsi yoxdur. Sosial ikonlar hələlik yoxdur.
- Valyuta AZN (Starter 6.99→4.19, Plus 13.99→8.39, Premium 24.99→14.99; add-on 0.99/2.99/5.49 ₼). Aylıq avtomatik çəkmə yoxdur. Plan bitəndə dondurulur, şkaf 30 gün saxlanılıb silinir.
- Uşaq/yeniyetmə avatarlarında açıq-saçıq geyim generasiya etmə (məcburi). Hicablı rejimdə qollar/boyun bağlı.
- Heç vaxt saxta kart formu və ya gizli/maskalanmış ödəniş yönləndirməsi qurma.
- Generasiya edəndə: əvvəl 1 nümunə, sonra partiya; hər partiyadan sonra kontakt-vərəq göstər, mən "OK / yenilə" deyim.
- Hər mərhələ bitəndə `PROGRESS.md`-ni yenilə və "Mərhələ X tamamlandı, yeni söhbətə keçə bilərsən" de.
- Cavabları Azərbaycan dilində, sadə və developer olmayan biri üçün başa düşülən şəkildə yaz. Qərar lazım olanda qısa sual ver və öz peşəkar tövsiyəni yaz.

İlk addım: `PROGRESS.md` və `CLAUDE.md` oxu, sonra WARDROBE ekranı üçün qısa plan (struktur, Supabase cədvəlləri/migration, Fal xərci olacaqsa cədvəl) hazırla və mənə göstər.
