# WearCast — Phase 4, 2-ci hissə (yeni söhbət üçün təhvil sənədi)

Sən WearCast startapının Baş Texniki Memarı, UI/UX Dizayneri və Full-Stack Developerisən. Bu, `HANDOFF-PHASE4.md`-nin davamıdır: Phase 4-ün birinci söhbəti bitdi (istifadə limiti doldu). **Axıra qədər oxu, sonra "10. İlk addım" bölməsinə keç.** Ziddiyyət olarsa bu sənəd `HANDOFF-PHASE4.md`-dən üstündür.

---

## 0. Oxuma ardıcıllığı
1. Bu fayl.
2. `HANDOFF-PHASE4.md`: **1-ci bölmə** (istifadəçi və iş üslubu), **2-ci bölmə** (qəti qaydalar), **4-cü bölmə** (alətlər, Avast, test üsulları) hələ də qüvvədədir. Onları yenidən oxu.
3. `PROGRESS.md` (sonda "Phase 4 — davam edir" hissəsi), `CLAUDE.md` (PRD), memory qovluğu.
4. Kod: aşağıdakı 3-cü bölmədəki fayl xəritəsi.

## 1. Vəziyyət (11 noyabr)
- **Git:** layihə artıq git depodur (`WearCast/` kökündə, 3 commit: `799a0fd` Phase 3, `6923f78` və `edebd75` Phase 4). `full/assets-src/` (1 GB orijinallar) və `.env*` git-ə daxil deyil. **assets-src-in ehtiyat nüsxəsini istifadəçi ayrıca saxlamalıdır.** Bir şeyi pozsan, `git diff` / `git checkout` ilə geri qaytar.
- **SQL migrationlar:** `0001`, `0002`, `0003_avatars_outfits.sql`, `0004_look_history.sql` hamısı istifadəçi tərəfindən işə salınıb (Günün kombini real işləyir, `look_history`-də qeydlər var).
- **Fal.ai pulu:** bu söhbətdə istifadəçi $10 yükləyib (balans 10.35 $ idi), mənə iki dəfə $1.50 icazə verib (cəmi $3.00). **Mən təxminən $2.4 xərcləmişəm, yəni icazənin ~$0.6-i qalıb.** Real balansı istifadəçidən soruş. **Yeni icazə almadan Fal-da heç nə işlətmə.**
  - `cost_log` cəmi $13.30 (BiRefNet $0.01 yazılır, əslində pulsuzdur, ona görə real xərc azdır). Müştəri tavanı `app_settings.fal_budget_cap_usd` = 20 (istifadəçi qoyub).
  - Skript tavanı `scripts/fal/lib.mjs`-də `BUDGET_CAP_USD = 10.85`, `ledger.json` cəmi 9.705. Bu sayğac tətbiqin xərclərini görmür. Yeni icazə verilsə, tavanı əl ilə qaldır.
- **Test hesabı (mənim yaratdığım, real adam deyil):** `wearcast.qa.p4@example.com`, parol `full/.env.test.local` faylındadır (git-ə düşmür, **dəyərini heç yerdə yazma**). Planı `premium` edilib, 10 kredit verilib. **İşin sonunda bu hesabı və faylı sil** (istifadəçidən soruş). Bu hesabın bugünkü avatar yaratma limiti (3) dolub; yenidən sınamaq üçün ya yeni test hesabı yarat, ya `credit_ledger`-dən həmin hesabın `avatar_made` sətirlərini silməyi istifadəçidən xahiş et (əvvəl bu SQL-i istifadəçi rədd etdi, ona görə icazəsiz silmə).
- **Dev server:** istifadəçi öz Chrome-unda `http://localhost:3000` işlədir. `.claude/launch.json`-a `wearcast-prod` (port 3100, `next start`) də əlavə etdim; əvvəl `npm run build` işə sal. Build son dəyişikliklərdən əvvəl keçmişdi; sonra `tsc` və `eslint` təmiz idi, **yeni build işə salınmayıb**.

## 2. Bu söhbətdə görülənlər (nə işləyir, nə yoxlanıb)
**Yoxlanıb (real Fal ilə, gözlə baxılıb):**
- Öz şəklindən avatar (qadın və hicablı test fotosu): fon silinir, studiya geyimi, bədən ölçüləri, kredit çıxır/qaytarılır.
- Öz paltarını yükləmək (kapüşonlu kofta): kateqoriya Gemini ilə düz tapıldı, təmiz şəkil alındı, əhatə (coverage) yazıldı.
- Geyindirmə öz avatarında (kişi): köynək, şalvar, kapüşon. Pencək hicablı avatarda (tək pencək halı).
- Kombini saxla → Kombinlər səhifəsi → "Geyin" (pulsuz, yaddaşdan).
- Günün kombini: istifadəçi öz ekranında gördü (öz qarderob, nümunə geyimlərlə, Azərbaycan dilində izahla işləyir).
- Ekranlar 3 ölçüdə: 1898×872, 1024×640, 375×812 (Wardrobe, Avatar, Outfits).
- Pulsuz yol: dəyişiklik yoxdursa avatar yaradılması (kredit çıxmır).

**Yoxlanmayıb (açıq deyirəm):**
- Tənzimlənmiş avatar (dəri tonu, saç, saqqal, bədən) **tətbiqin içində**. Yalnız skriptlə sınanıb: dəri tonu və buruq saç düzgün gəldi, amma Kontext sifəti və bədəni bir az dəyişir. Bədən sürüşdürücülərinin təsiri ümumiyyətlə sınanmayıb.
- Studiya geyimi **kişi və qadın** fotolarında yeni (son) kodla tətbiq içində. Skriptlə: kişidə yaxşı, qadında (geniş don) birinci cəhd uğursuz, `segmentation_free: false` ilə ikinci cəhd düzgün gəldi.
- Trend mənbəli Günün kombini, yeniyetmə və hicab auditoriyaları, "Başqa kombin" limiti, "Geri" oxları, şəhər dəyişəndə yenilənmə.
- Production build və yeni keçid sürəti (ölçü: əvvəl URL 18 ms, məzmun ~1.1 s idi; yeni versiyanın ölçüsü yoxdur). Tünd rejimdə yeni ekranlar. Safari/iPhone. Yeniyetmə və uşaq geyim qaydası real şəkillə.

## 3. Fayl xəritəsi (yeni və dəyişən)
- `full/src/lib/wardrobe/catalog.ts`: avatarlar (`BASE_AVATARS` indi 12, yeniyetmələr də), `AvatarCard`, `smartFit`, `coverageRule`, `customPrompt`, saç/saqqal siyahıları, `audienceOf`, `LookEntry`, `DAILY_LOOK_CHANGES`.
- `avatars.ts`: `loadAvatar`, `checkPersonPhoto` (3 səs), `dressInStudioOutfit` (neytral/hicab flat-lay, 3 səsli yoxlama, 2 cəhd), `makeCustomPicture`, `finishAvatar`, `purgeAvatar`, `measureCoverage`.
- `tryon.ts`: keş açarı **v7**, `quality` rejimi, `segmentation_free` yalnız pencək/paltoda `true`, bottoms üçün "bir addım" qısayolu, əvvəlki addımın şəkli birbaşa növbətiyə verilir, yoxlamalar paralel, `lap()` vaxt ölçüsü (yalnız dev-də logda `[tryon] ... +ms`).
- `looks.ts`: Günün kombini mühərriki (hava qrupu `weatherBand`, tarixçə, `look_history`), `server.ts`: `GEMINI_WRITING` (yazı üçün güclü modellər: `gemini-3-flash-preview` yaxşı Azərbaycan dili yazır), `describeError` (Supabase xətaları indi loga oxunaqlı düşür).
- `pages.ts`, `supabase/signed.ts` (imzalı linklər 45 dəq təkrar istifadə), `proxy.ts` (`getClaims`, yəni lokal yoxlama), `next.config.ts` (`staleTimes.dynamic: 30`).
- API: `/api/avatars` (+`[id]` DELETE), `/api/outfits` (+`[id]` PATCH/DELETE), `/api/look` (POST: `source`, `avatar`, `change`).
- UI: `components/avatar/AvatarStudio.tsx`, `components/outfits/OutfitsBoard.tsx`, `components/NavTabs.tsx`, `components/Skeletons.tsx`, `wardrobe/DayPanel.tsx` (yenidən yazıldı), `Podium.tsx` (öz avatarlar sırası, "+", Smart Fit çipi, Kombini saxla).
- Aktivlər: `public/assets/studio/outfit-neutral.png`, `outfit-modest.png`.
- Müvəqqəti test skripti: `scripts/fal/p4-avatar-test.mjs` (işin sonunda sil). Test şəkilləri `full/assets-src/p4-test/` (git-ə düşmür).

## 4. Əsas problem (1-ci prioritet): hicablı avatarda üst geyim hicabı pozur
**İstifadəçi şikayəti (şəkil göndərdi):** hicablı bazada (h1) ipək bluz geyindirəndə hicab kiçik çalma/papağa çevrildi, **boyun və çiyin açıq qaldı**. Bu, PRD-nin "Modest Fashion" qaydasını pozur və istifadəçi bunu xəta kimi gördü.

**Sübut (pulsuz yoxlandı, bazadan real nəticələr):** h1 avatarında iki nəticə var:
- pencək (`segmentation_free: true`): hicab və boyun saxlanılıb, düzgün.
- bluz (`quality` + `segmentation_free: false`): hicabın aşağı salxımı silinib, qalan hissə çalmaya oxşayır, boyun açıq.

**Ehtimal olunan səbəb (təxmin, kontrollu sınaqla təsdiqlənməyib):** `segmentation_free: false` rejimi köhnə geyimi silir. Hicabın sinəyə düşən salxımı "üst geyim" sahəsinə düşdüyü üçün birlikdə silinir. Mən bu rejimi şalvar/köynək xətasını (qısa, parlaq şalvar) düzəltmək üçün qoymuşdum (bax 6-cı bölmə), hicablı avatarı ayrıca sınamamışdım. Bu **mənim qaçırdığım hal idi**, istifadəçiyə bunu dürüst de.

**Təklif olunan həll (əvvəl planı və xərci göstər, təsdiq al):**
1. **Ən ucuz:** hicablı avatarlar (`avatar.modest`) üçün həmişə `segmentation_free: true` (silmə yoxdur). Yoxla: bluz və köynək, bir neçə avatarda (h1, h2, "QA hicab foto"), hər biri $0.075. Risk: şalvarda yenidən qısa/parlaq effekt ola bilər; şalvarı ayrıca yoxla.
2. **Etibarlı (deterministik):** geyindirmədən sonra modest avatar üçün **orijinal avatarın baş+hicab+boyun hissəsini** nəticənin üstünə yapışdır (BiRefNet alfa və sabit "çiyin xətti" nisbəti, `sharp` ilə). Pulsuzdur, hicab 100% saxlanılır. Yan təsir: üst geyimin yaxası ilə sərhəddə yumşaq keçid lazımdır.
3. **Yoxlama:** nəticədə hicabın salamat qaldığını Gemini ilə yoxla (3 səs), alınmasa krediti qaytar (studiya geyimindəki kimi).
4. **Keş:** hicablı avatarlarda köhnə pis nəticələr yenidən göstərilməsin deyə keş açarını bu avatarlar üçün **v8**-ə qaldır (mövcud pis nəticələr `generations`-da `v7` ilə qalıb, bunlar pulsuz "keş" kimi açılır).
5. Yoxlanılacaq hallar: bluz, köynək, pencək, şalvar, ətək, hamısı h1, h2 və foto ilə yaradılmış hicablı avatarda; sonra Günün kombini hicab auditoriyası ilə.

## 5. Digər açıq məsələlər (prioritet sırası ilə)
1. **Studiya geyimini** kişi/qadın/yeniyetmə fotolarında tətbiq içində yoxla (test şəkilləri `assets-src/p4-test/man-photo.jpg`, `woman-photo.jpg`, `hijab-photo.jpg`; brauzerdə yükləmək üçün müvəqqəti `public/qa-tmp/` qovluğu yarat və sonra **sil**).
2. **Tənzimlənmiş avatarı** tətbiq içində sınamaq, bədən sürüşdürücülərinin təsirini görmək ($0.04 hər nümunə). Kontext sifəti bir az dəyişir: bunu istifadəçiyə göstər, qərar versin.
3. **Smart Fit:** hazırda yalnız yazı (dar/oturan/ölçüsünə uyğun/rahat/bol). Ölçü cədvəli (`SIZE_CHART` `catalog.ts`-də) **mənim təxmini rəqəmlərimdir, real brend cədvəli deyil**. İstifadəçi şəkildə fərqi görməyi istəyə bilər; FASHN-da belə parametr yoxdur. Təklif et, soruş.
4. **Yeniyetmə qaydası:** real yeniyetmə avatarlarında (tb1, tb2, tg1, tg2) açıq-saçıq nümunə geyimin bloklandığını yoxla (qayda koddadır: `coverageRule`, pul xərclənmədən əvvəl yoxlanır). Nümunə geyimlərin hamısı uzun və uzunqoldur.
5. Günün kombini: trend mənbəyi, "Başqa kombin" limiti, hava dəyişəndə yenilənmə, tarixçə oxları. Bəzi cümlələr qəribə səslənir (məs. "nəfəslik"); `looks.ts`-də prompta Azərbaycan dili üçün nümunə əlavə etmək olar. Qarderob kiçik olanda nümunə geyimlərdən istifadə olunur (ekranda qeyd var).
6. **Sürət:** production build edib ölçmək (hədəf: məzmun <0.5 s). Əgər hələ yavaşdırsa, səbəb Supabase-ə hər getmənin ~0.4 s olmasıdır; bölgəni yoxla.
7. Tünd rejim, Safari/iPhone, real telefon.
8. Phase 4-ün əvvəlki siyahısından **hələ görülməyənlər:** ayaqqabı/hicab-baş geyimi/aksesuar geyindirmə (FASHN bilmir; FASHN Max və başqa yol araşdırılmalıdır), 4K linza (Clarity pulludur), `Settings` bölməsi (PRD-də var, hələ yoxdur), profil menyusu, istifadə olunmayan `dictionaries.ts` açarlarının təmizlənməsi (`view_failed`, `dressView`, `drag`).
9. **Phase 5:** ödəniş və M10, planlar və kreditlər (20/45/85 və 30/75/130), admin sifarişləri, ictimai səhifələr, deploy, `free/` versiyası.

## 6. Geyindirmə mühərriki: bu söhbətdə öyrənilən dərslər (təkrar səhv etmə)
- **Şalvar xətası belə tapıldı:** istifadəçi şalvarın qısa, parlaq və yalnış oturduğunu göstərdi. Yan-yana sınaq: `balanced` rejimi və köhnə geyimi saxlamaq (`segmentation_free: true`) modelin öz şalvarının formasını saxlayırdı; `quality` + `segmentation_free: false` tam uzunluqlu, mat şalvar və düymələnmiş köynək verdi (~17 s). Bu **hicablı avatarda hicabı pozur** (4-cü bölmə), ona görə hər dəyişiklikdən sonra hicablıda yenidən yoxla.
- Pencək/palto: silmə rejimi ayaqların arxasında artıq parça əmələ gətirdi və ayaqqabıları dəyişdi, ona görə pencəkdə `segmentation_free: true`.
- **Foto avatar studiya geyimi:** baza modelin şəkli geyim kimi etibarsızdır (hicabı da aparır). İşləyən yol: yalnız geyimin flat-lay şəkli (uzunqol, başsız, əlsiz). Qısaqollu köynək fotodakı uzun qolları üstündə qoyur. Mənbə flat-lay-lər `public/assets/studio/`-dadır.
- Gemini yoxlaması tək baxışda etibarsızdır (bir dəfə fonda gəzən insanları sayıb sağlam fotonu rədd etdi). Hamısı **3 səslə**: foto yoxlaması yalnız ≥2 səs eyni problemi deyirsə rədd edir; təmizlik yoxlaması ≥2 "ok" tələb edir.
- `segmentation_free` və `mode` qiyməti dəyişmir (FASHN $0.075). Pencək parçasının ilk hazırlanması +$0.04 Kontext.
- Supabase xətaları `Error` deyil, ona görə əvvəl logda "unknown error" görünürdü; indi `describeError` var. Avatar yaratma xətası əvvəl `name` sütununun boş qala bilməməsindən idi (indi `""` yazılır, ekranda "Sənin").
- `credit_ledger`-də avatar üçün ayrı `reason`-lar var (`avatar`, `avatar_refund`, `avatar_made`) ki, qaytarılan avatar krediti gündəlik geyindirmə limitinə düşməsin.

## 7. Mənim təyin etdiyim qərarlar (istifadəçi təsdiqləməlidir)
- **Avatar yaratma 1 kredit** (yalnız şəkil dəyişirsə: studiya geyimi və ya dəri tonu/saç/bədən dəyişikliyi). Dəyişiklik yoxdursa pulsuz. Studiya geyimi alınmasa kredit qaytarılır.
- **Gündəlik avatar yaratma limiti: 3** (`DAILY_AVATARS` `api/avatars/route.ts`-də).
- **"Başqa kombin" limiti (gündəlik):** sınaq 3, Starter 5, Plus 8, Premium 12 (`DAILY_LOOK_CHANGES`). Hava dəyişdiyi üçün yeni kombin hesablanmır.
- Hava qrupu: 5 °C addımlarla (ən soyuq və ən isti), yağış ≥50%, külək ≥9 m/s.

## 8. Test üsulları (əlavə, 4-cü bölməyə)
- Brauzer paneli gizli olanda `getBoundingClientRect().width` 0 verir: görünən elementi seçmək üçün üst elementlərin `style.display` yoxlanışından istifadə et. Hidrasiya bəzən yalnız real kliklə başlayır (`find` + `computer left_click` ref ilə).
- Fayl yükləmə: müvəqqəti şəkli `public/qa-tmp/`-ə qoy, səhifədə `fetch` + `DataTransfer` ilə `input.files`-ı doldur, `change` hadisəsi at; iş bitəndə qovluğu **sil**.
- Giriş: test hesabı ilə `/az/login`. Sınaq `?preview=1` yalnız dev-də və hesabsız baxışdır, real API-lər 401 verir.

## 9. Qaydalar xatırlatma
- Cavablar Azərbaycan dilində, sadə. Yoxlamadığını "işləyir" demə. Pullu addımdan əvvəl xərc cədvəli və təsdiq. Bir nümunə yox, bir neçə nümunə, şəkilləri özün aç və bax.
- `.env.local` dəyərlərini heç yerdə yazma. Supabase yalnız `supabase-wearcast`, oxuma sorğuları; sxem dəyişikliyi `000N_*.sql` faylı ilə, istifadəçi işə salır.
- UI-da "AI" sözü və robot ikonu yoxdur. "SHOP" yoxdur. Yeniyetmə/uşaq avatarlarında açıq-saçıq geyim yox. Hicabda qol və boyun örtülü olmalıdır. IDM-VTON yox.

## 10. İlk addım (yeni söhbətdə)
1. Bu faylı, `HANDOFF-PHASE4.md` (1, 2, 4), `PROGRESS.md`, `CLAUDE.md` və memory-ni oxu. Layihəni `WearCast/` qovluğundan aç.
2. `claude mcp list` ilə bağlantıları yoxla (2-3 cümlə de). `git log --oneline` və `git status` ilə vəziyyəti yoxla.
3. İstifadəçidən soruş: **Fal balansı nə qədərdir? Yeni sınaq üçün nə qədər icazə verir?** (Bu söhbətin icazəsinin ~$0.6-i qalıb.)
4. **Hicab problemi** üçün plan və xərc cədvəli göstər (4-cü bölmə), təsdiq al, sonra h1, h2 və foto avatarında bir neçə nümunə ilə sına. Birinci yol (modest üçün `segmentation_free: true`) və ya ikinci yol (baş+hicab yapışdırma) sənin tövsiyənlə.
5. Sonra 5-ci bölmənin 1-3 bəndləri (studiya geyimi, tənzimlənmiş avatar, Smart Fit sualı).
6. Hər mərhələni 3 ölçüdə yoxla, `PROGRESS.md`-ni yenilə, commit et. İş bitəndə müvəqqəti faylları (test skripti, QA hesabı, `.env.test.local`) təmizlə (istifadəçi ilə).
