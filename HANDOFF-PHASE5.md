# WearCast — Phase 5 təhvil sənədi (yeni söhbət üçün)

Sən WearCast startapının Baş Texniki Memarı, UI/UX Dizayneri və Full-Stack Developerisən. Bu sənəd Phase 4-ün (AVATAR, OUTFITS, geyindirmə keyfiyyəti) sonunu və Phase 5-in (ödəniş, planlar, ictimai səhifələr, deploy) planını izah edir. **Axıra qədər oxu, sonra "12. İlk addım" bölməsinə keç.** Ziddiyyət olarsa bu sənəd `HANDOFF-PHASE4B.md` və `HANDOFF-PHASE4.md`-dən üstündür.

---

## 0. Oxuma ardıcıllığı
1. Bu fayl.
2. `HANDOFF-PHASE4.md`: **1-ci bölmə** (istifadəçi və iş üslubu), **2-ci bölmə** (qəti qaydalar), **3-cü bölmə** (təsdiqlənmiş qərarlar: AZN, M10, kreditlər), **4-cü bölmə** (alətlər, Avast). Hələ qüvvədədir.
3. `PROGRESS.md` (sonda "Phase 4B" hissəsi), `CLAUDE.md` (PRD; qiymət və ödəniş hissəsi köhnədir), memory qovluğu.
4. Kod: aşağıdakı 4-cü bölmədəki fayl xəritəsi.

## 1. İstifadəçi haqqında ən vacib şeylər
- Cavablar **Azərbaycan dilində, sadə**. İstifadəçi developer deyil.
- İstifadəçi **"xətasız işləsin"** tələb edir və hər dəfə özü test edəndə xəta tapmaqdan yorulub. Ona görə:
  - Hər dəyişikliyi **özün** real nəticə ilə yoxla, şəkilləri özün aç və bax. Yoxlamadığını "işləyir" demə, "yoxlanmayıb" de.
  - Bir nümunə heç nəyi sübut etmir. Pullu addımı bir neçə nümunə ilə yoxla, amma qənaətlə.
  - Generativ model (FASHN, Kontext) hər dəfə mükəmməl şəkil vermir. Bunu dürüst de. Sistemin vədi budur: **pis şəkil heç vaxt istifadəçiyə göstərilmir**, kredit qaytarılır.
- Fal.ai pulu az və "son pul"dur. **Hər pullu addımdan əvvəl xərc cədvəli və icazə al.** Balansı istifadəçidən soruş. İcazə adətən $1–1.50 olur.
- İstifadəçi gələcəkdə öz paltar və şəkillərini yükləyəcək (bulanıq, qırışıq ola bilər). Sistem bunu tanımalı və təmiz nəticə verməlidir (8-ci bölmə).
- İstifadəçi gələcəkdə eynək, əlcək, saat, qolbaq, papaq, çanta, ayaqqabı da geyindirmək istəyir (6-cı bölmə).

## 2. Vəziyyət (11 noyabr 2026)
- **Git:** `WearCast/` kökündə. Son commit Phase 4B-dir (bu söhbət). `full/assets-src/` və `.env*` git-ə düşmür.
- **SQL:** `0001`–`0004` işə salınıb. Phase 4B yeni migration tələb etmədi.
- **Fal.ai:** bu söhbətdə $1.81 xərcləndi (icazə $0.85 + $1.00). Balans təxminən **$5.77** (istifadəçidən dəqiq soruş). Skript tavanı `scripts/fal/lib.mjs`-də `BUDGET_CAP_USD = 10.85`, `ledger.json` ≈ 9.72. Yeni icazə verilsə, tavanı əl ilə qaldır. Müştəri tavanı `app_settings.fal_budget_cap_usd` = 20, `cost_log` cəmi ~15.4: **tezliklə dolacaq**, istifadəçiyə xatırlat (admin səhifəsindən qaldırılır).
- **Test hesabı** (real adam deyil): `wearcast.qa.p4@example.com`, parol `full/.env.test.local`-da (dəyərini heç yerdə yazma). Premium, test üçün. Bu söhbətdə skriptlə bu hesaba iki hicablı foto avatar əlavə olundu:
  - `QA hijab2` (`5041089b-…`): **xətalıdır**, solda şalvarın üstündə panel var. Silinməlidir.
  - `QA hijab3` (`3f24c2e0-…`): təmiz.
  
  İş bitəndə hesabı, avatarları və `.env.test.local`-ı silmək üçün istifadəçidən icazə al (o, SQL ilə silməni bir dəfə rədd edib).
- **Test şəkilləri:** `full/assets-src/qa-hijab/` (git-ə düşmür, istəsən sil), `full/assets-src/p4-test/`.
- **Dev server:** istifadəçi öz pəncərəsində `npm run dev` (port 3000) işlədir. Production yoxlaması üçün `.claude/launch.json`-da `wearcast-prod` (port 3100) var. Əvvəl `npm run build` et. Dev `.next/dev` qovluğunu işlədir, build ona mane olmur.

## 3. Geyindirmə sistemi: indiki vəziyyət (ən vacib)
**Axın** (`full/src/lib/wardrobe/tryon.ts`, `runTryOn`):
1. Qatlar sıralanır: alt → don → üst → pencək. Hər qat əvvəlki nəticənin üstünə FASHN v1.6 ilə geyindirilir (`mode: quality`, `segmentation_free` yalnız pencək/paltoda `true`, `seed` hər dəfə təsadüfi).
2. **Hicablı avatar** (`avatar.modest`): nəticənin üstünə avatarın öz başı + hicabı qoyulur (`hijab.ts`, `keepHeadscarf`). Maska EVF-SAM ilə bir dəfə çıxarılır ($0.005) və saxlanılır.
3. **Yoxlama** (`lookIsSound`): Gemini 3 dəfə baxır (geyim şəkli + əvvəlki + nəticə). Pisdirsə 2-ci cəhd edilir, o da pisdirsə `look_failed` qaytarılır (kredit qaytarılır, şəkil göstərilmir). Cavab az gələrsə yenidən soruşur, 2 cavab gəlməzsə şəkil göstərilmir.
4. Fon silmə (BiRefNet, pulsuz) yoxlama ilə paralel gedir. Keş: hər addımın açarı; hicablılar `v11`, qalanlar `v7`.

**Vaxt:** adi geyindirmə ~20–35 san. Hicablı ~30–50 san. Rədd olunub yenidən cəhd edilərsə ~55–100 san. Ölçü dev-də, script ilə aparılıb. Production-da tətbiq daxilində ölçülməyib.

**Xərc:** bir addım $0.075. 2-ci cəhd olarsa $0.15 (kredit yenə 1). Hicablı avatarın ilk geyindirməsində +$0.005.

**Bilinən zəif yerlər (həll olunmayıb):**
- Hicablı avatarlarda kişi köynəyi (`demo:man-shirt`) ardıcıl pis çıxır: açıq köynək, altında ağ futbolka, sinədə ləkə, başın yanında forma. Yoxlayıcı 4/4 tutdu.
- Foto ilə yaradılmış hicablı avatarda `demo:woman-blouse` hər dəfə dizə qədər tunika olur. Yoxlayıcı 6/6 tutdu. Səbəb ehtimalı: bu avatarın studiya sviteri uzun və boldur.
- Yoxlayıcı uzun kardiqandan qalan paneli (şalvarın yanında) **etibarlı görmür**. Ona görə studiya geyimi indi "köhnəni sil" rejimi ilə başlayır.
- Gemini pulsuz limitdə tez-tez cavab vermir (çox sorğuda). Real istifadəçilərlə **Gemini pullu plan lazımdır**, yoxsa yoxlama yavaşlayır və "yoxlanmadı, göstərilmədi" halları artar.

**Sınanıb, alınmayıb (təkrar etmə):** Kontext (tək və Multi) insan şəkli üzərində; yan/arxa görünüş; piksel maskası ilə içlik bərpası; FASHN `performance`; hicablıda üst geyim üçün `segmentation_free: true` (hicab yenə pozulur, köynək açıq qalır); studiya geyimində əvvəl "siluet saxla" (kardiqan paneli qalır); maskanı hicabın uzunluğuna görə uzatmaq (h2-də çiyində köhnə sviter parçası qaldı).

## 4. Fayl xəritəsi (Phase 4B-də yeni və dəyişən)
- `src/lib/wardrobe/hijab.ts`: `findHeadscarf`, `layHeadBack`, `keepHeadscarf`, `headArea` (qorunan sahənin qaydaları və səbəbləri şərhlərdədir).
- `src/lib/wardrobe/tryon.ts`: `LOOK_CHECK`, `lookIsSound`, 2 cəhd, keş versiyası.
- `src/lib/wardrobe/avatars.ts`: `AvatarProfile.source`, `dressInStudioOutfit(photoUrl, photo, …)` (hicab geri qoyulur, əvvəl "sil" rejimi), `outfitIsClean` (kardiqan qaydası).
- `src/lib/wardrobe/server.ts`: `FAL_SEGMENT` (EVF-SAM), `assertClearPhoto` (bulanıq/kiçik şəkil).
- `src/lib/wardrobe/tidy.ts`: yüklənən geyimi kataloq şəklinə salmaq (route-dan köçdü).
- `src/lib/wardrobe/looks.ts`: Azərbaycan dili lüğəti, "sən" müraciəti, `askWriting` (Kiril hərfi olarsa yenidən yazdırır).
- `src/components/wardrobe/WardrobeStudio.tsx` + `Podium.tsx` + `wardrobe.css`: `restoring` (açılışda köhnə geyim görünmür).
- `src/components/outfits/OutfitsBoard.tsx`: filtr boş mesajı (`emptyFilter`).
- `src/i18n/dictionaries.ts`: `look_failed`, `photo_blurry`, `photo_small`, `emptyFilter` (EN/AZ/TR).

## 5. Phase 4-dən qalan işlər (Phase 5-dən ƏVVƏL, prioritet sırası)
Hər pullu addımdan əvvəl istifadəçiyə xərc cədvəli göstər.
1. **Normal avatarlarda yeni yoxlayıcını canlı yoxla:** m1, f1, m3, f2-də keşdə olmayan 3–4 birləşmə. Xərc ~$0.30–0.45. Məqsəd: yaxşı nəticəni səhvən rədd etmədiyinə əmin olmaq. Kalibrasiya yalnız saxlanmış şəkillərlə edilib.
2. **Hicablı + pencək** yeni kodla (h1, h2): ~$0.15–0.30.
3. **Hicablı avatarlarda alınmayan üst geyimlər:**
   - Əvvəlcə pulsuz təhlil et: hansı geyim/avatar birləşmələri alınmır, ümumi səbəb nədir.
   - Sonra variantları istifadəçiyə təklif et: (a) başqa kommersiya icazəli try-on modeli (Fal-da FASHN-in yeni versiyaları, Kling Kolors try-on, Leffa; əvvəl qiymətini və lisenziyasını **Fal səhifəsindən** yoxla); (b) hicablı avatarların studiya sviterini daha qısa və dar flat-lay ilə əvəz etmək; (c) hər iki cəhd alınmayanda istifadəçiyə "bu geyim bu avatarda alınmır" yazıb geyimi işarələmək ki, yenidən pul xərclənməsin.
   - Hər variantı 2–3 nümunə ilə sına.
4. **Kişi və qadın fotosunda studiya geyimi** yeni sıra ilə ("əvvəl sil"): 2 nümunə, ~$0.15–0.30. Kişidə bu rejim əvvəl sınanmayıb.
5. **Sürət** production-da: `wearcast-prod` ilə ölç. Brauzer paneli **görünən** olmalıdır, yoxsa ölçü yanlışdır: əvvəl `tabs_context` ilə yoxla, gizlidirsə istifadəçidən Ctrl+Shift+B ilə açmasını xahiş et. Hədəf: səhifənin məzmunu <1 san, kombinin bərpası <1.5 san. Dev-də bərpa sorğusu ~2.4 san idi.
6. **Settings səhifəsi** (PRD-də var, hələ yoxdur): dil, tema, şəhər, hesabı silmək (bütün şəkillər həmişəlik silinməlidir, RLS). Profil menyusu.
7. `dictionaries.ts`-də işlənməyən açarlar (`view_failed`, `dressView`, `drag`) təmizlənməlidir.
8. Avatar səhifəsində geniş ekranda sol panelin altı boş qalır. Kiçik dizayn düzəlişi lazımdır.

## 6. Ayaqqabı, çanta, aksesuar, baş geyimi (istifadəçinin istəyi)
- **İndiki vəziyyət:** şkafda görünür, geyindirmə yoxdur ("tezliklə" toast). FASHN yalnız üst/alt/don geyindirir.
- **İstifadəçi istəyir:** ayaqqabı, çanta, eynək, əlcək, saat, qolbaq, papaq/kepka, şərf/hicab, kəmər və s. Hamısı xətasız işləməlidir.
- **Yol (araşdırma, pul xərcləmədən əvvəl plan göstər):**
  - Fal-da aksesuar/ayaqqabı dəstəkləyən kommersiya icazəli try-on modellərini axtar və qiymətini səhifədən yoxla. Təxmin etmə.
  - Qəti qayda: adamın şəkli üzərində ümumi redaktə modeli (Kontext) işlətmə. O, adamı dəyişir (sübut olunub).
  - Kiçik aksesuarlar (eynək, saat, qolbaq) üçün mümkün yol: pozanı (göz, bilək) tapıb aksesuarın təmiz şəklini yerləşdirmək, yəni deterministik yapışdırma. Bunu prototip kimi pulsuz sına.
  - Hicab/baş geyimi: hicablı avatarda qorunan baş sahəsi (`hijab.ts`) ilə toqquşur, ayrıca dizayn lazımdır.
  - Hər yeni kateqoriya üçün `lookIsSound` qaydaları və kalibrasiya şəkilləri əlavə et.
- `catalog.ts`-də `accessories` alt növlərə bölünməlidir (eynək, saat, qolbaq, əlcək, çanta, kəmər). `GARMENT_PROMPT` də yenilənməlidir.
- Qərarı istifadəçi ilə ver: bu, Phase 5-in sonuna və ya Phase 6-ya qalsın, büdcə ilə.

## 7. "Claude-u sayta qoşmaq" sualı (istifadəçi soruşdu)
- Saytda artıq hər geyindirməni arxa planda yoxlayan bir yoxlayıcı var (Gemini, 3 baxış). Pis nəticə göstərilmir, bir dəfə yenidən yaradılır.
- Claude API-ni (məsələn ən ucuz Haiku modeli) **əlavə və ya ehtiyat yoxlayıcı** kimi qoşmaq mümkündür. Məsələn, Gemini cavab vermədikdə və ya səslər bölünəndə. Bu, hər yoxlama üçün kiçik pul tələb edir və `ANTHROPIC_API_KEY` lazımdır. Qiyməti cari Anthropic qiymət səhifəsindən yoxla. Bu söhbətdəki Claude saytın içində işləyə bilməz, API ayrıca məhsuldur.
- Tövsiyə: əvvəl Gemini-nin pullu planı (sürət və limit), sonra lazım olarsa Claude ehtiyat yoxlayıcı. Bunu istifadəçiyə qərar üçün təqdim et.

## 8. Yükləmələr: bulanıq və qırışıq şəkillər
- `assertClearPhoto`: ən kiçik tərəf <400 px → "şəkil çox kiçikdir". Kəskinlik balı insan üçün <8, geyim üçün <4 → "şəkil bulanıqdır" (necə çəkmək lazım olduğunu deyir). Pul xərclənmədən əvvəl işləyir.
- Geyim şəkli həmişə Kontext ilə kataloq şəklinə salınır (`tidy.ts`). Bir sınaqda bulanıq, əyri, qaranlıq və fonu qarışıq kofta şəkli təmiz, kəskin kataloq şəklinə çevrildi. Kontext xırda detal əlavə edə bilər (bir dəfə yaxaya etiket qoydu).
- İnsan fotosu: `checkPersonPhoto` (3 səs: bir nəfər, başdan ayağa, kameraya baxır, gündəlik geyim) + studiya geyimi.
- **Yoxlanmayıb:** real telefon şəkilləri (bütün sınaqlar süni şəkillərlə aparılıb). İstifadəçi öz şəklini yükləyəndə nəticəni birlikdə yoxlayın.

## 9. Phase 5 — əsas iş (təsdiqlənmiş qərarlar, `HANDOFF-PHASE4.md` 3-cü bölmə)
**A) Planlar və kreditlər**
- AZN qiymətləri: Starter 6.99 → 4.19 ₼, Plus 13.99 → 8.39 ₼, Premium 24.99 → 14.99 ₼ (40% launch endirimi, `NEXT_PUBLIC_LAUNCH_DISCOUNT=true/false`).
- Add-on: +10 qarderob yeri 0.99 ₼, +5 kredit 2.99 ₼, +10 kredit 5.49 ₼.
- Aylıq kreditlər: endirimli **20 / 45 / 85**, normal **30 / 75 / 130**. Gündəlik geyindirmə: sınaq 2, Starter 4, Plus 8, Premium 14.
- Qarderob yeri: sınaq 4, Starter 8, Plus 24, Premium 50. Pulsuz sınaq: 3 gün, 2 kredit, kart yoxdur, avtomatik pul çəkmə yoxdur.
- **Diqqət, iqtisadiyyat:** 2-ci cəhd bir addımı $0.15-ə qaldırır, hicablıda maska +$0.005. Bu əlavə xərcə görə kreditlərin hələ də mənfəətli olduğunu yenidən hesabla və istifadəçiyə göstər.

**B) Ödəniş (M10, şəffaf)**
- Adapter: `PAYMENT_PROVIDER=disabled|m10`. LemonSqueezy/Paddle yoxdur.
- Axın: plan seçimi → M10 QR (`public/assets/payment/m10-qr.png`) və məbləğ → istifadəçi qəbz şəklini yükləyir → admin təsdiqləyir → plan aktiv olur.
- Plan bitəndə dondurulur, avtomatik çəkmə yoxdur. Şkaf 30 gün saxlanılır, sonra silinir.
- **Heç vaxt** saxta kart formu və ya gizli ödəniş yönləndirməsi qurma.
- Qeyd: istifadəçinin şirkəti yoxdur. M10 şərtləri şəxsi hesabdan sahibkarlıq istifadəsini qadağan edir. İstifadəçi xəbərdar edilib və davam etməyi seçib. Memory-də var.
- **DB:** `orders` (məbləğ, plan/add-on, qəbz yolu, status, admin qeydi), qəbzlər üçün private bucket (RLS). Migration faylı `0005_*.sql` yaz, istifadəçi özü işə salır.

**C) Admin paneli**
- Sifarişlər siyahısı, qəbzə baxış, təsdiq/rədd, plan və kredit vermək.
- Statistika: istifadəçilər, Fal xərci, `look_failed` sayı (keyfiyyət izləmə üçün `generations.error`).
- Müştəri tavanı.

**D) İctimai səhifələr (PRD 3)**
- Hero-dan sonra: Features, Pricing (AZN və endirim şalteri), FAQ, About və Contact (`support.wearcast@gmail.com` və forma, telefon yox).
- Footer: Privacy Policy, Terms of Service, Refund Policy. Mətnləri uydurma: istifadəçi ilə razılaşdır.
- Sosial ikonlar hələlik yoxdur. "AI" sözü və robot ikonu yoxdur, "SHOP" yoxdur.

**E) Deploy**
- Vercel yox: istifadəçinin öz domeni və Node.js VPS. `next build` + `next start` (PM2 və ya systemd), Nginx reverse proxy, HTTPS (Let's Encrypt).
- `.env` serverdə saxlanılır. Supabase Auth Site URL və Redirect URL domenə yenilənir. `allowedDevOrigins` dev üçündür.
- Avast problemi (`--use-system-ca`) yalnız istifadəçinin kompüterinə aiddir.

**F) Pulsuz versiya `free/`:** hero, qeydiyyat, Trends və havaya uyğun kombin. Phase 5-in sonunda və ya ayrıca.

## 10. Alətlər və test üsulları (bu söhbətdə işləyənlər)
- **MCP:** `context7`, `supabase-wearcast` (yalnız oxuma), `magic` (21st.dev, işləmir, vacib deyil). `claude mcp list` ilə yoxla.
- **Pulsuz kalibrasiya:** tətbiqin öz funksiyalarını skriptdən çağırmaq üçün:
  `JITI_ALIAS='{"@/":"<full yolu>/src/","server-only":"<full yolu>/node_modules/server-only/empty.js"}' node --env-file=.env.local --use-system-ca node_modules/jiti/lib/jiti-cli.mjs scripts/fal/<skript>.mts`
  `lookIsSound`, `outfitIsClean`, `assertClearPhoto`, `headArea` belə sınanıb. Müvəqqəti skriptləri sonda sil.
- **Pullu axını sınamaq:** müvəqqəti, yalnız development + localhost-da işləyən route (`/api/qa-tryon`). İçində real xərcə bağlı limit olsun (`cost_log`, BiRefNet-i saymadan). `runTryOn`-u birbaşa çağırır. İşin sonunda sil.
- **Brauzerdə test hesabı ilə giriş:** müvəqqəti `/api/qa-login` route-u parolu `.env.test.local`-dan serverdə oxuyur (parol söhbətə düşmür). İşin sonunda sil.
- **Rədd olunan şəkillərə baxmaq:** dev-də müvəqqəti olaraq `.next/qa-rejected/`-ə yaz, sonra kodu sil.
- **Gizli brauzer paneli:** səhifə arxa planda işləyir, kod gec işə düşür, lazy şəkillər yüklənmir. Bir real klik (`computer left_click`) hidrasiyanı başladır. Sürət ölçüsü üçün panel görünən olmalıdır.
- Ekranı 3 ölçüdə yoxla: 1898×872, 1024×640, 375×812. Sonra viewport-u `desktop`-a qaytar.

## 11. Qaydalar xatırlatma
- `.env.local` dəyərlərini heç yerdə yazma. Supabase yalnız `supabase-wearcast`, oxuma sorğuları. Sxem dəyişikliyi `000N_*.sql` faylı ilə, istifadəçi işə salır. Sətir silməzdən əvvəl soruş.
- IDM-VTON yox. Yalnız kommersiya icazəli modellər (FASHN, Kling Kolors, Leffa, Flux/Kontext, BiRefNet, Clarity, EVF-SAM).
- Yeniyetmə avatarlarında açıq-saçıq geyim yox. Hicabda qol və boyun örtülü.
- Hər mərhələnin sonunda `PROGRESS.md`, commit və növbəti söhbət üçün təhvil faylı.

## 12. İlk addım (yeni söhbətdə)
1. Bu faylı, `HANDOFF-PHASE4.md` (1–4), `PROGRESS.md`, `CLAUDE.md` və memory-ni oxu.
2. `claude mcp list` (2–3 cümlə), `git log --oneline`, `git status`.
3. İstifadəçidən soruş: Fal balansı nədir və yeni icazə nə qədərdir? Müştəri tavanını (20) qaldırıbmı? QA hesabını və test avatarlarını silməyə icazə verirmi?
4. 5-ci bölmənin 1–4 bəndlərini (yoxlama, ~$0.6–1.2) xərc cədvəli ilə təklif et, təsdiqdən sonra et.
5. Sonra Phase 5 planını (9-cu bölmə) qısa göstər, ardıcıllığı istifadəçi ilə razılaşdır: adətən əvvəl planlar və kreditlər, sonra M10, admin, ictimai səhifələr, deploy.
