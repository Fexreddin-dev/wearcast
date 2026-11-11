# WearCast — PROGRESS

Layihə qovluğu: `WearCast/full/` (Tam versiya). Pulsuz versiya sonra `WearCast/free/` kimi ayrıca yaradılacaq.

## Phase 1 — Təməl (TAMAMLANDI)

**Yaradılanlar**
- Next.js 16 (App Router, TS, Tailwind 4) — `full/`
- Dizayn tokenləri (açıq krem + tünd rejim, şüşə panel, accent `#B08D57`) — `src/app/globals.css`
- i18n EN/AZ/TR, URL-də dil (`/en`, `/az`, `/tr`) — `src/i18n/`, `src/proxy.ts`
- Header: loqo (mətn), Home, WARDROBE/AVATAR/OUTFITS (giriş edəndə), dil seçimi, Dark/Light düyməsi — `src/components/`
- Supabase auth: qeydiyyat, giriş, çıxış, e-poçt təsdiq callback — `src/app/actions/auth.ts`, `src/app/auth/callback/route.ts`
- Admin qapısı: yalnız `ADMIN_EMAIL` (təsdiqlənmiş e-poçt) — `src/lib/admin.ts`, `/[locale]/admin`
- Supabase sxemi + RLS + kredit funksiyaları + storage bucket-lar — `supabase/migrations/0001_init.sql`
- `.env.local` (URL və publishable key doldurulub) və `.env.local.example`
- Qovluqlar: `public/assets/{hero,avatars,wardrobe,trends}`
- `npm run build` uğurla keçir.

**Sizin etməli olduğunuz addımlar (Phase 2-dən əvvəl)**
1. `supabase/migrations/0001_init.sql` faylını Supabase-də işə salın (Dashboard > SQL Editor > faylın məzmununu yapışdırıb Run, və ya CLI: `supabase login`, `supabase link --project-ref ldaiogiflhlqvlxvymwk`, `supabase db push`).
2. `.env.local` içində `SUPABASE_SERVICE_ROLE_KEY` (secret key) yazın.
3. Supabase > Authentication > URL Configuration: Site URL `http://localhost:3000`, Redirect URL `http://localhost:3000/auth/callback`.
4. Phase 2 üçün `FAL_KEY` yazın.

**Qeyd:** Supabase layihəsi support.wearcast@gmail.com hesabındadır (mənim bağlı olduğum hesabda deyil), ona görə SQL-i siz özünüz işə salırsınız.
**QR:** M10 QR şəkli public/assets/payment/m10-qr.png yoludur (istifadəçinin göndərdiyi təmiz versiya, final).

**Hələ yoxlanmayıb:** brauzerdə vizual yoxlama və real qeydiyyat/giriş (Supabase sxemi tətbiq olunmayıb).

## Phase 2 — Asset generasiyası + Hero (TAMAMLANDI)

**Skriptlər** (`full/scripts/fal/`, yalnız serverdə/CLI-də işləyir, `FAL_KEY` brauzerə çıxmır):
- `lib.mjs` — $6 xərc tavanı, hər çağırış `cost_log`-a + `ledger.json`-a yazılır
- `avatars.mjs` (ön görünüş), `sides.mjs` (yan görünüş), `cutout.mjs` (BiRefNet fon silmə), `contact-sheet.mjs`
- Hər skript `--dry` (pulsuz yoxlama) və `--only id1,id2` (yeniləmə) qəbul edir

**Hazırdır:**
- 12 baza avatar × 2 bucaq (ön + yan), şəffaf fon — `public/assets/avatars/<id>-{front,side}.{png,webp}`
- Orijinallar (sayta getmir): `full/assets-src/avatars/`

- 8 demo geyim (şəffaf fon) — `public/assets/wardrobe/<id>.{png,webp}` + `manifest.json` (kateqoriya və hero sırası); skript `garments.mjs`

- f1 (hero qadın) əlləri açıq formada yeniləndi (`edit.mjs` — Kontext ilə düzəliş)
- m1 (hero kişi) əli cibdən çıxarıldı (Kontext)
- Hero şkafın yeni dizaynı: tağlı, palıd + bürünc şüşə + latun, mərmər postament (variant B) — `assets-src/hero/wardrobe-closed.png` (16:9 studiya)
- Qapıların açılma videosu (Kling 2.5, 5 san., 121 kadr) — `assets-src/hero/doors.mp4`, `frames/`; son kadr = `wardrobe-open.png`
- Kontext ilə ayrıca "açıq şkaf" şəkli dizaynı pozurdu, ona görə videonun son kadrı istifadə olunur
- Skript: `hero.mjs` (addımlar: `variants`, `stage`, `video`); kadrlar `ffmpeg-static` ilə çıxarılır

- Geyindirmə mərhələləri (FASHN + ayaqqabı üçün Kontext): `public/assets/hero/states/{man,woman}-{0..3}.{png,webp}` (0 = baza, 3 = tam geyimli). Skript `hero.mjs tryon [man|woman] [index]`

**Xərc:** $4.36 / $10 ümumi büdcə (Phase 2 tavanı $6 daxilində)

## Hero v2 (istifadəçinin videosundakı xətalardan sonra, TAMAMLANDI)

**İstifadəçi istəyi:** daha canlı və əyləncəli hero; şkaf solda, oğlan və qız sağda yan-yana, gülümsəyən, canlı.

**Yeni assetlər** (skript `scripts/fal/hero2.mjs`: `stage`, `video`, `smile`, `tryon`, `ending`; orijinallar `assets-src/hero2/`):
- Səhnə: şkaf solda (Kontext) + qapıların açılma videosu (Kling, LED işığı güclənir) — `public/assets/hero/v2/frames/{d,m}/`
- Gülümsəyən baza modellər (Kontext) + geyinmə mərhələləri: kişi şalvar → pencək (Kontext ilə, çünki FASHN köynəyi silib sinəni açıq qoyurdu) → loafer; qadın ətək → bluz → ayaqqabı — `public/assets/hero/v2/states/*.webp`
- Canlı final videosu (Kling): cütlük gülümsəyir, bir-birinə baxır, kişi pencəyini düzəldir; irəli+geri dövrə — `ending-{d,m}.mp4` (0.57 / 0.2 MB); başlanğıc kadrı kodun son görüntüsü ilə eynidir (`scripts/hero2-compose.mjs`, ortaq ölçülər `src/components/hero/layout.mjs`)

**Kod (`src/components/hero/Hero.tsx` + `globals.css`):**
- 3 raund, cüt-cüt geyinmə (alt → üst → ayaqqabı); paltar 3D dönərək uçur, bədənə çatmamış işığa çevrilib sönür, işıq zolağı yeni geyimi yuxarıdan aşağı açır
- Qadının paltarları kişinin başının üstündən keçir (heç kimin önündən keçmir)
- Kamera yavaş yaxınlaşır/sürüşür, LED parıltısı, modellər nəfəs alır (CSS), geyinəndə yüngül "dirçəlmə"
- Tagline sözləri raundlarla işıqlanır + 3 proqres zolağı; sonda zolaqların yerində "Create account / Sign in"
- Final: canlı videoya keçid (görünəndə oynayır, geri scroll-da dayanır)
- Scroll 380svh (telefon 330svh) — əvvəlkindən qısa

**Düzəldilən xətalar (videodan):** başlanğıcda tullanma (hero header-in altından başlayır), geniş ekranda kəsilmə və tağın header altına girməsi (səhnə həmişə bütöv, yan zolaqlar yumşaq birləşir), paltarın bədənə "yapışdırılmış" görünməsi, başlığın şkafın üstünə düşməsi, panelin postamenti örtməsi, pencəyin qüsuru

**Yoxlanıb (brauzerdə):** 1024×470 (2.18:1, istifadəçi ekranı nisbəti), 1024×640 (noutbuk), 375×812 (telefon); EN və AZ; bütün raundlar və final video. Real 1898×872 ölçüsü hesablama ilə yoxlanıb.
**Yoxlanmayıb:** `prefers-reduced-motion` (kodda statik final kadrı var), Safari/iPhone real cihaz.

**Qeydlər:**
- Kiçik ekranlarda (məs. 1024×640) böyük "WearCast" başlığı gizlənir (header-də ad var), mətn başlara toxunmasın deyə
- Köhnə v1 hero faylları `public`-dən silindi (orijinallar `assets-src/hero/`-da); public-də state PNG-ləri yoxdur, `cutout.mjs` təkrar işlədilsə yenidən kəsəcək (xərc)
- `ThemeToggle.tsx`-də Phase 1-dən qalan lint xətası (build-ə təsir etmir)

## Hero v3 — "Kamera səyahəti" filmi (TAMAMLANDI)

**Niyə:** istifadəçi v2-ni qısa/yarımçıq hiss etdi (bir güclü scroll-da bitirdi); istinad saytlardakı kimi səhnədən-səhnəyə kəsilməz kamera hərəkəti istədi.

**Ssenari (tagline = 3 fəsil):**
1. **Your Weather.** — buludların üstü + şüşə hava kartı (Səhər/Gündüz/Axşam, rəqəm yoxdur) → kamera enir → yağışlı pəncərə → şüşədən içəri studiyaya
2. **Your Wardrobe.** — qapılar açılır → kamera şkafın içinə girir → qızılı "çertyoj" skan xətti (rəqəmsal şkaf) → kamera geri çəkilir
3. **Your Style.** — cütlük işıqla görünür → 3 raund geyinmə → canlı final videosu → "Create account / Sign in"

**Texniki:**
- Videolar Kling first+last frame ilə zəncirlənib (hər videonun sonu növbətinin başlanğıcı); skript `scripts/fal/hero3.mjs` (`keys`, `videos`), orijinallar `assets-src/hero3/`
- Kadr setləri `scripts/build-hero-film.mjs` → `public/assets/hero/film/{c1..c4}/{d,m}/` + `gold-{d,m}.webp`, manifest `src/components/hero/film.json` (kompüter 5.7 MB, telefon 1.8 MB, fəsil-fəsil yüklənir)
- `Hero.tsx`: Lenis (ətalətli yumşaq scroll) + GSAP ScrollTrigger, scroll 1000svh (telefon 860svh); fəsil başlıqları hərf-hərf; "01/03" sayğac; mausa paralaks; c1→c2 keçidində yumşaq dissolve (kliplər ~3% fərqli miqyas)
- Ambient fon: cari kadrın bulanıq nüsxəsi ekranın boş kənarlarını doldurur (geniş ekran və telefon)
- Desktop mətni başlara toxunmasın deyə avtomatik kiçilir
- Köhnə v2 kadrları və `manifest.json` silindi; v2-dən yalnız `states/`, `ending-*.mp4`, `ending-poster.webp` qalır

**Yoxlanıb:** 1024×470 (2.18:1), 1024×640, 375×812; EN və AZ; bütün fəsillər, skan, geyinmə, final.
**Yoxlanmayıb:** reduced-motion, real iPhone/Safari, real 1898×872 ekranda göz ilə.

**Xərc:** ümumi $5.57 / $10 (bu filmə $1.21). Qalan ~$4.4. Tavan `lib.mjs`-də $6.40.

## Hero: Səhər/Gündüz/Axşam düymələri (TAMAMLANDI)
Kart işləyən düymələrə çevrildi; seçim yalnız bulud səhnəsinin rəngini dəyişir (CSS qatları, Fal xərci $0), kamera pəncərəyə çatmamış sönür. Standart: Səhər. Gündüz: ağ buludlu açıq səma (ikinci variant, tünd mavi bəyənilmədi). Axşam: tünd səma, ulduzlar, ay, açıq başlıq. Rəng qatları heç vaxt `opacity < 1` olan ümumi qaba salınmamalıdır, yoxsa buludlarla qarışmır (axşam gecikməsinin səbəbi idi). Layout-dakı tema skripti `next/script`-ə keçirildi (Issues xətası). `ThemeToggle.tsx` lint xətası da düzəldildi.

## Bağlantılar və təhvil (TAMAMLANDI)
`context7` və `supabase-wearcast` qoşulub (Connected), `magic` (21st.dev) əlavə olunub, ilk yoxlamada vaxt aşımı verdi. Phase 3 üçün yeni söhbətə təhvil sənədi: `HANDOFF-PHASE3.md`.

## Phase 3 — WARDROBE (TAMAMLANDI, 10 noyabr; açıq risklər və növbəti plan: `HANDOFF-PHASE4.md`)

> Aşağıdakı qeydlər xronolojidir; ən sonuncular etibarlıdır (yalnız ön görünüş, üst-üstə geyinmə, tək-şəkil Kontext + Gemini yoxlaması). `.env.local` 10 noyabrda yoxlanıldı: hamısı dolu, dəyər əvvəlindəki boşluqlar təmizləndi.

**Yaradılanlar:** `/[locale]/wardrobe` üç sütun (`src/components/wardrobe/`), API-lər `src/app/api/{wardrobe,tryon,weather,look,outfits}`, `src/lib/wardrobe/`, migration `supabase/migrations/0002_wardrobe.sql`, skript `scripts/fal/backs.mjs` (`--only` məcburidir).
- Kredit, xətada qaytarma, keş (`generations.cache_key`), plan limiti serverdə. Tətbiq daxilində də Fal xərci `app_settings.fal_budget_cap_usd` (6.90) ilə qorunur. Tavan `lib.mjs`-də $6.90.
- Podiumda yalnız 8 böyük avatar (uşaq/yeniyetmə Phase 4). Geyim fırlanması: ön, yan, arxa, güzgülü yan arasında keçid (əsl 360° deyil). Yan/arxa geyindirmə yalnız düymə ilə, kredit çıxır.
- Giriş edəndən sonra `/wardrobe`-a yönləndirir. `?preview=1` yalnız lokal dev rejimində hesabsız baxışdır.

**Yoxlanıb:** `tsc`, `eslint`, `build`; brauzerdə 1898×872, 1024×640, 375×812 (hesabsız baxış): düzülüş, drag, "Curating", toast, giriş olmayanda 401. Tünd rejim hesablanmış stillə yoxlanıb.
**Yoxlanmayıb (0002 işə düşməyib, hesab yoxdur):** real geyindirmə, `+ Add Item`, kredit axını, OpenWeather və Gemini cavabı (model adı `GEMINI_MODEL` ilə dəyişir, standart `gemini-2.5-flash`), linzanın göz ilə yoxlanması.
**Məhdudiyyət:** ayaqqabı, hicab/baş geyimi, aksesuar şkafda görünür, amma geyindirmə yoxdur (FASHN yalnız üst/alt/don geyindirir). Clarity işə salınmayıb, linza mövcud şəkil keyfiyyətini göstərir. Hicab rejiminin geyim qaydaları Phase 4-dədir.

**Xərc:** $5.62 / tavan $6.90 (arxa görünüş nümunəsi f1, $0.05).

**İstifadəçi testindən sonra düzəlişlər:**
- Yüklənən geyim əvvəl Kontext ilə səliqəli kataloq şəklinə salınır, sonra fon silinir ($0.05 geyim başına); bu addım alınmasa orijinal şəkil işlənir. Geyindirmə də səliqəli versiya ilə gedir.
- Yan/arxa bucaq: model çevrilib dayananda hazır ön görünüşdən Kontext ilə avtomatik yaranır ($0.05 bucaq başına, kredit çıxmır, kombin üzrə keşlənir). Kredit qərarı istifadəçidə ola bilər.
- FASHN `segmentation_free: false` (alt paltarın kənardan görünməsini azaltmaq üçün).
- Fırlatma hər iki tərəfə limitsiz; ayaqlar xalçanın ortasında; nümunə geyimləri çıxarıla bilir (brauzerdə yadda qalır, "Nümunələri göstər" qaytarır); ayaqqabı/aksesuarda asılqan yoxdur.
- Yoxlanıb: tip, lint, üç ölçü, fırlatma, düzülüş. Real Kontext nəticələri istifadəçi testi ilə yoxlanacaq.

**İkinci test turundan sonra:**
- Pencək/palto artıq FASHN ilə deyil, Kontext Multi ilə mövcud üst geyimin üstünə geyindirilir (FASHN üst geyimi tamam əvəz edirdi). Şalvar/ətək/donda `segmentation_free` standartdır (ayaqqabının dəyişməsi ehtimalən ondan idi); yalnız üst geyimdə `false`. Keş açarı `v2`.
- Geyindirmə FASHN `balanced` (~8 san, `quality` 12–17 san idi). Geyim seçilən kimi bədəndə ön baxış görünür. Yan+arxa geyindirmədən 2.5 san sonra özü hazırlanır (çevirən kimi də dərhal). Avatar/nümunə yükləmələri yaddaşda saxlanır, BiRefNet Light.
- Kredit: 1 kredit = 1 geyim + bütün bucaqlar. Gündəlik: trial 2, Starter 4, Plus 8, Premium 14; yükləmə gündə 10; trial qarderob 4. Migration lazım olmadı (`credit_ledger` üzərindən sayılır).
- Phase 5 üçün plan kreditləri (ən pis hal $0.185 = 0.3145 ₼/kredit): endirimli 10/22/40, normal 15/35/65.
- Admin: `/[locale]/admin` (icazəsizlərə 404). Sahib `ADMIN_EMAIL`; paylaşma Supabase `app_metadata.wearcast_unlimited` ilə. Limitsiz hesablar kredit/plan/tavana bağlı deyil, xərc `cost_log`-a yazılır. Müştəri tavanı admin səhifəsindən dəyişilir.
- X düyməsi yalnız həmin geyimin üstündə. Telefon üçün `allowedDevOrigins` (lokal IP dəyişsə yenilə).
- Yoxlanmayıb: real Fal nəticələri (pencək keyfiyyəti, ayaqqabı, faktiki gözləmə). `kontext/multi` qiyməti saytda görünmədi, $0.04 ehtimalla yazılıb.

**Real sınaqlardan sonra son geyindirmə sistemi (`src/lib/wardrobe/tryon.ts`) — yuxarıdakı Kontext Multi, Kontext ilə çevirmə üsullarını əvəz edir:**
- Hər bucaq (ön/yan/arxa) FASHN `balanced` ilə avatarın öz həmin poza şəkli üzərində geyinir (Kontext ilə çevirmə başqa adam və ayaqqabı çəkirdi). Cache açarı `v4`. Ön + yan + arxa birlikdə başlayır (yan/arxa 0.9 san sonra), kredit yalnız öndə.
- Pencək (yalnız ön): əvvəl geyim şəkli "pencək + içlik" kimi hazırlanır (tek şəkil: Kontext; köynək varsa Kontext Multi yalnız geyimlər arasında), sonra FASHN geyindirir. Adam üzərində Kontext işlətmək olmaz: kadrı kəsir.
- Arxa: üst geyim/don üçün geyimin arxa şəkli bir dəfə yaradılır (`generations/.../pieces`, varsa istifadəçinin arxa fotosundan), şalvar/ətəkdə ön şəkil kifayətdir.
- Nəticələr jpg/webp saxlanılır (PNG 5 san aparırdı). BiRefNet Light.
- Gemini `gemini-flash-latest` (2.5-flash 404 verir), 25 san vaxt limiti. Yüklənən geyim üçün tidy prompt manekeni də silir.
- Həqiqi ölçülər (dev): FASHN ~11 san, ümumi ilk geyinmə təxminən 20–27 san; təkrar geyinmə keşdən bir neçə saniyə.
- Yoxlanıb (real Fal): m1 pencək 3 bucaq, f2 pencək, zəncir şalvar+köynək+pencək, f1 şalvar/ətək, köynək, arxa şalvar, geyim tidy, Gemini; keş, refund; brauzerdə 3 sorğu paralel, X yalnız geyim üstündə. Admin 404.
- **Kredit iqtisadiyyatı yeniləndi:** 1 kredit ≈ $0.255 (0.4335 ₼). Phase 5 kreditləri: endirimli 8/16/30, normal 12/28/50.
- **Məhdudiyyət:** ayaqqabı, hicab/baş geyimi, aksesuar hələ geyindirilmir.
- **Xərc:** cost_log $9.20 (BiRefNet şişirdilmiş yazılır). Müştəri tavanı 6.90 aşılıb: admin səhifəsindən qaldırılmalıdır, yoxsa adi istifadəçilər "studiya dincəlir" görür. Skript tavanı `lib.mjs`-də $7.90.

**Vəziyyət (10 noyabr):** istifadəçi testində yan/arxa FASHN nəticələri təsadüfi xətalı çıxdı (qara kofta, uzun palto, ağ şalvar). FASHN yalnız ön görünüşdə etibarlıdır. Fal balansı təxminən $1; yeni qərar gözlənilir, sınaq etmə. Blocking-route xəbərdarlığı `createClient`-də `connection()` ilə həll edildi, admin üçün "kredit çıxılmadı" yazısı düzəldi.

**Son qərar (10 noyabr): yalnız ön görünüş, fırlatma yoxdur.** Yan/arxa kodu silindi (`*-back` şəkilləri public-də qalır, işlənmir).
- Üst-üstə geyinmə: limit 6 geyim; yeni geyim əvvəlkini silmir. Sıra: alt → don → üst → pencək/palto, eyni növdə geyinmə ardıcıllığı. Son geyimi çıxaranda əvvəlki vəziyyət keşdən pulsuz gəlir; ortadakını çıxaranda həmin kombin əvvəl yaranmayıbsa, kredit çıxır. Pencək/palto altındakı üst geyimlə birlikdə hazırlanır.
- Hər avatarın kombini hesabda (`user_metadata.worn`) saxlanılır, açılanda `cacheOnly` ilə pulsuz bərpa olunur.
- Yükləmədə kateqoriya Gemini ilə avtomatik seçilir (`/api/wardrobe/detect`), istifadəçi dəyişə bilər. Gemini üçün ehtiyat model zənciri (`askGemini`).
- 1 kredit ≈ $0.075. Phase 5 kreditləri: endirimli 20/45/85, normal 30/75/130.
- Fal balansı təxminən $1. Canlı yoxlanmayıb: real şortik→şalvar, köynək→pencək→palto, yeni kod ilə.

**Köynək üstünə pencək xətası (10 noyabr, həll olundu):** səbəb FASHN deyil, "pencək + köynək" geyim şəklini yaradan Kontext Multi idi (pencəyi əyirdi, pis şəkil yaddaşda qalırdı). İndi yalnız pencəyin öz şəkli tək-şəkil Kontext ilə redaktə olunur, alt geyim Gemini ilə təsvir edilir; şəkil saxlanmazdan əvvəl Gemini iki dəfə yoxlayır (`pieceIsClean`, ikisi də "ok" olmalıdır; pis şəkildə 4/4, yaxşı şəkildə 4/4), alınmasa 1 dəfə yenidən yaradılır, yenə alınmasa xəta və kredit geri. Fayl adı `+<alt>.v2.png`, üst-üstə pencək kombinləri üçün keş açarı `v5`. Real sınaq: m1 köynək+pencək əla; 3 kofta + 3 köynək/bluz şəkli hamısı təmiz.
- Gözləmə: şalvar/ətək şəkli yazının altına düşür (3 ölçüdə üst-üstə düşmür, ölçülüb), yazı həmişə üstdədir.
- Avatarlar arasında sürətli keçiddə köhnə cavab yenisini əvəz edə bilməz (`viewToken`).
- Yoxlanıb (saxta cavabla): şalvar→ətək→köynək→pencək sırası, üst qatı çıxaranda əvvəlki qatlar qalır, Reset.
- Yoxlanmayıb (real): şortik→şalvar (nümunə yoxdur), pencək üstünə palto, yeni kodla öz paltarını yükləmə. Yeni pencək+alt cütü ilk dəfə ~1 dəqiqə çəkə bilər (73 san ölçülüb), sonrakılar ~20 san.
- Xərc: köynək 7.5¢, pencək 7.5¢ + ilk dəfə geyim şəkli 4¢. Fal balansı təxminən $0.34.

**Gec düzəlişlər (10 noyabr):** dil keçidi tam səhifə yüklənməsi ilə (tema və avatar artıq sıfırlanmır), `ThemeKeeper`, admin səhifəsində "Tavana qədər qalan". İstifadəçinin iki ayrı hesabı var (…742008 və …752008); yüklənən köynək birincidədir.

**Gələcək (istifadəçi istəyi, Phase 4/5/free):** günün kombini: öz qarderobdan (plan alanlar) və trendlərdən (hamı), kişi/qadın/hicab üçün ayrı; hava kəskin dəyişməyincə eyni kombin qalsın (token xərclənməsin); "bəyənmədim, dəyiş" plan üzrə limitlə; əvvəlki kombinlərə "geri" düyməsi; hər kombinin altında niyə bu havaya uyğun olduğu və niyə bu üst-altda geyinildiyi izahı. Limitləri xərc və istifadəçi dostluğuna görə özün təyin et. AVATAR səhifəsi öz avatarı yaratmaq üçündür; podiumun altındakı avatar sırası qalır, istifadəçinin avatarları oraya əlavə olunur.

**Qeyd olunan istəklər:**
- Phase 4 (AVATAR): istifadəçi öz şəklini yükləyir (ön/yan/arxa) + bədən ölçüləri; şəkil yalnız fon silinmir, baza avatarlar kimi səliqəli hala salınır (paltar qırışları və s.).
- Phase 5: hero-dan sonra Features, Pricing, FAQ, About/Contact, footer.
- Pulsuz versiya (`free/`): yalnız kombinlər və günün havasına uyğun kombinlər.

**Giriş xətası (həll olundu):** Avast Web/Mail Shield HTTPS-i yoxlayır, Next serveri isə onun sertifikatına etibar etmirdi (`fetch failed`, `UNABLE_TO_VERIFY_LEAF_SIGNATURE`). `npm run dev` indi `node --use-system-ca` ilə işləyir. Yalnız lokal mühitə aiddir, TLS yoxlaması söndürülməyib. Forma indi konkret xəta mesajları və parolu göstər düyməsi var.

## Növbəti mərhələlər
- **Phase 4:** AVATAR və OUTFITS, hicab/yaş məntiqi, Smart Fit-Ratio, keşləmə və kredit axını
- **Phase 5:** Planlar, M10 ödəniş adapteri (ödəniş qəbulu `PAYMENT_PROVIDER` ilə açılıb-bağlanır), admin paneli, hüquqi səhifələr, Contact, deploy

## Qərarlar
- Valyuta AZN (Starter 6.99→4.19, Plus 13.99→8.39, Premium 24.99→14.99; add-on 0.99/2.99/5.49 ₼)
- Ödəniş adapterlə; avtomatik aylıq çəkmə yoxdur, plan bitəndə dondurulur, şkaf 30 gün saxlanılıb silinir
- Sosial ikonlar hələlik yoxdur; UI-da "AI" sözü yoxdur
- Fal.ai büdcəsi $10: Trends həftədə 6 look, keşlənir
- Hostinq: ilkin Vercel/Netlify, sonra öz domen və Node.js hosting



## Phase 4 — davam edir (10 noyabr, istifadə limiti ilə yarımçıq dayandı)
- Hazır: AVATAR (foto + tənzimləmə, ayrıca saqqal), OUTFITS, Smart Fit, yeniyetmə/hicab qaydaları, Günün kombini (öz qarderob + trend, hava qrupu, tarixçə, izah), sürət (paralel yükləmə, 30 s brauzer keşi, skeletlər), alt panel silindi.
- Geyindirmə: quality + köhnə geyimi sil; pencəkdə formanı saxla (keş v7). Studiya geyimi: neytral uzunqol flat-lay, 3 baxışlı yoxlama, 2-ci cəhd, alınmasa öz geyimi + kredit qaytarılır.
- İstifadəçi etməlidir: `supabase/migrations/0004_look_history.sql` işə salmaq (Günün kombini bunsuz işləmir).
- Yoxlanmayıb: Günün kombini real axını (0004-dən sonra), tənzimlənmiş avatar app daxilində (limit doldu), production build yeni kodla, tünd rejim.
- Test hesabı: wearcast.qa.p4@example.com (parol `full/.env.test.local`, premium, test üçün).
- Phase 4 Fal xərci ≈ $2.39 (limit $3.00).

**Açıq xəta (11 noyabr, istifadəçi tapdı):** hicablı avatarda (h1) bluz geyindirəndə hicab çalmaya çevrilir, boyun açıq qalır. Həll olundu, aşağıda.
Təhvil: `HANDOFF-PHASE4B.md`, söhbət mətni: `PHASE4B-PROMPT.md`.

## Phase 4B — hicab, keyfiyyət qoruması, yükləmələr (10–11 noyabr)
**Hicab xətası (sübutla):** FASHN üst geyimi çəkəndə hicabın sinəyə düşən hissəsini də yenidən çəkir. "Köhnə geyimi saxla" (`segmentation_free: true`) kömək etmədi (sınandı). Həll: `src/lib/wardrobe/hijab.ts`.
- Hər hicablı avatar üçün EVF-SAM ilə hicab maskası bir dəfə çıxarılır ($0.005), saxlanılır: baza avatarlar `generations/shared/masks/`, istifadəçininki öz avatar qovluğunda (avatar silinəndə silinir).
- Hər geyindirmədən sonra avatarın öz başı + hicabı (+ başın üstü, çənəyə qədər kənarlar; hicab çənənin altını örtmürsə boyun zolağı) nəticənin üstünə qoyulur. h1, h2, foto avatarda sahə gözlə yoxlanıb.
- Foto ilə hicablı avatar yaradılanda (studiya geyimi) da eyni: istifadəçinin öz hicabı geri qoyulur (əvvəl nəhəng yaxa çıxırdı). Studiya geyimi indi əvvəl "köhnəni sil" rejimi ilə (uzun kardiqan paneli qalırdı).
- Keş açarı: hicablılar `v11` (köhnə pis nəticələr bir daha açılmır), qalanlar `v7`.

**Nəticə yoxlaması (bütün avatarlar):** `lookIsSound` (`tryon.ts`): Gemini 3 dəfə baxır (geyim şəkli + əvvəlki + nəticə). Xəta sayılır: geyim/rəng/uzunluq dəyişib, sallanan parça, əyri düymə xətti, qol/əl qüsuru, digər geyim və ya ayaqqabı dəyişib, fonda ləkə, hicab qaydası. ≥2 "xəta" → 2-ci cəhd; yenə xəta → heç nə göstərilmir, kredit qaytarılır, `look_failed` mesajı. Cavab gəlməsə yenidən soruşur; 2 cavab yoxdursa göstərilmir. Kalibrasiya: 12 saxlanmış şəkildən 11-i gözlə qiymətləndirmə ilə eyni (12-ci mənim test səhvim). Yoxlama ~10–25 san əlavə edir.

**Real sınaqlar (gözlə baxılıb):**
- Təmiz alındı: h1 + bluz, h2 + bluz, h2 + ətək, yeni hicablı foto avatar (studiya geyimi), bulanıq/əyri/qarışıq fonlu kofta şəklinin səliqəyə salınması.
- Yoxlayıcı düzgün rədd etdi (göstərilməzdi, kredit qaytarılardı): h1 + kişi köynəyi (açıq köynək, sinədə tünd ləkə, başın yanında forma) 4 cəhd; foto hicablı avatar + bluz (tunikaya çevrilir) 6 cəhd.
- **Hələ alınmayan:** hicablı avatarlarda kişi köynəyi və foto hicablı avatarda bu bluz. FASHN bunları ardıcıl pis çəkir.
- Yoxlanmayıb: kişi/qadın avatarlarında yeni yoxlayıcı ilə canlı geyindirmə (yalnız saxlanmış şəkillərlə kalibrasiya), hicablı + pencək yeni kodla, kişi/qadın fotosunda yeni studiya sırası.

**Yükləmə qoruması:** `assertClearPhoto` (`server.ts`): ən kiçik tərəf <400 px → `photo_small`; kəskinlik balı insan <8, geyim <4 → `photo_blurry` (pulsuz, pul xərclənmədən əvvəl). Kalibrasiya: 7 şəkil × 5 variant. Geyimdə hədd aşağıdır (düz parçalar az bal alır), qalanını Kontext səliqəyə salması düzəldir.
**Digər:** açılışda köhnə geyim görünmür (bərpa gedəndə avatar yumşaq bulanıq), Kombinlər filtrində düzgün boş mesaj, Günün kombini Azərbaycan dili lüğəti və Kiril hərfi yoxlaması, `tidyPhoto` `src/lib/wardrobe/tidy.ts`-ə köçdü.
**Səhifələr:** Wardrobe/Avatar/Outfits 1898×872, 1024×640, 375×812, açıq/tünd; konsolda xəta yox. Build, tsc, eslint təmiz. Sürət production-da ölçülmədi (test paneli gizli idi).
**Xərc (bu söhbət):** $1.81 (FASHN 23, EVF-SAM 9, Kontext 1). İstifadəçi icazəsi $0.85 + $1.00. Balans təxminən $5.77.
Təhvil: `HANDOFF-PHASE5.md`, söhbət mətni: `PHASE5-PROMPT.md`.

## Investor prototipi (11 noyabr 2026) — plan dəyişdi
İstifadəçinin qərarı: büdcə azdır, əvvəl investor üçün sadə, amma tam işləyən versiya. Ödəniş, planlar, admin ödəniş axını, hicab, aksesuar, avatar studiyası və öz geyimini yükləmə sonraya qaldı.
- **Demo rejimi:** `NEXT_PUBLIC_PROTOTYPE` (yazılmasa açıqdır, `false` tam versiyanı qaytarır). `src/lib/wardrobe/curated.ts`.
- **Hazır kombinlər:** m1 və f1 üçün 5-5 kombin, Bakı proqnozuna görə (11–15 noyabr, 7–19°C). Sviterlilər soyuq günlərə, köynəklilər mülayim günlərə. Hər addım `runTryOn` ilə (3 baxışlı yoxlama + 2-ci cəhd) sahib hesabında geyindirildi və gözlə yoxlandı. Bu nəticələr bütün istifadəçilərlə paylaşılır (`cacheOwners`), ona görə geyinmək, dəyişmək və təkrar geyinmək pulsuzdur.
- Rədd olunanlar: pencək köynəyin üstündə (m1, 2 dəfə), m1 cins + köynək (köynək açıq, altında ağ futbolka). Pencəkli kombinlər çıxarıldı.
- **Mətnlər:** `scripts/fal/proto-texts.mts` (Gemini yazır, sonra 3 dəfə yoxlayır) → `curated-texts.json`. AZ mətnlər əl ilə də düzəldildi. Yalnız mətni olan kombin göstərilir.
- **Yeni geyimlər:** kişi chinos, cins, sviter; qadın qara şalvar, cins, ağ köynək, göy don, qara pencək (pencək işlədilmir). Rədd: boğazlı sviter (şəkildə adam), harrington (bağlı), qadın sviteri (asılqan, sonra maneken).
- **UI:** Günün kombini (dəst şəklində geyimlər, "KOMBİNİ GEYİN", "Başqa kombin", "Şkafıma əlavə et"), şkafda "Dəstlərim" (bir kliklə pulsuz geyin, sil) və "Geyimlər". Gizlədilənlər: kredit sayğacı, AVATAR tabı (səhifə Wardrobe-a yönləndirir), geyim yükləmə, tək-tək geyindirmə. Server: demo rejimində `/api/tryon` yalnız hazır nəticə qaytarır, `/api/look`, `/api/wardrobe` POST, `/api/avatars` POST `prototype_only` qaytarır (limitsiz hesablar istisna).
- **Ana səhifə:** hero-dan sonra "WearCast nə edir", Haqqımızda, Dəstək (support.wearcast@gmail.com), footer.
- **Deploy:** `DEPLOY.md` (Netlify tövsiyə olunur; Vercel Hobby qeyri-kommersiyadır).
- **Xərc:** cəmi ≈ $2.72 (icazə $4.00): geyim şəkilləri və fon silmə $0.76, geyindirmə ≈ $1.96. `cost_log` cəmi 18.455.
- **Təkmilləşdirmə (11 noyabr, 2-ci hissə):** kombin şəkilləri yüngül kəskinləşdirildi, kənar haşiyə təmizləndi (tünd rejimdə açıq xətt yox, şəffaflıq hər faylda yoxlanır). Podium: sakit nəfəs, yeni kombin yumşaq keçidlə, studiya işığı. Şkaf boş başlayır, yalnız podiumdakı modelin dəstlərini və onların geyimlərini göstərir. Ana səhifə: Necə işləyir, hava demosu (soyuq/sərin/mülayim), Tezliklə (8 plan), Suallar, gözləmə siyahısı (`0005_waitlist.sql` işə salınmalıdır, admin səhifəsində görünür), scroll animasiyası. Daxil olmuş istifadəçi giriş/qeydiyyat səhifəsindən Wardrobe-a keçir.
- **Netlify:** Claude-a qoşulan Netlify hesabı istifadəçinin şəxsi Gmail hesabıdır, WearCast hesabı deyil. Deploy WearCast hesabında olmalıdır (istifadəçinin qərarı).
- **Raund 2 (11 noyabr, $2.05 xərc, cost_log 20.505):** saç kənarındakı ağ ləkələr: bütün kombinlər "Portrait" fon silmə + `finish.mjs` (kənar təmizləmə, kəskinlik, +6% rəng) ilə yenidən ixrac olundu. Çıxarılanlar: göy kişi şalvarı (balaq qatlanırdı), göy don (saç ucunda ağ zolaqlar), boz şalvar (dəri kimi parlaq), şort, yay donu, uzun və qısa qadın paltosu (model gödəkçəyə çevirdi). Əlavə olunanlar: m1-7 çinos + futbolka (isti), m1-10 cins + pufer (soyuq), f1-7 cins + futbolka (isti), f1-8 krem trikotaj don (mülayim). Cəmi 11 kombin (kişi 5, qadın 6), hamısı tünd və açıq fonda gözlə yoxlanıb, mətnlər Gemini ilə 3 dəfə yoxlanıb.
- Günün kombini indi **real havaya görə** seçilir (bugünkü min/max temperatura ən yaxın kombin birinci). Ana səhifə demosu 3 səviyyədir (sərin/mülayim/isti), modellər nəfəs alır, "Tezliklə" işıqları parıldayır, 8-ci kart "Gedəcəyin yerə uyğun kombin".
- Ayaqqabı geyindirmə edilmədi: FASHN ayaqqabı geyindirmir, şəkil üstünə yapışdırmaq isə görüntü xətası riski yaradır.
- **Raund 3 (11 noyabr, cəmi Fal xərci $2.28 raund 2+3):** göy don (f1-1) istifadəçinin istəyi ilə geri qaytarıldı (saç ucunda yüngül açıq zolaqlar böyüdəndə görünür). Qadın pufer gödəkçə 2 cəhdlə alınmadı (yaxa itdi), buna görə qadında soyuq hava üçün ayrıca kombin yoxdur. Qısa palto və uzun palto da alınmamışdı.
- **Ayaqqabılar:** `scripts/fal/shoes.mjs`: bütün avatarlar eyni ağ idman ayaqqabısında dayanır, eyni pozada. Ayaqqabı tapılır (solğun, rəngsiz pikseller, ayaq sahəsində), ağ altlıq saxlanılır, üst hissə öz işıq-kölgəsi ilə yenidən rənglənir (qara, qəhvəyi, bej, ağ). Hər kombinə uyğun rəng `curated.ts`-də (`shoes`). Cüt ayrıca "geyim" şəkli kimi kəsilir (`public/assets/looks/shoes/`) və kombin kartında, dəstdə və şkaf rəfində görünür. Real çəkmə və ya loafer üçün try-on modeli lazımdır (sonraya).
- **Netlify:** WearCast hesabı qoşuldu (support.wearcast@gmail.com). `wearcast` adı tutulub, `wearcast-6a0p` yaradıldı. Layihə SSO ilə qorunur (hamıya açıq deyil), yayımdan əvvəl dəyişdirilməlidir.
- **Yayım (11 noyabr):** sayt **https://wearcast-az.netlify.app** ünvanındadır (Netlify, layihə wearcast-az, hesab support.wearcast@gmail.com). Windows-da yerli qurma `proxy.ts`-də (`[turbopack]_runtime.js`) alınmadı, ona görə GitHub (Fexreddin-dev/wearcast, main) ilə Netlify-ın Linux serverində qurulur. Repo gizli idi, Netlify "tanınmamış iştirakçı" ilə blokladı, repo açıq edildi və Netlify-a `public_repo` bildirildi. `netlify.toml` Next.js runtime-ı açıq göstərir (onsuz mənbə faylları statik yayımlanırdı). Açarlar Netlify mühit dəyişənlərindədir, repoda yoxdur.
- Ayaqqabı "geyim" şəkilləri: 4 rəng üçün kataloq şəkilləri (`public/assets/looks/shoes/<rəng>.webp`). Model ayağındakı ayaqqabı yenə `shoes.mjs` ilə kombinə uyğun rənglənir.
- Yoxlanıb (canlı): ana səhifə, giriş, qeydiyyat, şəkillər 200; admin ziyarətçiyə 404; Wardrobe daxil olmayana giriş səhifəsinə yönləndirir; mənbə faylları (package.json) artıq açıq deyil. Səhifə cavabı ~2.5 san (soyuq server, ABŞ regionu), yerlidən yavaşdır.
- Yoxlanmayıb (canlı): daxil olmuş istifadəçinin axını (Wardrobe, dəstlər, e-poçt təsdiqi), gözləmə siyahısı (0005_waitlist.sql işə salınmayıb), telefon, real sürət.
