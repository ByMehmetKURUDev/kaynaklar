// README.md (Türkçe) ve README.en.md'yi mehmetkuru.dev/kaynaklar verisinden üretir.
// Bağımlılık yok; Node 18+. Çalıştırma: node guncelle.mjs
import { writeFile } from 'node:fs/promises';

const SITE = 'https://mehmetkuru.dev';
const VERI = `${SITE}/api/v1/kaynaklar?bicim=tam`;
const DEPO = 'https://github.com/ByMehmetKURUDev/kaynaklar';

const METIN = {
  tr: {
    dosya: 'README.md', yol: '/kaynaklar', diger: '[English](README.en.md)',
    baslik: 'Kaynaklar',
    giris: (n) => `Yapay zekâ, otomasyon, tasarım ve yazılım geliştirme için seçtiğimiz ${n} araç, eklenti ve rehber; çoğu açık kaynak. Her birinin Türkçe açıklaması ve kurulum adımları [mehmetkuru.dev/kaynaklar](${SITE}/kaynaklar/) sayfasında.`,
    icindekiler: 'İçindekiler', proje: 'Proje', lisans: 'Lisans', lisansYok: 'belirtilmemiş',
    ucretsiz: 'Ücretsiz', acik: 'Açık kaynak', rehber: 'Türkçe rehber', video: 'Video',
    not: 'Bu depo yalnız bağlantı ve kısa özet içerir. Projeler kendi sahiplerine aittir ve kendi lisanslarıyla dağıtılır. Liste her gün mehmetkuru.dev verisinden otomatik güncellenir.',
    son: 'Son veri güncellemesi',
  },
  en: {
    dosya: 'README.en.md', yol: '/en/kaynaklar', diger: '[Türkçe](README.md)',
    baslik: 'Resources',
    giris: (n) => `${n} tools, plugins and guides, most of them open source, that we picked for AI, automation, design and software development. Each one has a description and setup steps on [mehmetkuru.dev/en/kaynaklar](${SITE}/en/kaynaklar/).`,
    icindekiler: 'Contents', proje: 'Project', lisans: 'License', lisansYok: 'not specified',
    ucretsiz: 'Free', acik: 'Open source', rehber: 'Guide', video: 'Video',
    not: 'This repository only contains links and short summaries. Each project belongs to its owners and is distributed under its own license. The list is updated daily from mehmetkuru.dev data.',
    son: 'Data last updated',
  },
};

async function veriyiAl() {
  for (let deneme = 1; ; deneme++) {
    try {
      const yanit = await fetch(VERI, { headers: { accept: 'application/json' } });
      if (!yanit.ok) throw new Error(`HTTP ${yanit.status}`);
      return await yanit.json();
    } catch (hata) {
      // Ücretsiz sunucu uykudaysa ilk istek düşebilir.
      if (deneme === 4) throw hata;
      await new Promise((r) => setTimeout(r, 20000));
    }
  }
}

const sec = (alan, dil) => (alan && typeof alan === 'object' ? alan[dil] || alan.tr || '' : alan || '');
const tek = (s) => String(s).replace(/\s+/g, ' ').trim();
const capa = (s) => String(s).toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-');

function projeAdi(adres) {
  const m = /^https:\/\/github\.com\/([^/]+\/[^/#?]+)/.exec(adres);
  return m ? m[1] : new URL(adres).hostname.replace(/^www\./, '');
}

function uret(veri, dil) {
  const m = METIN[dil];
  const kaynaklar = veri.kaynaklar;
  const satirlar = [`# ${m.baslik}`, '', m.diger, '', m.giris(kaynaklar.length), '', `## ${m.icindekiler}`, ''];
  const gruplar = veri.kategoriler
    .map((k) => ({ ad: sec(k.ad, dil), liste: kaynaklar.filter((x) => x.kategori === k.anahtar) }))
    .filter((g) => g.liste.length);
  for (const g of gruplar) satirlar.push(`- [${g.ad}](#${capa(g.ad)}) (${g.liste.length})`);
  for (const g of gruplar) {
    satirlar.push('', `## ${g.ad}`);
    g.liste.sort((a, b) => a.sira - b.sira || sec(a.baslik, dil).localeCompare(sec(b.baslik, dil), dil));
    for (const k of g.liste) {
      const ozellik = [`${m.lisans}: ${k.lisans || m.lisansYok}`];
      if (k.ucretsiz) ozellik.push(m.ucretsiz);
      if (k.acik_kaynak) ozellik.push(m.acik);
      satirlar.push(
        '',
        `<a id="${k.slug}"></a>`,
        '',
        `### ${tek(sec(k.baslik, dil))}`,
        '',
        tek(sec(k.ozet, dil)),
        '',
        `- ${m.proje}: [${projeAdi(k.baglanti)}](${k.baglanti}) · ${ozellik.join(' · ')}`,
        `- ${m.rehber}: [mehmetkuru.dev${m.yol}/${k.slug}/](${SITE}${m.yol}/${k.slug}/)`,
      );
      if (k.youtube_short) satirlar.push(`- ${m.video}: [YouTube Shorts](${k.youtube_short})`);
    }
  }
  const son = kaynaklar.map((k) => k.updated_at || '').sort().pop()?.slice(0, 10) || '';
  satirlar.push('', '---', '', m.not, '', `${m.son}: ${son} · [${DEPO.replace('https://', '')}](${DEPO})`, '');
  return satirlar.join('\n');
}

const veri = await veriyiAl();
if (!Array.isArray(veri.kaynaklar) || veri.kaynaklar.length === 0) throw new Error('Kaynak listesi boş');
for (const dil of Object.keys(METIN)) await writeFile(METIN[dil].dosya, uret(veri, dil));
console.log(`${veri.kaynaklar.length} kaynak yazıldı`);
