// Investor prototype (11 Nov 2026): the Azerbaijani texts of the curated looks, proofread and rewritten
// by hand (Gemini's Azerbaijani had mistakes its own check did not catch). Overwrites only "az".
// Usage: node scripts/fal/proto-az.mjs
import fs from "node:fs";

const FILE = "src/lib/wardrobe/curated-texts.json";
const AZ = {
  "m1-7": {"note":"Bej çinos və ağ futbolka: isti gün üçün yüngül və rahat kombin.","weather":"Hava 21–32°C olacaq. Pambıq futbolka və nazik çinos isti havada sərin saxlayır.","harmony":"Ağ futbolka bej şalvarla təmiz, sakit və yay üçün uyğun görünür.","layers":"Bu, tək qatlı kombindir: isti havada başqa qat lazım deyil."},
  "m1-10": {"note":"Tünd cins və qara pufer gödəkçə: soyuq gün üçün isti və sadə kombin.","weather":"Hava 6°C-dən soyuq olacaq, 0°C-yə qədər düşə bilər. Pufer gödəkçə küləkdə də bədəni isti saxlayır.","harmony":"Qara gödəkçə tünd göy cinslə sakit və şəhər üçün səliqəli görünür.","layers":"Gödəkçənin altına isti, uzunqol bir geyim geyin. İçəridə gödəkçəni çıxara bilərsən."},
  "f1-7": {"note":"Açıq mavi cins və ağ futbolka: isti gün üçün sadə və təravətli kombin.","weather":"Hava 21–32°C olacaq. Pambıq futbolka isti havada rahatdır və nəfəs alır.","harmony":"Ağ futbolka açıq mavi cinslə ən sadə, amma həmişə gözəl görünən birləşmədir.","layers":"Bu, tək qatlı kombindir: isti havada başqa qat lazım deyil."},
  "f1-8": {"note":"Krem trikotaj don: mülayim gün üçün yumşaq və zərif seçim.","weather":"Hava 12–17°C olacaq. Uzunqollu trikotaj don sərin səhərdə də, mülayim gündüzdə də rahatdır.","harmony":"Krem rəng sakit və işıqlı görünür, sadə forması isə hər yerə yaraşır.","layers":"Səhər çölə çıxanda üstünə yüngül palto geyin. Günorta isinəndə onu çıxara bilərsən."},
  "f1-9": {"note":"Qara enli şalvar və dəvəyunu rəngli qısa palto: soyuq gün üçün klassik və isti kombin.","weather":"Hava 6°C-dən soyuq olacaq, 0°C-yə qədər düşə bilər. Yun palto və yun şalvar soyuqda isti saxlayır.","harmony":"Dəvəyunu rəngli palto qara şalvarla zərif, həmişə dəbdə olan kontrast yaradır.","layers":"Paltonun altına isti, uzunqol bir geyim geyin. İçəridə paltonu çıxara bilərsən."},
  "m1-1": {
    note: "Tünd cins və boz merinos sviter: sərin gün üçün rahat və səliqəli seçim.",
    weather: "Gün ərzində hava 7–12°C olacaq. Merinos yunundan sviter səni küləkdə də isti saxlayır.",
    harmony: "Tünd göy cins şalvar boz sviterlə sakit və zövqlü uyğunlaşır.",
    layers: "Sviterin altına nazik futbolka geyə bilərsən. Hava 15°C-dən soyuq olduğu üçün çölə çıxanda üstünə isti palto geyin.",
  },
  "m1-2": {
    note: "Tünd göy yun şalvar və boz sviter: iş günü üçün həm isti, həm də ciddi görünüş.",
    weather: "Hava 9–13°C arasında olacaq, külək sərin əsəcək. Yun şalvar və merinos sviter səni bütün gün isti saxlayır.",
    harmony: "Tünd göy və boz rənglər bir-birini yumşaq tamamlayır, görünüş səliqəli və sakit olur.",
    layers: "Çöldə üstünə isti palto geyin. İçəridə paltonu çıxarıb sviterdə qala bilərsən.",
  },
  "m1-3": {
    note: "Bej çinos və boz sviter: sərin payız günü üçün yüngül və rahat kombin.",
    weather: "Hava 10–15°C olacaq. Merinos sviter sərin havada isti saxlayır, amma tərlətmir.",
    harmony: "Tünd boz sviter açıq bej şalvarla gözəl kontrast yaradır.",
    layers: "Səhər və axşam hava 15°C-dən soyuq olur, çöldə üstünə isti palto geyin. İçəridə paltonu çıxara bilərsən.",
  },
  "m1-4": {
    note: "Tünd göy yun şalvar və açıq mavi köynək: isti günorta üçün klassik kombin.",
    weather: "Hava səhər 9°C, günorta isə 19°C-yə qədər olacaq. Pambıq köynək isti saatlarda rahatdır.",
    harmony: "Açıq mavi və tünd göy rənglər bir-birini təmiz və səliqəli tamamlayır.",
    layers: "Səhər soyuq olur, çölə çıxanda üstünə isti palto geyin. Günorta hava isinəndə paltonu çıxara bilərsən.",
  },
  "m1-5": {
    note: "Bej çinos və açıq mavi köynək: mülayim gün üçün təravətli və səliqəli kombin.",
    weather: "Hava 13–18°C olacaq. Pambıq köynək günortanın istisində rahatdır.",
    harmony: "Açıq mavi köynək bej şalvarla sakit və həmişə uğurlu uyğunluq yaradır.",
    layers: "Səhər hava 15°C-dən soyuq olur, çıxanda üstünə yüngül palto geyin. Günorta hava isinəndə onu çıxara bilərsən.",
  },
  "f1-1": {
    note: "Tünd göy trikotaj midi don: sərin gün üçün həm zərif, həm də isti seçim.",
    weather: "Hava 7–12°C olacaq. Uzunqollu trikotaj don soyuqda isti saxlayır.",
    harmony: "Tünd göy rəng sakit və zərif görünür, sadə forması isə hər yerə yaraşır.",
    layers: "Çöldə üstünə isti palto geyin. Daha isti olsun deyə altına incə termal geyim də geyə bilərsən.",
  },
  "f1-2": {
    note: "Qara enli şalvar və ağ köynək: iş günü üçün klassik və səliqəli kombin.",
    weather: "Hava 9–13°C olacaq. Yun şalvar isti saxlayır, pambıq köynək isə gün boyu rahatdır.",
    harmony: "Ağ və qara rənglərin aydın kontrastı heç vaxt dəbdən düşmür. Yüksək belli enli şalvar boyu uzun göstərir.",
    layers: "Külək sərin olacaq, çöldə üstünə isti palto geyin. İçəridə paltonu çıxarıb köynəkdə qala bilərsən.",
  },
  "f1-3": {
    note: "Açıq mavi cins və ipək bluz: sakit payız günü üçün yüngül və zərif kombin.",
    weather: "Hava 10–15°C olacaq. Uzunqollu ipək bluz yüngüldür, ona görə çöldə isti üst geyim lazımdır.",
    harmony: "Açıq mavi cins ilə fil sümüyü rəngli ipək bluz təmiz və təravətli görünür.",
    layers: "Səhər və axşam hava 15°C-dən soyuq olur, çöldə üstünə isti palto geyin. İçəridə onu çıxara bilərsən.",
  },
  "f1-4": {
    note: "Açıq mavi cins və ağ köynək: hər yerə yaraşan sadə və təravətli kombin.",
    weather: "Hava səhər 9°C, günorta isə 19°C-yə qədər olacaq. Pambıq köynək isti saatlarda rahatdır.",
    harmony: "Ağ köynək açıq mavi cinslə təmiz, gündəlik və zövqlü görünür.",
    layers: "Səhər soyuq olur, çölə çıxanda üstünə isti palto geyin. Günorta hava isinəndə onu çıxara bilərsən.",
  },
  "f1-5": {
    note: "Dəvəyunu rəngli büzməli ətək və ipək bluz: mülayim gün üçün zərif kombin.",
    weather: "Hava 13–18°C olacaq. Uzunqollu ipək bluz və midi ətək mülayim havada rahatdır.",
    harmony: "Dəvəyunu və fil sümüyü rəngləri isti, yumşaq və zərif uyğunluq yaradır.",
    layers: "Səhər hava 15°C-dən soyuq olur, çıxanda üstünə yüngül palto geyin. Günorta hava isinəndə onu çıxara bilərsən.",
  },
};

// The one-line headline in every language, written by hand (one Gemini headline came back in Turkish
// under "en" and passed its check).
const NOTES = {
  "m1-7": ["Beige chinos and a white t-shirt: light and easy for a warm day.","Bej chino ve beyaz tişört: sıcak bir gün için hafif ve rahat."],
  "m1-10": ["Dark jeans and a black puffer jacket: warm and simple for a cold day.","Koyu kot ve siyah şişme mont: soğuk bir gün için sıcak ve sade."],
  "f1-7": ["Light blue jeans and a white t-shirt: simple and fresh for a warm day.","Açık mavi kot ve beyaz tişört: sıcak bir gün için sade ve ferah."],
  "f1-8": ["A cream knit dress: soft and elegant for a mild day.","Krem triko elbise: ılık bir gün için yumuşak ve zarif."],
  "f1-9": ["Black wide-leg trousers and a camel short coat: a warm classic for a cold day.","Siyah bol paça pantolon ve camel kısa kaban: soğuk bir gün için sıcak bir klasik."],
  "m1-1": [
    "Dark jeans and a grey merino sweater: an easy, neat choice for a cool day.",
    "Koyu kot ve gri merinos kazak: serin bir gün için rahat ve derli toplu bir seçim."
  ],
  "m1-2": [
    "Navy wool trousers and a grey sweater: warm and sharp for a working day.",
    "Lacivert yün pantolon ve gri kazak: iş günü için hem sıcak hem şık."
  ],
  "m1-3": [
    "Beige chinos and a grey sweater: light and comfortable for a cool autumn day.",
    "Bej chino ve gri kazak: serin bir sonbahar günü için hafif ve rahat."
  ],
  "m1-4": [
    "Navy wool trousers and a light blue shirt: a classic for a warm afternoon.",
    "Lacivert yün pantolon ve açık mavi gömlek: ılık bir öğleden sonra için klasik."
  ],
  "m1-5": [
    "Beige chinos and a light blue shirt: fresh and neat for a mild day.",
    "Bej chino ve açık mavi gömlek: ılık bir gün için ferah ve derli toplu."
  ],
  "f1-1": [
    "A navy knit midi dress: elegant and warm for a cool day.",
    "Lacivert triko midi elbise: serin bir gün için hem zarif hem sıcak."
  ],
  "f1-2": [
    "Black wide-leg trousers and a white shirt: a polished classic for a working day.",
    "Siyah bol paça pantolon ve beyaz gömlek: iş günü için şık bir klasik."
  ],
  "f1-3": [
    "Light blue jeans and an ivory silk blouse: light and elegant for a calm autumn day.",
    "Açık mavi kot ve fildişi ipek bluz: sakin bir sonbahar günü için hafif ve zarif."
  ],
  "f1-4": [
    "Light blue jeans and a white shirt: simple, fresh and right for anywhere.",
    "Açık mavi kot ve beyaz gömlek: her yere uyan sade ve ferah bir kombin."
  ],
  "f1-5": [
    "A camel pleated midi skirt and a silk blouse: graceful for a mild day.",
    "Camel pliseli midi etek ve ipek bluz: ılık bir gün için zarif."
  ]
};

const texts = JSON.parse(fs.readFileSync(FILE, "utf8"));
for (const [id, az] of Object.entries(AZ)) {
  if (!texts[id]) {
    console.log(`skip ${id}: no accepted card yet`);
    continue;
  }
  texts[id].note = { en: NOTES[id][0], az: az.note, tr: NOTES[id][1] };
  for (const k of ["weather", "harmony", "layers"]) texts[id].why[k].az = az[k];
}
// Every text must be in its own language: no Turkish or Azerbaijani letters in en, no ə in tr, no Cyrillic.
for (const [id, card] of Object.entries(texts)) {
  for (const part of [card.note, card.why.weather, card.why.harmony, card.why.layers]) {
    if (/[şğıçöüəİ]/i.test(part.en)) throw new Error(`${id}: en text is not English: ${part.en}`);
    if (/ə/.test(part.tr)) throw new Error(`${id}: tr text has ə: ${part.tr}`);
    if (/[Ѐ-ӿ]/.test(JSON.stringify(part))) throw new Error(`${id}: Cyrillic letters`);
  }
}
fs.writeFileSync(FILE, JSON.stringify(texts, null, 2) + "\n");
console.log("az written:", Object.keys(AZ).filter((id) => texts[id]).join(", "));
