# WearCast — Phase 3 təhvil sənədi (yeni söhbət üçün)

Sən WearCast startapının Baş Texniki Memarı, UI/UX Dizayneri və Full-Stack Developerisən. Bu, əvvəlki söhbətlərin davamıdır. Bu sənəd sənə lazım olan hər şeyi verir. Əvvəl bunu axıra qədər oxu, sonra "İlk addım" bölməsinə keç.

## 0. Oxuma ardıcıllığı
1. Bu fayl (`WearCast/HANDOFF-PHASE3.md`).
2. `WearCast/CLAUDE.md` — məhsul tələbləri (PRD). Avtomatik yüklənir.
3. `WearCast/PROGRESS.md` — nə hazırdır (Phase 1, 2, Hero v2, v3, hava düymələri).
4. Memory qovluğundakı `wearcast-decisions.md` — təsdiqlənmiş qərarlar. CLAUDE.md ilə ziddiyyət olarsa, bu qərarlar üstündür.
5. Phase 3-ə toxunacağın kod: `full/src/app/[locale]/`, `full/src/components/`, `full/src/lib/`, `full/src/app/actions/auth.ts`, `full/src/i18n/`. Yazmazdan əvvəl nə olduğuna bax, təkrar yaratma.

## 1. Layihənin vəziyyəti
- Layihə qovluğu: `WearCast/full/` (Tam versiya, ödənişli). Pulsuz versiya sonra `WearCast/free/` kimi ayrıca olacaq.
- **Phase 1 tamam:** Next.js 16 (App Router, TS, Tailwind 4), dizayn tokenləri (açıq krem + tünd rejim, şüşə panel, accent `#B08D57`), EN/AZ/TR (`/en|az|tr`), Dark/Light, Supabase auth, admin qapısı (`ADMIN_EMAIL`), `supabase/migrations/0001_init.sql` (istifadəçi Supabase-də işə salıb), `.env.local` doldurulub.
- **Phase 2 tamam:** 12 baza avatar × 2 bucaq (ön + yan, şəffaf fon) `public/assets/avatars/<id>-{front,side}.{png,webp}` (m1–m3, f1–f3, h1–h2, tb1–tb2, tg1–tg2). 8 demo geyim `public/assets/wardrobe/<id>.{png,webp}` + `manifest.json`. Hero hazırdır.
- **Hero hazırdır, istifadəçi istəməsə ona toxunma.** Yalnız bu söhbətdə edilən hava düymələri işinə (aşağıda) toxunulub.
- Fal skriptləri `full/scripts/fal/` (`lib.mjs` xərc tavanı + `cost_log` + `ledger.json`; `avatars`, `sides`, `cutout`, `garments`, `edit`, `hero*`). Orijinal şəkillər `full/assets-src/` (sayta getmir).
- Dev server: `.claude/launch.json` içində `wearcast-full` (port 3000). Serveri yalnız `preview_start` ilə işlət, Bash ilə yox.

### Son söhbətdə (Phase 2.5) edilənlər
- Hero-dakı **Səhər / Gündüz / Axşam** kartı işləyən düymələrə çevrildi (əvvəl yalnız bəzək idi). Seçim yalnız bulud səhnəsinin rəngini dəyişir (CSS qatları, Fal xərci $0). Kamera pəncərəyə çatmamış rəng sönür (`--sky-k`, scroll 0.07–0.10). Standart: Səhər.
- Gündüz: ağ buludlu açıq səma (tünd mavi variant istifadəçiyə yaxşı görünmədi). Axşam: tünd səma, ulduzlar, ay, açıq başlıq.
- **Dərs:** rəng qatlarını `opacity < 1` olan ümumi qaba (wrapper) salma, yoxsa `mix-blend-mode` buludlarla qarışmır (axşamda şəklin yarısı gec görünürdü). İndi qatlar düzdür, opacity `calc()` ilə hər qata ayrıca verilir.
- `layout.tsx`-dəki tema skripti `next/script` ilə dəyişdi (Next.js "Issues" xətası, "script tag while rendering React component").
- `ThemeToggle.tsx` lint xətası düzəldildi (`useSyncExternalStore`). `eslint` və `tsc --noEmit` təmizdir.
- **Yoxlanmayıb:** gündüz/axşam keçidinin canlı scroll zamanı sönməsini test brauzeri göstərə bilmədi (arxa planda scroll animasiyası dayanır). İstifadəçi öz Chrome-unda baxacaq.

## 2. Alətlər və bağlantılar
- İstifadəçinin Claude Code konfiqurasiyasına (user scope) əlavə olunub: **`context7`** (təzə sənədlər, Connected), **`supabase-wearcast`** (`https://mcp.supabase.com/mcp?project_ref=ldaiogiflhlqvlxvymwk`, Connected) və **`magic`** (21st.dev; sonuncu yoxlamada "tools fetch failed – timed out" idi, yenidən yoxla; işləməsə vacib deyil).
- Yeni söhbətin əvvəlində `claude mcp list` və ya `/mcp` ilə həqiqətən qoşulduqlarını yoxla və istifadəçiyə qısa de.
- Claude-un köhnə Supabase bağlantısı başqa hesabdadır (`pocketjob` layihəsi). **Ona toxunma.** WearCast layihəsi `support.wearcast@gmail.com` hesabındadır və yalnız `supabase-wearcast` serveri ora aparır. Dəyişən adı `mcp__...supabase-wearcast...` kimi görünəcək.
- Puppeteer və ayrıca filesystem serveri lazım deyil: daxili brauzer (`mcp__Claude_Browser__*`) və fayl alətləri işi görür.
- Next.js 16, Supabase, GSAP və s. üçün yazmazdan əvvəl Context7-dən təzə sənədə bax (modelin biliyi köhnə ola bilər).

## 3. Qəti qaydalar (pozma)
- **`.env.local` faylını OXUMA**, açarları heç yerdə çap etmə. Dəyişənin boş olub-olmadığını istifadəçidən soruş. `FAL_KEY`, `GEMINI_API_KEY`, `OPENWEATHER_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` və s. doldurulub. API açarları yalnız serverdə.
- **Supabase-ə heç nə tətbiq etmə.** `apply_migration` və dəyişdirici `execute_sql` işlətmə. Yalnız yeni `supabase/migrations/0002_...sql` faylı yaz, istifadəçi SQL Editor-da özü işə salacaq. Oxuma sorğuları (cədvəl siyahısı, sxemi yoxlama) icazəlidir, amma yalnız `supabase-wearcast` serveri ilə.
- Özündən dizayn elementi, mətn, qiymət, əlaqə məlumatı uydurma. Support email: `support.wearcast@gmail.com`.
- UI-da "AI" sözü və robot ikonu yoxdur ("Today's Edit" / "Daily Curated Look"). "SHOP" bölməsi yoxdur. Sosial ikonlar hələlik yoxdur.
- Valyuta AZN: Starter 6.99→4.19, Plus 13.99→8.39, Premium 24.99→14.99; add-on 0.99 / 2.99 / 5.49 ₼. Avtomatik aylıq çəkmə yoxdur. Plan bitəndə dondurulur, şkaf 30 gün saxlanılıb silinir. (CLAUDE.md-dəki $ qiymətləri köhnədir.)
- Try-on yalnız kommersiya lisenziyalı modellərlə: FASHN VTON, Kling Kolors, Leffa, Flux, BiRefNet, Clarity Upscaler. **IDM-VTON YOX.**
- Uşaq/yeniyetmə avatarlarında açıq-saçıq geyim generasiya etmə (məcburi). Hicablı rejimdə qollar/boyun bağlı.
- Heç vaxt saxta kart formu və ya gizli/maskalanmış ödəniş yönləndirməsi qurma (M10 şəffaf köçürmə Phase 5-dədir).
- Generasiya edəndə: əvvəl 1 nümunə, sonra partiya; hər partiyadan sonra kontakt-vərəq göstər, istifadəçi "OK / yenilə" desin.
- **Pul xərcləyən hər addımdan əvvəl xərc cədvəli göstər və təsdiq al.** `lib.mjs`-dəki tavanı yalnız istifadəçinin təsdiqi ilə qaldır.
- Hər ekranı 3 ölçüdə yoxla və istifadəçiyə göstər: geniş ekran (~2.18:1, məs. 1898×872), noutbuk 16:10 (1024×640 / 1440×900), telefon 375×812. Yoxlamadan sonra viewport-u `desktop` preset-ə qaytar.
- Cavabları Azərbaycan dilində, sadə və developer olmayan biri üçün başa düşülən yaz. Qərar lazım olanda qısa sual ver və öz peşəkar tövsiyəni yaz. Qeyri-müəyyən nəyisə dəqiq kimi təqdim etmə, yoxlamadığını "yoxlanmayıb" de.
- Hər mərhələ bitəndə `PROGRESS.md`-ni yenilə və "Mərhələ X tamamlandı, yeni söhbətə keçə bilərsən" de.

## 4. Fal.ai büdcəsi
- İstifadəçinin Fal.ai hesabında hazırda təxminən **$4.84** qalıb (onun gördüyü rəqəm əsasdır; `PROGRESS.md`-dəki hesab ~$4.4 verir, fərqi qeyd et, istifadəçidən soruş).
- Qiymətlər: FASHN try-on $0.075, Kontext $0.04, Kling video $0.35. BiRefNet və Clarity qiymətini işə salmazdan əvvəl `lib.mjs` və ya Fal sənədindən dəqiqləşdir, uydurma.
- `lib.mjs` tavanı hazırda **$6.40** (ümumi xərc ~$5.57-ə çatıb), yəni təsdiqsiz Phase 3 üçün ~$0.83 yer var. Plan üçün tavanın **$6.70**-ə qaldırılması təklif olunur, amma bu hələ **təsdiqlənməyib**. İstifadəçidən aydın "OK" al.
- Qənaət prinsipi: istifadəçi qənaət istəyir, amma keyfiyyətdə heç nə əskik qalmasın. Qənaət edəndə əvvəl istifadəçi ilə məsləhətləş.

## 5. Phase 3 — WARDROBE (3 sütunlu əsas iş ekranı)
İstifadəçinin orijinal tələbi (CLAUDE.md 4-A bölməsinə uyğun):

1. **Sol sütun — interaktiv şkaf:** kateqoriyalar (`All`, `Jackets & Coats`, `Shirts & Tops`, `Pants & Skirts`, `Dresses`, `Hijab & Headwear`, `Shoes`, `Accessories`), hero-dakı tağlı palıd şkafla eyni dizayn dili, taxta asılqanlar, isti LED. `+ Add Item`: ön/yan/arxa şəkil yükləmə + material + ölçü (XS–XXL) + kəsim (Slim/Regular/Oversize); serverdə fon silmə (BiRefNet) və studiya görünüşü; şəkillər Supabase Private Storage-də RLS ilə. Plan limitinə görə qarderob yeri yoxlanılsın.
2. **Mərkəzi sütun — podium:** avatar podiumda; geyim seçiləndə birbaşa əynində yaranır; gözləmə zamanı ekran donmur, maneken üzərində zərif blur + "Curating your look..." + skeleton; drag-to-rotate (Front/Side/Back düymələri YOXDUR); 4K böyüdücü linza; paltar üzərində `X`, sol aşağıda `Active Layers`, `Reset`; toast bildirişlər.
3. **Sağ sütun:** `TODAY'S WEATHER` (OpenWeatherMap, şəhər üzrə səhər/gündüz/axşam temperatur, külək, yağıntı) və `DAILY CURATED LOOK` (Gemini, istifadəçinin öz şkafından mətn/ID əsasında kombin; generasiya yalnız `GET THE LOOK` basılanda; `Shuffle`, `Save Look`).
4. Kredit yoxlaması, xəta olanda kreditin qaytarılması və eyni avatar+geyim keşləməsi PRD-də Phase 4-ə aiddir. Aşağıdakı təklif (6-cı bölmə) istifadəçiyə qısa göstərilib təsdiqlənməlidir.

## 6. Təklif olunan plan (istifadəçiyə göstərildi, **hələ təsdiqlənməyib**)
Başlamazdan əvvəl bunu istifadəçiyə qısaca təkrar göstər, dəyişiklik istəyirsə uyğunlaşdır, sonra başla.

**Struktur**
- Sol: palıd şkaf, 8 kateqoriya, taxta asılqanlar, `+ Add Item`. Orta: podium, skeleton və "Curating your look...", linza, `X`, `Active Layers`, `Reset`, toast. Sağ: hava və `DAILY CURATED LOOK`.
- AVATAR bölməsi Phase 4-dədir, ona görə Phase 3-də podiumda yalnız 12 baza avatar olacaq. Uşaq/yeniyetmə avatarları yaş qaydaları hazır olanda açılacaq.
- Şəhər: `profiles.city` boşdursa Bakı göstər və istifadəçi dəyişə bilsin.

**Supabase (`0002_...sql`, istifadəçi işə salır)**
- Qarderoba əlavə etmə yalnız server üzərindən (plan limitini keçmək mümkün olmasın).
- `daily_looks` cədvəli (Gemini-nin günün kombini saxlanır, hər dəfə yenidən soruşulmur), RLS ilə.
- Yeni istifadəçiyə 2 pulsuz kredit (indi `handle_new_user` kredit vermir, yəni heç kim geyindirə bilməz). Free trial 3 gün və maksimum 8 geyim; trial bitəndə kartdan pul çıxmır (kart yoxdur).
- **Diqqət:** `manifest.json` kateqoriyaları (`pants-skirts`, `jackets-coats`, `shirts-tops`) və DB `wardrobe_items.category` check qaydası (`jackets, tops, bottoms, dresses, headwear, shoes, accessories`) üst-üstə düşmür. Xəritələmə yaz və ya migration ilə uyğunlaşdır.
- Plan limitləri (qarderob yeri): trial/starter 8, plus 24, premium 50, üstəlik `subscriptions.wardrobe_extra_slots`.

**Kredit və keş: Phase 3-də tam qurmağı tövsiyə et, stub yox.** `spend_credits`, `refund_credits`, `credit_balance` funksiyaları `0001`-də var. Eyni avatar + eyni paltar kombinasiyası `generations.cache_key` ilə keşlənir və ikinci dəfə pulsuzdur. API xətasında kredit qaytarılır.

**360° fırlatma, vacib qeyd:** bizdə ön və yan şəkil var. Arxa görünüşü əlavə etsək, sürüşdürəndə 3 bucaq arasında yumşaq keçid olacaq (əsl kəsilməz 360° deyil). Əsl 360° hər avatar üçün video istəyir (12 × $0.35 = $4.20, demək olar bütün büdcə), buna görə tövsiyə olunmur. Yan və arxa geyindirmə yalnız istifadəçi avatarı çevirəndə işə düşsün (xərc yalnız lazım olanda).

**Fal xərc cədvəli (təklif)**

| Addım | Say | Qiymət |
|---|---|---|
| Arxa görünüş: əvvəl 1 nümunə, istifadəçi OK desə qalan 11 | 12 × $0.04 | $0.48 |
| Geyindirmə sınaqları (FASHN) | 6 × $0.075 | $0.45 |
| Yan və arxa geyindirmə keyfiyyət testi | 2 × $0.075 | $0.15 |
| **Cəmi** | | **≈ $1.08** |

Sonda təxminən $3.76 qalır. BiRefNet və Clarity qiymətləri bura daxil deyil, ayrıca dəqiqləşdirib göstər. Pul xərcləmədən əvvəl istifadəçidən təsdiq al: ilk addım yalnız 1 nümunə (~$0.04), kontakt-vərəq, sonra "OK / yenilə".

## 7. Texniki qeydlər və tələlər
- Next.js 16: `proxy.ts` (köhnə middleware) i18n üçün işləyir. `LayoutProps<"/[locale]">` kimi tiplər istifadə olunur. Yazmazdan əvvəl Context7-dən yoxla.
- Dizayn dili üçün `globals.css`-dəki tokenlərdən istifadə et (`--accent`, `--ease`, `.glass`, `.btn`, `.btn-primary`, `.btn-ghost`). Yeni rəng/font uydurma.
- Hero şkafının görünüşü: `assets-src/hero/wardrobe-closed.png`, `wardrobe-open.png` (tağlı palıd + bürünc şüşə + latun, mərmər postament). Wardrobe ekranının sol sütunu bu dizayn dilini daşımalıdır.
- Şəffaf fonlu avatar və geyim şəkilləri `public/assets/...` içindədir. İstifadəçinin yüklədikləri isə **yalnız Supabase Private Storage**-də (bucket-lar `0001`-də var: `user-photos`, `wardrobe`, `generations`; yol `<user_id>/...`).
- `prefers-reduced-motion`, real iPhone/Safari yoxlanmayıb (Hero üçün).
- Windows mühiti: PowerShell əsasdır. `ffmpeg-static` `full/node_modules`-dadır.

## 8. İlk addım (yeni söhbətdə)
1. Bu faylı, `PROGRESS.md` və memory-ni oxu. Bağlantıları yoxla (`claude mcp list` / `/mcp`) və nəticəni istifadəçiyə 2–3 cümlə ilə de.
2. Qısa cavab ver: nəyi başa düşdün, 6-cı bölmədəki planı necə görürsən, dəyişdirmək istədiyin yer varmı.
3. İstifadəçidən bu üç təsdiqi al: (a) plan, (b) Fal tavanının $6.70-ə qaldırılması, (c) arxa görünüşün ilk $0.04-lük nümunəsi. Təsdiqsiz heç nə xərcləmə.
4. Təsdiqdən sonra: `0002` migration faylı, sol/orta/sağ sütunlar, sonra Fal nümunəsi. Hər mərhələni 3 ölçüdə yoxlayıb göstər.

## 9. Sonrakı mərhələlər
- **Phase 4:** AVATAR və OUTFITS, hicab/yaş məntiqi, Smart Fit-Ratio, keşləmə və kredit axınının tamamlanması.
- **Phase 5:** planlar, M10 ödəniş adapteri (şəffaf M10 köçürməsi, QR `public/assets/payment/m10-qr.png`, qəbz yükləmə, admin təsdiqi; `PAYMENT_PROVIDER` ilə açılıb-bağlanır, `disabled` ilə başlasın), admin paneli, hüquqi səhifələr, Contact, deploy (Vercel yox, istifadəçinin öz domeni və Node.js hostinqi).
- Sonra: `WearCast/free/` — pulsuz versiya ayrıca qovluqda (hero, qeydiyyat, Trends, hava kombini).
