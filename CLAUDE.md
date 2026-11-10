# WEARCAST — MASTER PRODUCT REQUIREMENTS DOCUMENT (PRD) & ARCHITECTURE (FINAL VERSION)

## 1. Brend Kimliyi, Dizayn Sistemi və Ultra-Keyfiyyət Standartı
* **Layihənin Adı:** WearCast ("Your Weather. Your Wardrobe. Your Style.")
* **Vizual Stil:** Apple VisionOS Light Glassmorphism & Zara Home / Massimo Dutti lüks studiya estetikası.
  * **Əsas Arxa Fon:** `#F4F3EF` — `#EAE8E1` (İsti açıq-krem və yumşaq bej tonları). Əlavə olaraq yuxarı barda 1 kliklə "Dark Mode" (Lüks tünd rejim) keçid düyməsi (Günəş/Ay ikonu) olacaq.
  * **Panellər:** `rgba(255, 255, 255, 0.65)`, `backdrop-filter: blur(20px)`, `1px solid rgba(255, 255, 255, 0.8)`.
  * **Şkaf Materialı:** Açıq palıd ağacı (Warm Light Oak Wood), şüşə rəflər, eyni standartda taxta asılqanlar, daxili gizli isti LED işıqlandırma.
  * **Tipoqrafiya:** Tünd kömür rəngi (`#1C1C1E`), ikinci dərəcəli mətnlər (`#6E6E73`).
* **Qəti Qadağalar:** Saytda heç bir yerdə "AI", "Artificial Intelligence", robot ikonu İŞLƏNMƏYƏCƏK ("Today's Edit" və ya "Daily Curated Look" yazılacaq). "SHOP" bölməsi hazırda menyuda OLMAYACAQ (gələcək B2B mərhələsi üçündür).
* **4K/8K Fotorealizm və "Living Mannequin" Etalonu:**
  * Avatarlar və paltarlar plastik 3D oyun heykəli kimi yox, 100% real insan fotosu/videosu keyfiyyətində olmalıdır.
  * **Şəffaf Fon (Alpha Channel):** Manekenin özünün heç bir boz və ya ağ divar arxa fonu OLMAYACAQ. Maneken arxası tam şəffaf şəkildə birbaşa saytımızın öz açıq-krem podiumunun üzərində (ayaqlarının altında təbii podium kölgəsi ilə) və xəfif canlılıq/nəfəs alma (idle micro-motion / living portrait) effekti ilə dayanacaq.
  * **Parça Fizikası:** Paltarın tikişləri, qırışları, materialı (cins, dəri, ipək, pambıq, yun, kətan) 4K kəskinlikdə görünməlidir.

## 2. Hero Bölməsi və Sıfır Xətalı Scrollytelling Animasiyası
* **Səhnə Düzülüşü:** Açıq-krem fonda mərkəzdə/kənarda lüks qarderob, yanında isə yan-yana dayanmış 1 hiper-realistik kişi və 1 qadın model (canlı kimi dayanırlar).
* **Scroll Ssenarisi (Sıfır Kadr Xətası və 60 FPS Axıcılıq):**
  1. İstifadəçi scroll etdikcə qarderobun qapıları səlis şəkildə açılır və içəridə asılqanlarda paltarlar görünür.
  2. Scroll davam etdikcə şkafdan həm kişi, həm də qadın üçün bir dəst paltar çıxır, qarderobun önünə gəlib havada dayanır.
  3. Paltarlar havada 360 dərəcə fırlanır və süzülərək modellərin üzərinə gedir.
  4. **Dəqiq Koordinat Qaydası (Zero-Defect Placement):** Heç bir kadr xətası olmamalıdır! GSAP ScrollTrigger / WebM qatmanları ilə kişi üçün şalvar (qadın üçün şalvar və ya orta/uzun ətək - çox qısa olmamaq şərti ilə) düz aşağı bədənə, köynək/pencək düz üst bədənə, ayaqqabı düz ayaqlara oturacaq.
  5. Bu hissədə heç bir server gözləməsi və ya donma (lag) OLMAMALIDIR. Hero animasiyasındakı işıqlandırma və şkaf saytın daxilindəki şəxsi kabinetlə 100% eyni dizayn uyumunda olacaq.

## 3. Saytın Səhifə Strukturu və Naviqasiya
* **İctimai Vitrin (Landing Page):** Hero Scrollytelling -> Features -> Pricing -> FAQ -> About Us & Contact Us (Yalnız rəsmi Support Email və Live Chat/Forma, telefon nömrəsi məcburi deyil) -> Sosial Şəbəkə İkonları (Instagram, TikTok, X) -> Footer (Privacy Policy, Terms of Service, Refund Policy).
* **Şəxsi Kabinet (Web App):** Giriş etdikdən sonra İctimai Vitrin bağlanır. Yuxarı menyuda yalnız:
  * **Sol:** `WearCast` Loqosu + kiçik `Home` düyməsi.
  * **Mərkəz (3 Tab):** `WARDROBE` | `AVATAR` | `OUTFITS`
  * **Sağ:** İstifadəçi Profili, Kredit Balansı, Dil Seçimi (`EN | AZ | TR` - əsas dil EN), Dark/Light Mode ikonu və Parametrlər (`Settings`).

## 4. Bölmələrin Funksional Mexanikası və UX Axıcılığı
### A) WARDROBE (3 Sütunlu Əsas İş Ekranı)
1. **Sol Sütun (İnteraktiv Şkaf):**
   * Kateqoriyalar: `All`, `Jackets & Coats`, `Shirts & Tops`, `Pants & Skirts`, `Dresses`, `Hijab & Headwear` (Hicab, Kəlağayı, Şərf, Papaq, Kepka), `Shoes`, `Accessories` (Günəş eynəyi, Əlcək, Çanta, Kəmər).
   * `+ Add Item`: Öndən, yandan, arxadan şəkil yükləmə + Material + Ölçü (XS-XXL) + Kəsim (Slim, Regular, Oversize). Arxa planda fon silinir (BiRefNet), 4K keyfiyyətə qaldırılır (Clarity Upscaler), studiya işığı/kölgəsi verilir və müvafiq taxta asılqana asılır.
2. **Mərkəzi Sütun (360° Podium və Geyindirmə UX):**
   * **Geyindirmə və Gözləmə Effekti:** Şəxsi otaqda paltar seçiləndə havada uçma yox, birbaşa karakterin əynində yaranma olacaq. Arxa planda API cavab verənə qədər (4-6 saniyə) ekran donmamalı, maneken üzərində Apple stili zərif blur yüklənmə effekti ("Curating your look...") və Skeleton loading görünməlidir.
   * **Əllə 360° Fırlatma (Drag-to-Rotate):** Altda "Front/Side/Back" düymələri YOXDUR. İstifadəçi mausla/barmaqla tutub sağa-sola çəkdikdə avatar 360 dərəcə səlis fırlanır.
   * **4K Böyüdücü Linza (Magnifying Loupe):** Yaxınlaşdırdıqda parça toxumasını və tikişləri 4K göstərir.
   * **Paltarı Çıxarma:** Geyimin üzərinə gəldikdə çıxan `X` düyməsi, sol aşağıdakı `Active Layers` (Əynimdəkilər) siyahısı və ya `Reset` düyməsi. Bildirişlər üçün zərif "Toast Notifications" çıxmalıdır.
3. **Sağ Sütun (Hava və Günlük Kombin):**
   * `TODAY'S WEATHER`: Şəhər üzrə Morning, Afternoon, Evening temperatur, külək və yağıntı.
   * `DAILY CURATED LOOK`: Gemini API ilə istifadəçinin mövcud şkafından mətn/ID əsasında seçilən kombin. Yalnız `GET THE LOOK` düyməsinə basıldıqda geyindirmə generasiyası işə düşür. Əlavə olaraq `Shuffle` və `Save Look` düymələri.

### B) AVATAR (Bədən, Üz, Saç, Hicab və Yaş Qrupu Studiyası)
* **İstifadəçi Kateqoriyaları:** Böyük (Kişi/Qadın), Yeniyetmə/Uşaq istifadəçi (8-17 yaş özü istifadə edən - yaşına uyğun bədən nisbəti və geyim tərzi), Hicablı (Modest Fashion rejimi - qolların/boynun bağlılığı, qat-qat geyim və rəng uyumu).
* **2 Yaratma Üsulu:**
  1. Öz boydan şəklini yükləmək (Öndən, Yandan, Arxadan) + Bədən qeydləri.
  2. Baza Avatar seçib tənzimləmək: Dəri tonu, üz forması, saç düzümü (keçəl, qısa, uzun, buruq, saqqal) və ya hicab/kəlağayı bağlama forması + Bədən ölçüləri slayderləri (Boy, Çəki, Çiyin/Kürək, Sinə, Qarın hissəsi, Bel, Omba).
* **Smart Fit-Ratio:** Sistem istifadəçinin bədən ölçüləri ilə paltarın ölçüsünü (S, M, L, XL) müqayisə edərək paltarın bədəndə dar, normal və ya bol (oversize) durmasını fotorealistik tənzimləyir.

### C) OUTFITS (Kombin Planlayıcısı)
* Saxlanılmış kombinlər və Tədbir/Məkan filtri (İş/Ofis, Universitet/Məktəb, Toy/Ziyafət, İdman, Gəzinti, Səyahət).

## 5. Qiymət Paketləri, Limitlər, Keşləmə (Caching) və Lisenziya Qaydaları
* **Avatar Limiti YOXDUR:** Heç bir planda avatar sayı məhdudiyyəti yoxdur.
* **Qarderob (Storage) və Generasiya (Try-On) Ayrımı:**
  * **3 Günlük Pulsuz Sınaq (Free Trial):** 3 gün aktivdir -> Maksimum 8 geyimlik qarderob + 1-2 pulsuz Try-On krediti. (3 gün bitdikdə kartdan avtomatik pul ÇIXILMAMALIDIR).
  * **Starter Plan:** Normal: $3.99/ay -> Launch endirimi (40% OFF, ilk 3 ay): **$2.39/ay**. (8 geyimlik qarderob + Aylıq 15-20 Try-On krediti).
  * **Plus Plan:** Normal: $7.99/ay -> Launch endirimi (40% OFF): **$4.79/ay**. (24 geyimlik qarderob + Aylıq 50 Try-On krediti).
  * **Premium Plan:** Normal: $14.99/ay -> Launch endirimi (40% OFF): **$8.99/ay**. (50 geyimlik qarderob + Aylıq 100-120 Try-On krediti).
* **40% Endirimi İdarəetmə Şalteri:** Admin paneldə və ya `.env` faylında (`NEXT_PUBLIC_LAUNCH_DISCOUNT=true/false`) tək düymə olacaq. Kampaniya bitəndə `false` edilən kimi saytdakı bütün qiymətlər avtomatik normal qiymətə ($3.99 / $7.99 / $14.99) qayıdacaq.
* **Əlavə Paketlər (Add-ons):**
  * +10 Əlavə Qarderob Yeri (Yalnız saxlama): **$0.99**
  * +5 Əlavə Geyindirmə / Generasiya Krediti: **$2.99**
  * +10 Əlavə Geyindirmə / Generasiya Krediti: **$5.49**
* **Kredit Qoruma və Keşləmə (Caching):** Əməliyyatdan əvvəl kredit yoxlanılır; API xətası olarsa kredit avtomatik geri qaytarılır (refund). Eyni avatar + eyni paltar kombinasiyası Supabase Storage-də keşlənir (cached), ikinci dəfə geyiniləndə yenidən API xərci və kredit ÇIXILMIR.
* **Kommersiya Lisenziyası:** `IDM-VTON` qeyri-kommersiya lisenziyalı olduğu üçün İSTİFADƏ EDİLMƏYƏCƏK! Yalnız kommersiya icazəsi olan modellər (`FASHN VTON`, `Kling Kolors Virtual Try-On`, `Leffa`, `Flux`, `BiRefNet`, `Clarity Upscaler`) işlədiləcək.

## 6. Texniki Stek, Təhlükəsizlik (RLS) və Şəxsi Hosting
* **Stek:** Next.js (App Router), Tailwind CSS, GSAP ScrollTrigger / Framer Motion, Supabase (Auth, Database, Private Storage), Fal.ai API, Google Gemini API, OpenWeatherMap API, LemonSqueezy / Paddle (Payoneer çıxışlı).
* **Məxfilik və Təhlükəsizlik (RLS):** Bütün istifadəçi şəkilləri və bədən ölçüləri Supabase Private Storage-də **Row Level Security (RLS)** ilə qorunmalıdır. Hər kəs yalnız öz şəkillərini görə bilər. İstifadəçi paltarı və ya hesabı sildikdə şəkillər buluddan həmişəlik silinməlidir.
* **Hosting və Domen:** Vercel DEYİL! Sayt istifadəçinin öz aldığı şəxsi Domen və Node.js dəstəkli Hosting/VPS üzərində yayımlanacaq şəkildə qurulmalıdır.