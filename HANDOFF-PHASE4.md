# WearCast — Phase 4 təhvil sənədi (yeni söhbət üçün)

Sən WearCast startapının Baş Texniki Memarı, UI/UX Dizayneri və Full-Stack Developerisən. Bu, əvvəlki söhbətlərin davamıdır. Bu sənəd keçmiş işi, alınan dərsləri, qaydaları və növbəti planı tam izah edir. **Axıra qədər oxu, sonra "13. İlk addım" bölməsinə keç.** Burada yazılanlar əvvəlki təhvil sənədindən (`HANDOFF-PHASE3.md`) daha təzədir. Ziddiyyət olarsa, bu sənəd əsasdır.

---

## 0. Oxuma ardıcıllığı
1. Bu fayl: `WearCast/HANDOFF-PHASE4.md`.
2. `WearCast/CLAUDE.md` (PRD, avtomatik yüklənir). Qiymət, ödəniş və bir neçə qərar köhnədir, bax 3-cü bölmə.
3. `WearCast/PROGRESS.md`: hər mərhələnin qeydi (Phase 3 hissəsi uzundur, ən son yazılanlar daha doğrudur).
4. Memory qovluğu (`MEMORY.md` indeksi): `wearcast-decisions`, `wearcast-tooling-and-workflow`, `wearcast-tryon-lessons`, `wearcast-local-tls-avast`.
5. Kod: `full/src/lib/wardrobe/`, `full/src/app/api/`, `full/src/components/wardrobe/`, `full/src/app/[locale]/`.

---

## 1. İstifadəçi və iş üslubu (çox vacib)
- Cavablar **Azərbaycan dilində**, sadə, developer olmayan biri üçün. Qərar lazım olanda qısa sual ver və öz peşəkar tövsiyəni yaz.
- İstifadəçi nəticəni **öz gözü ilə yoxlayır**. Keçmişdə "işləyir" deyilən şeylər onun testində xətalı çıxıb və bu güvəni sarsıdıb (məsələn, pencək kişini qadına çevirdi, yan görünüş başqa paltar çəkdi). Ona görə:
  - Heç vaxt yoxlamadığın şeyi "işləyir" kimi təqdim etmə. Yoxlanmayanı açıq de: "yoxlanmayıb".
  - Pullu (Fal) addımı **bir nümunə ilə** sübut etmə. Bir neçə nümunəyə bax, şəkilləri özün aç və gözlə yoxla.
  - Xətanı təxmin etmə: əvvəl real nəticə şəkillərini, `generations` və `cost_log` qeydlərini, server loglarını yoxla, səbəbi sübut et, sonra düzəlt.
- **Pul xərcləyən hər addımdan əvvəl** xərc cədvəli göstər və təsdiq al. İstifadəçi "lazım olanı sına" desə belə, minimum sayda sınaq et və xərci sonda dəqiq de.
- İstifadəçi qənaət istəyir, amma keyfiyyətdən güzəşt yox. Qənaət qərarlarında məsləhətləş.
- Hər mərhələnin sonunda `PROGRESS.md`-ni yenilə və "Mərhələ X tamamlandı, yeni söhbətə keçə bilərsən" de. Növbəti söhbət üçün təhvil faylı hazırla (bu fayl kimi).
- Ekranı 3 ölçüdə yoxla: geniş 1898×872 (istifadəçinin real ekranı), noutbuk 1024×640 və ya 1440×900, telefon 375×812. Sonra viewport-u `desktop`-a qaytar.
- İstifadəçi tez-tez ekran şəkilləri göndərir. Şəkildəki hər detala diqqət et (yazılar, düymələr, "Issues" sayğacı).

---

## 2. Qəti qaydalar
- **`.env.local`:** istifadəçi 10 noyabr 2026-da oxumağa icazə verdi. Oxuya bilərsən, amma **açarların dəyərini heç vaxt cavabda, logda və ya faylda yazma.**
- **Supabase:** yalnız `supabase-wearcast` MCP serveri (layihə `ldaiogiflhlqvlxvymwk`, hesab `support.wearcast@gmail.com`). Köhnə `pocketjob` bağlantısına toxunma.
  - Oxuma sorğuları olar.
  - Sxemi dəyişmə (`apply_migration` və dəyişdirici SQL yoxdur). Lazım olsa `full/supabase/migrations/000N_*.sql` faylı yaz, istifadəçi SQL Editor-da özü işə salır. İndiyə qədər `0001` və `0002` işə salınıb.
  - Auth admin API (`app_metadata`, `user_metadata`) kod vasitəsilə istifadə olunur, migration tələb etmir.
- UI-da "AI" sözü və robot ikonu yoxdur ("Today's Edit" / "Daily Curated Look"). "SHOP" bölməsi yoxdur. Sosial ikonlar hələlik yoxdur.
- Özündən mətn, qiymət, əlaqə məlumatı uydurma. Support email: `support.wearcast@gmail.com`.
- Try-on yalnız kommersiya icazəli modellərlə: FASHN, Kling Kolors, Leffa, Flux/Kontext, BiRefNet, Clarity. **IDM-VTON yox.**
- **Uşaq/yeniyetmə avatarlarında açıq-saçıq geyim generasiya etmə (məcburi).** Hicab rejimində qollar və boyun bağlı.
- Heç vaxt saxta kart formu və ya gizli/maskalanmış ödəniş yönləndirməsi qurma (M10 şəffaf köçürmə Phase 5-dədir).
- Generasiyada qayda: əvvəl 1 nümunə, sonra partiya. Hər partiyadan sonra kontakt-vərəq göstər, istifadəçi "OK / yenilə" desin.

---

## 3. Təsdiqlənmiş qərarlar (CLAUDE.md-dən üstündür)
- **Valyuta AZN:**
  - Starter 6.99 → 4.19 ₼, Plus 13.99 → 8.39 ₼, Premium 24.99 → 14.99 ₼ (40% launch endirimi, `NEXT_PUBLIC_LAUNCH_DISCOUNT`).
  - Add-on 0.99 / 2.99 / 5.49 ₼.
- **Ödəniş:** LemonSqueezy/Paddle yoxdur. Ödəniş adapterlə, şəffaf M10 köçürməsi (QR `public/assets/payment/m10-qr.png`, qəbz yükləmə, admin təsdiqi), `PAYMENT_PROVIDER=disabled` ilə başlayır. Avtomatik aylıq çəkmə yoxdur, plan bitəndə dondurulur, şkaf 30 gün saxlanılıb silinir.
- **İki versiya:** Tam (`full/`, ödənişli) və pulsuz (`free/`, sonra). Pulsuz versiyada yalnız hero, qeydiyyat, Trends və havaya uyğun kombinlər.
- **Geyindirmə yalnız ön görünüşdür, fırlatma yoxdur** (istifadəçi qərarı, 10 noyabr). Səbəb 7-ci bölmədə.
- **Kredit:** 1 kredit = 1 geyindirmə addımı (bir paltar). Bizə təxminən $0.075 (+ pencəyin ilk geyim şəkli üçün $0.04, bir dəfəlik) başa gəlir.
  - Phase 5 üçün aylıq kreditlər: endirimli **20 / 45 / 85**, normal **30 / 75 / 130** (Starter / Plus / Premium).
  - Gündəlik geyindirmə limiti: sınaq 2, Starter 4, Plus 8, Premium 14 (gecə yarısı yenilənir).
  - Gündə 10 yükləmə.
  - Qarderob yeri: sınaq 4, Starter 8, Plus 24, Premium 50.
  - Pulsuz sınaq 3 gün, 2 kredit, kart yoxdur.
  - Qiymət eyni qalır, ən pis halda belə mənfəət qalmalıdır.
- **Hostinq:** Vercel yox, istifadəçinin öz domeni və Node.js hostinqi (Phase 5).

---

## 4. Alətlər və mühit
- **MCP serverləri:** `context7` (təzə sənədlər, işləyir), `supabase-wearcast` (işləyir), `magic` (21st.dev, "tools fetch failed" verir, vacib deyil). Söhbətin əvvəlində `claude mcp list` ilə yoxla və istifadəçiyə qısa de.
- **Dev server:** `WearCast/.claude/launch.json` içində `wearcast-full` (port 3000). Yalnız `preview_start` ilə işə sal. İstifadəçi öz Chrome-unda `http://localhost:3000/az/...` açır.
- **Avast:** istifadəçinin kompüterindəki Avast Web Shield HTTPS-i yoxlayır. Ona görə `npm run dev` belədir: `node --use-system-ca node_modules/next/dist/bin/next dev`. Bunu dəyişmə. Lokal "fetch failed" görsən, səbəb budur. TLS yoxlamasını heç vaxt söndürmə.
- **Telefonda yoxlama:** `next.config.ts`-də `allowedDevOrigins: ["192.168.100.189"]`. Telefon eyni Wi-Fi-da `http://192.168.100.189:3000/az` açır. Windows şəbəkəsi "Public" olduğu üçün firewall bağlaya bilər; istifadəçiyə şəbəkəni "Private" etməsi deyilib. IP dəyişsə, yenilə.
- **Hesabsız lokal baxış:** `http://localhost:3000/az/wardrobe?preview=1`, yalnız development-də işləyir. Real API-lər 401 qaytarır.
- **Daxili brauzerdə (test paneli) diqqət:**
  - Səhifədə bəzi elementlərin gizli ikinci nüsxəsi olur, ona görə `querySelector` əvəzinə görünən elementi seç (`getBoundingClientRect().width > 0`).
  - Hidrasiya bəzən yalnız real kliklə başlayır, ona görə klikləri `computer` + `ref` ilə et.
  - Sınaq zamanı API-ni pulsuz yoxlamaq üçün `window.fetch`-i saxta cavabla əvəz etmək olar.
- **Pullu axını başdan-sona yoxlamaq üçün** müvəqqəti, yalnız development + localhost-da işləyən route yaz (`src/app/api/<ad>/route.ts`), `runTryOn`-u birbaşa çağır, işin bitəndə **sil**. Sahibin user id: `d845250d-3d23-481e-9a0a-b3c2d2e21aa9` (ADMIN_EMAIL hesabı, limitsiz).
- **Layihə git repo deyil.** İstifadəçiyə `git init` təklif et (Phase 4-ün əvvəlində), çünki indi geri qaytarmaq üçün versiya tarixçəsi yoxdur. `.gitignore`-da `.env*` var; `.env.local.example` istisna olaraq əlavə edilib (`!.env.local.example`), yəni açarlı fayl git-ə düşməyəcək.
- `.env.local`-da bütün açarlar doludur. 10 noyabrda dəyərlərin əvvəlindəki boşluqlar təmizləndi. Gemini açarı `AQ.` ilə başlayır və işləyir.
- **Gemini:** `gemini-2.5-flash` artıq işləmir (404). Kod `askGemini()` funksiyası ilə ehtiyat zənciri istifadə edir: `gemini-flash-lite-latest` → `gemini-flash-latest` → `gemini-3-flash-preview` (biri 503 verəndə növbəti). `GEMINI_MODEL` env ilə birinci seçilə bilər.

---

## 5. Fal.ai büdcəsi və xərc qeydləri
- **İstifadəçinin Fal balansı ~$0.34** (10 noyabr gecə). Sabah $10 yükləməyi planlaşdırır. **Balansı istifadəçidən soruş**, təxmin etmə.
- **İki ayrı sayğac var:**
  1. `scripts/fal/ledger.json` + `lib.mjs` tavanı (`BUDGET_CAP_USD = 7.9`). Yalnız CLI skriptlərini qoruyur, tətbiqin xərclərini görmür.
  2. Supabase `cost_log`: hər şey (skriptlər + tətbiq). Cəmi ~$10.42 yazılıb. BiRefNet hər çağırışa $0.01 yazılır, amma Fal-da qiyməti $0-dır, ona görə real xərc azdır.
- **Müştəri tavanı:** `app_settings.fal_budget_cap_usd` = **6.90** (hələ qaldırılmayıb). `cost_log` cəmi bunu keçdiyi üçün **adi istifadəçilər "studiya dincəlir" görür.** Limitsiz hesablar (sahib + paylaşılanlar) dayanmır. İstifadəçi bunu admin səhifəsindən qaldırmalıdır (məsələn 15). Xatırlat.
- **Real qiymətlər** (Fal səhifəsi, noyabr 2026):

  | Model | Qiymət |
  |---|---|
  | FASHN v1.6 | $0.075 |
  | Kontext (tək şəkil) | $0.04 |
  | BiRefNet | $0 (biz $0.01 yazırıq) |
  | Kling video | $0.35 / 5 san |
  | Clarity | $0.03 / meqapiksel (4K ≈ $0.24, işə salınmayıb) |

---

## 6. Görülən işlər (tarixçə)
- **Phase 1:** Next.js 16 (App Router, TS, Tailwind 4), dizayn tokenləri (krem + tünd rejim, `.glass`, accent `#B08D57`), EN/AZ/TR, Supabase auth, admin, `0001_init.sql`.
- **Phase 2:** 12 baza avatar (m1–m3, f1–f3, h1–h2, tb1–tb2, tg1–tg2), ön + yan şəkil (sonra 8 böyük avatara arxa da əlavə olundu, indi işlənmir), 8 demo geyim, Hero.
- **Hero v2, v3:** kamera səyahəti filmi (Lenis + GSAP), Səhər/Gündüz/Axşam düymələri. **İstifadəçi istəməsə Hero-ya toxunma.**
- **Phase 3 (WARDROBE), 9–10 noyabr:**
  - **Giriş problemi:** qeydiyyat/giriş "fetch failed" verirdi, səbəb Avast idi; `--use-system-ca` ilə həll olundu. Formada konkret xəta mesajları və parolu göstər düyməsi var.
  - `0002_wardrobe.sql` (istifadəçi işə salıb): kateqoriya adları UI ilə eyni, qarderoba yalnız server yaza bilər, 3 günlük sınaq + 2 kredit, `reserve_wardrobe_item`, `plan_is_active`, `daily_looks` cədvəli, `app_settings.fal_budget_cap_usd`.
  - **Wardrobe ekranı** (`/[locale]/wardrobe`):
    - Sol: palıd tağlı şkaf, 8 kateqoriya, asılqanlar; ayaqqabı/aksesuar şüşə rəfdə. Nümunələri gizlətmək və "Nümunələri göstər" mümkündür (localStorage).
    - Orta: podium, xalça üstündə model, böyüdücü linza, X yalnız həmin paltarın üstündə görünür (touch-da gizli), "Əynimdəkilər" siyahısı, Sıfırla, 8 avatar seçimi, toast bildirişlər.
    - Sağ: hava (OpenWeather, səhər/gündüz/axşam, şəhər dəyişmək olar) və Günün kombini (Gemini, ən azı 2 öz geyim lazımdır).
  - **Gözləmə effekti:** model bulanır, "Kombinin hazırlanır..." kartı çıxır və seçilən paltar dərhal bədənin üstündə görünür. Şalvar/ətək kartın altında qalır (3 ölçüdə ölçülüb), kart həmişə üstdədir.
  - **Geyim yükləmə:**
    - Ön (məcburi), yan və arxa foto, material, ölçü, kəsim.
    - Kateqoriyanı Gemini şəkildən özü seçir (`/api/wardrobe/detect`, 7 nümunənin 7-si düz). İstifadəçi dəyişə bilər.
    - Şəkil Kontext ilə səliqəli kataloq görünüşünə salınır (manekensiz), sonra BiRefNet ilə fonu silinir.
    - EXIF/GPS silinir, Private Storage-də saxlanılır.
  - **Admin:** `/[locale]/admin`, icazəsizlərə 404. Sahib = `ADMIN_EMAIL`.
    - Limitsizdir: kredit, plan, gündəlik limit və müştəri tavanı tətbiq olunmur.
    - Girişi başqasına verə bilir (`app_metadata.wearcast_unlimited`, yalnız sahib idarə edir).
    - Statistika göstərir və müştəri tavanını dəyişir.
    - Header-də "Kredit: ∞" və "Admin" yazısı görünür.
  - **Header:** WARDROBE linki, kredit balansı. AVATAR və OUTFITS hələ boz yazıdır (Phase 4).

---

## 7. Geyindirmə sistemi: necə işləyir və nələr sınanıb (ən vacib bölmə)
**Fayllar:** `full/src/lib/wardrobe/tryon.ts` (`runTryOn`), `full/src/lib/wardrobe/server.ts` (`runFal`, `cutout`, `askGemini`, `uploadStatic`), `full/src/app/api/tryon/route.ts`, `full/src/components/wardrobe/WardrobeStudio.tsx`.

**Axın:**
1. Paltarlar üst-üstə geyinilir (ən çoxu 6 qat). Yeni paltar əvvəlkini silmir.
2. Qatların sırası: şalvar/ətək → don → köynək/üst → pencək/palto. Eyni növ geyinmə ardıcıllığı ilə gedir.
3. Hər qat əvvəlki nəticənin üzərinə **FASHN v1.6** (`balanced`, `flat-lay`, `conservative`) ilə geyindirilir.
4. Nəticədən BiRefNet Light ilə fon silinir. `raw.jpg` (növbəti qat üçün) və `look.webp` (ekran üçün) saxlanılır.
5. **Keş:** hər qatın açarı `sha256("v4|base:<avatar>|front|<qatların ref-ləri>")`. Pencəyin altında başqa üst geyim varsa, açar `v5` ilə başlayır.
   - Son qatı çıxaranda əvvəlki vəziyyət keşdən **pulsuz** gəlir.
   - Ortadakı qatı çıxaranda o birləşmə əvvəl yaranmayıbsa, kredit çıxır.
   - İçdən çölə geyinmək kredit qənaət edir.
6. **Pencək/palto:** FASHN üst geyimi tamamilə əvəz edir, ona görə pencək əvvəl "içindəki geyimlə birlikdə" geyim şəklinə çevrilir:
   - Pencəyin öz şəkli tək-şəkil Kontext ilə redaktə olunur: "açıq pencək, içində X".
   - X ya ağ futbolka (hicablı avatar üçün krem uzunqol), ya da alt qatın Gemini təsviri ("Light blue cotton button-down shirt").
   - Hazır şəkil saxlanılmazdan əvvəl **Gemini iki dəfə yoxlayır** (`pieceIsClean`), ikisi də "ok" deməlidir.
   - Keçməsə 1 dəfə yenidən yaradılır, yenə keçməsə xəta çıxır və kredit qaytarılır.
   - Şəkil `generations/shared/pieces/<pencək>+<alt>.v2.png` (demo) və ya `<user>/pieces/...` kimi bir dəfə saxlanılır və təkrar istifadə olunur.
7. **Kredit:**
   - Yalnız yeni yaranan qat üçün çıxır; xəta olsa qaytarılır (`spend_credits` / `refund_credits`).
   - Gündəlik limit `credit_ledger` üzərindən sayılır, yükləmə də `delta 0, reason 'upload'` ilə.
   - Limitsiz hesablarda kredit çıxmır.
8. **Avatar yaddaşı:**
   - Hər avatarın əynindəkilər və son açıq avatar Supabase `user_metadata.worn` / `wornAvatar`-da saxlanılır (`/api/worn`).
   - Səhifə açılanda `cacheOnly: true` ilə bərpa olunur: heç vaxt pul xərcləmir.
   - Gec gələn köhnə cavab yenisini əvəz edə bilməz (`viewToken`).
9. **Vaxt:**
   - FASHN ~11 san, ilk geyinmə ~15–25 san.
   - Yeni pencək + alt cütü ilk dəfə ~1 dəqiqəyə yaxın (73 san ölçülüb, buna Kontext + yoxlama da daxildir).
   - Keşdən gələn bir neçə saniyədir.
   - 2–3 saniyə bu texnologiya ilə mümkün deyil. İstifadəçiyə deyilib, gözləmə effekti bunu yumşaldır.

**Sınanıb və alınmayıb (bir daha etmə):**
- **Kontext Multi** (iki şəkli birləşdirmək): pencəyi əyir, cibə köynək qoyur. Bir dəfə yaxşı çıxdı, növbəti dəfə istifadəçidə pis çıxdı. Sistemdən çıxarılıb.
- **Adamın şəkli üzərində Kontext** (pencək geyindirmək, içlik doldurmaq, yana/arxaya çevirmək):
  - adamı dəyişir (kişi → qadın),
  - kadrı kəsir (baş, ayaq gedir),
  - ayaqqabını dəyişir.
- **Yan/arxa görünüş** FASHN ilə avatarın yan/arxa şəkli üzərində: bəzən əla, bəzən qara kofta, uzun palto, ağ şalvar. Etibarsızdır, ona görə **fırlatma ləğv olundu**.
- **Piksel maskası ilə içliyi bərpa etmək:** şəkli korladı.
- **FASHN `performance` rejimi:** sürət qazancı az, köynəyin qolunu qısaltdı.
- **`segmentation_free: false`:** səbəb kimi şübhələnildi, indi istifadə olunmur (standart dəyər).

**Real sınaqla təsdiqlənib:**
- köynək üstünə pencək (m1),
- pencək + futbolka (m1, f2),
- şalvar, ətək, köynək, bluz (f1, m1, m3),
- 3 kofta + 3 köynək/bluz geyim şəkli (hamısı təmiz, hamısı yoxlamadan keçdi),
- geyim təmizləmə (manekensiz).

**Hələ real sınanmayıb:**
- şortik üstünə şalvar (nümunə şortik yoxdur),
- pencək üstünə palto,
- yeni kodla öz paltarını yükləyib geyindirmək,
- hicablı avatarda pencək,
- telefonda real cihaz,
- Günün kombini real öz geyimlərlə (Gemini zənciri yoxlanıb, axın yox).

**Hələ yoxdur:**
- ayaqqabı, hicab/baş geyimi, aksesuar geyindirmə (şkafda görünür, "tezliklə" toast çıxır; FASHN bunları bilmir),
- 4K linza (Clarity pulludur).

---

## 8. Fayl xəritəsi (`full/`)
- **`src/lib/wardrobe/`**
  - `catalog.ts`: kateqoriyalar, demo geyimlər, avatarlar, limitlər, `GARMENT_PROMPT`.
  - `server.ts`: Fal və Gemini köməkçiləri, tavan.
  - `tryon.ts`: geyindirmə axını.
  - `weather.ts`
- **`src/app/api/`**
  - `tryon`, `worn`, `look`, `weather`, `outfits`
  - `wardrobe` (POST yükləmə), `wardrobe/[id]` (DELETE, şəkilləri və nəticələri silir), `wardrobe/detect`
- **`src/components/wardrobe/`**: `WardrobeStudio.tsx`, `Closet.tsx`, `Podium.tsx`, `DayPanel.tsx`, `wardrobe.css`
- **`src/components/`**: `Header.tsx`, `AuthForm.tsx`, `AdminShareForm.tsx`
- **`src/app/actions/`**: `auth.ts`, `admin.ts`; `src/app/[locale]/admin/page.tsx`
- **`src/lib/`**: `admin.ts` (`isOwnerUser`, `isUnlimitedUser`), `supabase/server.ts` (`connection()` ilə, "Date.now" xəbərdarlığına görə)
- **`src/i18n/dictionaries.ts`**: bütün mətnlər EN/AZ/TR. İşlənməyən açarlar var: `view_failed`, `dressView`, `drag`. Təmizləmək olar.
- **`scripts/fal/`**: `lib.mjs` (tavan, ledger), `backs.mjs` (arxa görünüş, artıq lazım deyil), digər asset skriptləri.
- **`public/assets/avatars/*-back.*`**: yaradılıb, işlənmir. Silmək və ya gələcək üçün saxlamaq istifadəçinin qərarıdır.
- **`assets-src/sheets/`**: kontakt-vərəqlər.

---

## 9. Phase 4 — AVATAR və OUTFITS (PRD 4-B, 4-C və istifadəçinin istəkləri)

### A) AVATAR səhifəsi
- Yuxarıdakı **AVATAR** tabı öz avatarını yaratmaq üçündür. Podiumun altındakı 8 avatar sırası **qalır**, istifadəçinin yaratdığı avatarlar da oraya əlavə olunur (istifadəçiyə belə deyilib).
- **İki yol:**
  1. Öz şəklini yükləmək: öndən (məcburi), yandan, arxadan + bədən ölçüləri (boy, çəki, çiyin, sinə, qarın, bel, omba).
  2. Baza avatarı tənzimləmək: dəri tonu, üz forması, saç (keçəl, qısa, uzun, buruq, saqqal), hicab bağlama forması, bədən ölçü slayderləri.
- **İstifadəçi istəyi:** öz şəklini yükləyəndə yalnız fon silinməsin, şəkil baza avatarlar kimi səliqəli görünsün (paltar qırışları, işıq).
  - **Diqqət:** adamın şəkli üzərində Kontext adamı dəyişir (7-ci bölmə). Təhlükəsiz yol: fon silmə (BiRefNet) + studiya işığı/kölgə, `sharp` ilə rəng/işıq düzəlişi + kadr tənzimləmə.
  - "Səliqəli paltar" lazımdırsa, istifadəçinin öz paltarını FASHN ilə neytral baza geyimə dəyişmək ideyası var, amma əvvəlcə bir neçə nümunə ilə sına və şəxsiyyətin dəyişmədiyini gözlə yoxla.
  - Planı və xərci əvvəlcə istifadəçiyə göstər.
- **Yaş qrupları:**
  - Uşaq/yeniyetmə (8–17) avatarları (tb1–tb2, tg1–tg2 hazırdır, hələ gizlidir) yaş qaydaları ilə açılır: açıq-saçıq geyim qadağası (məcburi), uyğun bədən nisbəti.
  - Bunun üçün kateqoriya və moderasiya qaydası yaz (FASHN `moderation_level: "conservative"` artıq var).
- **Hicab / Modest Fashion rejimi:** `profiles.modest_mode`. Qol və boyun bağlı olmalıdır, açıq geyimlərdə xəbərdarlıq ver.
- **Smart Fit-Ratio:** bədən ölçüsü ilə geyim ölçüsünü (XS–XXL) və kəsimi (slim/regular/oversize) müqayisə et, nəticəni dar/normal/bol göstər. Bunu necə vizual edəcəyimizi (FASHN parametri yoxdur) əvvəlcə təklif kimi gətir.
- **DB:** `avatars` cədvəli `0001`-də var (measurements jsonb, photo_paths, hijab_style və s.). Şəkillər `user-photos` bucket-ında RLS ilə saxlanılır. Avatar silinəndə şəkillər həmişəlik silinməlidir.
- **Geyindirmə:** indiki `runTryOn` `base:<avatar>` açarı ilə işləyir. Öz avatarlar üçün `avatar:<uuid>` açarı və model şəkli (öz fotosu) əlavə et. Geyindirmə yalnız öndən.

### B) OUTFITS səhifəsi
- Saxlanılmış kombinlər (`outfits` cədvəli; Günün kombinindəki "Yadda saxla" düyməsi artıq oraya yazır).
- Tədbir filtri: İş/Ofis, Universitet/Məktəb, Toy/Ziyafət, İdman, Gəzinti, Səyahət (`outfits.occasion` check-i var).
- Kombini bir kliklə yenidən geyindirmək: keşdən pulsuz.

### C) Günün kombini, genişləndirmə (istifadəçinin istəyi; Phase 4-ün sonu və ya Phase 5, istifadəçi ilə razılaşdır)
- **İki mənbə:**
  - istifadəçinin öz qarderobu (yalnız plan alanlar),
  - trendlər (hamı, pulsuz plan da), kişi, qadın, hicablı (və yaş qrupu) üçün ayrı.
- **Hava sabitliyi:**
  - Hava kəskin dəyişməyincə (temperatur aralığı/yağış eyni qalırsa) eyni kombin göstərilsin və token xərclənməsin.
  - 10 gün eyni isti olsa, eyni kombin.
  - Temperatur həddlərini peşəkar təyin et (məsələn, 5 °C addımlarla) və izah et.
- **Plan alanlar "bəyənmədim, dəyiş"** deyə bilər:
  - plan üzrə gündəlik limitlə (xərc və istifadəçi rahatlığına görə özün təyin et, istifadəçiyə göstər),
  - həm öz qarderob kombinində, həm trend kombinində.
- **Tarixçə:** əvvəlki kombin yadda qalsın, **"Geri"** düyməsi ilə ona qayıtmaq olsun.
- **İzah:** hər kombinin altında niyə bu havaya uyğun olduğu, paltarların bir-birinə necə uyduğu, niyə bunu üstdən, bunu altdan geyindiyimiz.
- Hazırkı vəziyyət: `daily_looks` cədvəli və `/api/look` var (günə bir kombin, 10 shuffle, `gemini-flash-*`).

### D) Phase 4-də qalan digər işlər (prioritetləri istifadəçi ilə razılaşdır)
- Ayaqqabı, hicab/baş geyimi, aksesuar geyindirmə: yeni yol araşdırılmalı (FASHN Max ayaqqabı/çanta dəstəkləyir, qiyməti dəqiqləşdir) və nümunə ilə sınanmalı.
- 7-ci bölmədəki "hələ real sınanmayıb" siyahısı. Fal pulu olanda minimal nümunə ilə yoxla.
- Müştəri tavanı (6.90) qaldırılmalıdır.
- `git init`.

### E) Sonra (Phase 5 və pulsuz versiya)
- **Ödəniş və admin:** planlar və kreditlər (yuxarıdakı rəqəmlərlə), M10 adapteri, admin sifariş təsdiqi.
- **Ictimai səhifələr:** Hero-dan sonra Features, Pricing, FAQ, About/Contact, footer (Privacy, Terms, Refund), hüquqi səhifələr.
- **Deploy:** öz domen, Node.js hostinqi.
- **`free/` versiyası.**

---

## 10. Xərc və iqtisadiyyat (istifadəçiyə izah olunub)
- **Geyindirmə xərci:**
  - Bir paltar ≈ $0.075 (0.13 ₼).
  - Pencək ilk dəfə + $0.04.
  - Çıxarmaq və təkrar geyinmək pulsuzdur.
  - Köynək + pencək ilk dəfə ≈ 19–20¢. İstifadəçi soruşmuşdu, normaldır.
- **Paltar yükləmə:** ~$0.04 (Kontext). Fon silmə faktiki pulsuzdur.
- **Gemini** (tanıma, təsvir, yoxlama, kombin) indiki həcmdə pulsuz kvotadadır; real hesab vəziyyətini yoxlamamışıq.
- **Güzgü ekranlar sualı:** istifadəçi soruşdu. Cavab: onlar əvvəlcədən hazırlanmış 3D paltar modelləri və bədən izləmə ilə işləyir, istifadəçinin foto ilə yüklədiyi paltara uyğun deyil.

---

## 11. Phase 3 yekun vəziyyəti
- Kod tamamlanıb: `tsc`, `eslint`, `npm run build` keçir. 3 ölçüdə yoxlanılıb. Server loglarında yeni xəta yoxdur.
- Müvəqqəti test fayllarının hamısı silinib (`api/e2e`, `api/dump`, `api/diag`, `tryon-test.mjs`).
- Açıq risklər 7-ci bölmədəki "hələ real sınanmayıb" siyahısıdır. İstifadəçi Fal-a pul yükləyəndə ilk iş bunları minimal xərclə sınamaqdır.

---

## 11.1 Son düzəlişlər (10 noyabr, gec)
- **Dil keçidi:** tam səhifə yüklənməsi ilə işləyir (`LocaleSwitcher` adi `<a>`), çünki brauzer daxili keçid səhifənin kökünü yenidən qurur və qaranlıq tema itirdi, avatar köhnə məlumatla aça bilirdi. Əlavə qoruma: `ThemeKeeper.tsx` (layout-da) yaddaşdakı temanı qaytarır. Yoxlanıb: tünd → EN keçidi → tünd qalır.
- **İstifadəçinin hesabları:** `fexreddinmemmedov742008@gmail.com` (1 köynək yükləyib), `fexreddinmemmedov752008@gmail.com` (hazırda bununla girir, krediti 0), `support.wearcast@gmail.com` (sahib/admin, limitsiz). İkisi fərqli e-poçtdur; "paltarım itdi" deyəndə əvvəl hansı hesabla girdiyini yoxla.
- **Müştəri tavanı izahı:** `fal_budget_cap_usd` başlanğıcdan bəri bütün Fal xərcinin (`cost_log`, sınaqlar daxil) dollar həddidir. Keçiləndə adi istifadəçinin yeni geyindirməsi dayanır ("studiya dincəlir"), keşdən açılan kombinlər işləyir, admin/limitsizlər dayanmır. Krediti 0 olan istifadəçi əvvəl "kreditin qalmayıb" görür, tavan mesajına çatmır. Admin səhifəsində indi "Tavana qədər qalan" və "Tavan dolub" xəbərdarlığı var.

## 12. Gələcək söhbətdə dərhal yadda saxla
- İstifadəçi səndən **maksimum diqqət və məsuliyyət** gözləyir. "Alındı" deməzdən əvvəl özün real nəticəni gör.
- Sabaha planlaşdırılan: istifadəçi Fal-a $10 yükləyəcək, müştəri tavanını qaldıracaq.

---

## 13. İlk addım (yeni söhbətdə)
1. Bu faylı, `PROGRESS.md`, `CLAUDE.md` və memory-ni oxu.
2. `claude mcp list` ilə bağlantıları yoxla və 2–3 cümlə ilə istifadəçiyə de.
3. İstifadəçidən soruş: Fal balansı nə qədərdir? Müştəri tavanı qaldırılıbmı? `git init` edək?
4. Phase 4 planını qısa göstər (9-cu bölmə), prioritetləri və Fal xərc cədvəlini təsdiqlət. Ən böyük risk avatar şəklini "səliqəli" etmək və Smart Fit-dir; bunları əvvəlcə kiçik nümunə ilə sına.
5. Təsdiqdən sonra işə başla. Hər mərhələni 3 ölçüdə yoxla, `PROGRESS.md`-ni yenilə.
