## Hızlı Özet
Bu depo şimdilik çok minimal: kök dizinde sadece `README.md` ve `LICENSE` var. Bu nedenle bu talimatlar "şu anda keşfedilebilir" bilgiyi, acil görevleri ve bir AI yardımcı için başlangıç kontrol listesini içerir.

## Ana hedefler (kısa)
- Depoyu hızlıca keşfet: hangi dil/çerçeve/mimari eksik veya eksik dosyalar nerede?
- Değişiklik yapmadan önce repo'da (ör. `package.json`, `pyproject.toml`, `src/`, `tests/`) arama yap.
- İlgisiz genelleştirmelerden kaçın: yalnızca bu depoda görünür veya açığa çıkarılabilen kalıpları belgele ve kullan.

## Mevcut keşif (kod tabanından alınan somut örnekler)
- Kök: `README.md` — proje adı "linechess-26"; başka kod, konfigürasyon veya test dosyası bulunmuyor.
- Kök: `LICENSE` — lisans var, repo aktif olarak korunuyor olabilir.

## Adım adım çalışma rehberi (AI ajanı için)
1. İlk olarak depo kökünde bu dosyayı ve `README.md`'yi okuyup özetle.
2. Ardından aşağıdaki dosya/pattern listesinde arama yap: `package.json`, `yarn.lock`, `pnpm-lock.yaml`, `pyproject.toml`, `requirements.txt`, `setup.py`, `Cargo.toml`, `go.mod`, `src/`, `app/`, `tests/`.
   - Eğer herhangi biri bulunursa, ilgili dil/komut talimatını takip et (ör. `package.json` varsa `npm install`, `npm test` gibi). Bu dosyaların yokluğu da önemli bilgidir — bunu PR açıklamasına ekle.
3. Yeni özellik eklemeden veya kod değiştirmeden önce: açık bir iş (issue) yoksa kısa bir GitHub Issue taslağı oluştur (başlık + 2-3 cümle amaç + hangi dosyalar eklenmesi gerektiği).

## Proje-spesifik kurallar / tercih edilen davranışlar
- Şu an depo minimal olduğu için hiçbir proje konvansiyonu somutlaşmamış. Bu nedenle:
  - Dosya/dizin eklerken kök altında `src/` ve `tests/` oluştur; dili açıkça belirten manifest dosyası ekle (ör. `package.json` veya `pyproject.toml`).
  - Değişiklikler küçük, tek amaçlı ve iyi bir commit mesajıyla gelmeli (Türkçe veya İngilizce kabul edilir; PR başına 1 konu).

## Kod yazarken dikkat edilecek somut kontroller
- Yeni dosya/dizin ekliyorsan README'ye kısa bir kullanım/dosya listesi ekle.
- Test ekliyorsan minimal bir çalıştırma örneği ver (`npm test` veya `pytest` gibi). Eğer test runner yoksa `tests/` içinde bir `README.md` ile çalıştırma talimatı bırak.

## Entegre edilmesi gereken bilgileri bulduğunda (örnek senaryolar)
- Eğer `package.json` eklenmişse: özetle hangi script'ler var (`start`, `build`, `test`) ve önerilen hızlı komutlar nelerdir.
- Eğer Python proje dosyası (`pyproject.toml`/`requirements.txt`) eklenirse: hangi Python sürümü hedeflendiğini ve hangi test komutunun beklendiğini belgele.

## Ne yapılmamalı (sınırlar)
- Depo dışı varsayımlarda bulunma (ör. "bu bir React projesidir" demek için package.json yoksa kanıt göster).
- Geniş refactor veya büyük mimari kararlar için doğrudan PR açma — önce issue oluştur ve sahibine at. Minimal değişikliklerle ilerle.

## Kısa kontrol listesi (PR açmadan önce)
- README'yi güncelledin mi (kısa kullanım veya kurulum notu)?
- Yeni manifest/test dosyalarını ekledin mi ve temel komutları belgeledin mi?
- Commit/PR açıklamasında değişikliğin gerekçesini (kısa) ekledin mi?

---
Eğer bu dosyada eksik veya belirsiz bir nokta varsa, lütfen hangi dosyaların eklendiğini veya hangi dilin kullanılacağını söyle; dosyayı hızlıca güncellerim.
