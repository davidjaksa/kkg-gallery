import { prisma } from "@/lib/db";

/** yearSlug/albumSlug → display title */
const TITLES: Record<string, string> = {
  "tablok/1900-50": "Tablók, 1900–1950",
  "tablok/1950-60": "Tablók, 1950–1960",
  "tablok/1960-70": "Tablók, 1960–1970",
  "tablok/1970-80": "Tablók, 1970–1980",
  "tablok/1980-90": "Tablók, 1980–1990",
  "tablok/1990-00": "Tablók, 1990–2000",
  "tablok/2000-10": "Tablók, 2000–2010",
  "tablok/iskolatortenet": "Iskolatörténet",

  "2025-26/120-konyves-szulinap-konyves-nap": "120. Könyves szülinap, Könyves nap",
  "2025-26/arpadhazi-kiralyok-vetelkedo": "Árpád-házi királyok vetélkedő",
  "2025-26/devai-diakcsere": "Dévai diákcsere",
  "2025-26/faklyas-ballagas": "Fáklyás ballagás",
  "2025-26/farsang": "Farsang",
  "2025-26/helloween": "Halloween",
  "2025-26/kolteszet-napja": "Költészet napja",
  "2025-26/osztalytalalkozok-hetvegeje-faklyas-felvonulas":
    "Osztálytalálkozók hétvégéje – Fáklyás felvonulás",
  "2025-26/sarkanyhajozas": "Sárkányhajózás",
  "2025-26/szabaduloszoba-vetelkedo": "Szabadulószoba-vetélkedő",
  "2025-26/zold-tanterem": "Zöld tanterem",

  "2024-25/farsang": "Farsang",
  "2024-25/tavaszi-turatabor": "Tavaszi túratábor",

  "2023-24/ejszakai-hajsza": "Éjszakai hajsza",
  "2023-24/faklyas-ballagas": "Fáklyás ballagás",
  "2023-24/farsangi-het": "Farsangi hét",
  "2023-24/golyatabor": "Gólyatábor",
  "2023-24/kolteszet-napja": "Költészet napja",
  "2023-24/konyves-nap": "Könyves nap",
  "2023-24/nyar-doktabor": "Nyári DÖK tábor",
  "2023-24/tavaszi-turatabor": "Tavaszi túratábor",
  "2023-24/teli-tura-tabor": "Téli túratábor",
  "2023-24/termeszettudomanyos-bazar": "Természettudományos bazár",

  "2022-23/farsangi-het": "Farsangi hét",
  "2022-23/golyatabor": "Gólyatábor",
  "2022-23/helloween": "Halloween",
  "2022-23/konyves-vb-fesztival": "Könyves VB-fesztivál",
  "2022-23/oszi-turatabor": "Őszi túratábor",
  "2022-23/tavaszi-turatabor": "Tavaszi túratábor",
  "2022-23/teli-turatabor": "Téli túratábor",

  "2021-22/dok-tabor": "DÖK tábor",
  "2021-22/golyasziget": "Gólyasziget",
  "2021-22/nyari-dok-tabor": "Nyári DÖK tábor",
  "2021-22/oszi-turatabor": "Őszi túratábor",
  "2021-22/vegre-vege-nap": "Végre vége nap",

  "2020-21/golyasziget": "Gólyasziget",
  "2020-21/golyatabor": "Gólyatábor",
  "2020-21/oszi-turatabor": "Őszi túratábor",

  "2019-20/golyasziget": "Gólyasziget",
  "2019-20/golyatabor": "Gólyatábor",
  "2019-20/oszi-turatabor": "Őszi túratábor",
  "2019-20/tavaszi-turatabor": "Tavaszi túratábor",

  "2018-19/golyatabor": "Gólyatábor",
  "2018-19/dok-tabor": "DÖK tábor",

  "2014-15/bolondb": "Bolondballagás",
  "2014-15/marc15": "Március 15.",
  "2014-15/mikulas": "Mikulás",
  "2014-15/osztkepek": "Osztályképek",
  "2014-15/szalagavato": "Szalagavató",
  "2014-15/telitabor": "Téli tábor",

  "2013-14/biciklistabor": "Biciklis tábor",
  "2013-14/bolondb": "Bolondballagás",
  "2013-14/diakolimpia-dijkioszto": "Diákolimpia díjkiosztó",
  "2013-14/doktabor": "DÖK tábor",
  "2013-14/ejszakaikosar": "Éjszakai kosár",
  "2013-14/faklyas": "Fáklyás ballagás",
  "2013-14/galaxisok": "Galaxisok találkozása",
  "2013-14/gt": "Gólyatábor",
  "2013-14/konyvesnap": "Könyves nap",
  "2013-14/mikulas": "Mikulás",
  "2013-14/okt23": "Október 23.",
  "2013-14/osztalykepek": "Osztályképek",
  "2013-14/sitabor": "Sítábor",
  "2013-14/szalagavato": "Szalagavató",
  "2013-14/szamhaboru": "Számháború",
  "2013-14/telitabor": "Téli tábor",

  "2012-13/babits-vetelkedo": "Babits-vetélkedő",
  "2012-13/bolondballagas": "Bolondballagás",
  "2012-13/elosakk-ujpest": "Élő sakk (Újpest)",
  "2012-13/fizikus": "Fizikus Show",
  "2012-13/golyasziget": "Gólyasziget",
  "2012-13/golyatabor": "Gólyatábor",
  "2012-13/konyvesnap": "Könyves nap",
  "2012-13/marcius-15": "Március 15.",
  "2012-13/osztalykepek": "Osztályképek",
  "2012-13/szalagavato": "Szalagavató",
  "2012-13/teli-tabor": "Téli tábor",
  "2012-13/ujpesti-sportnap": "Újpesti sportnap",

  "2011-12/ballagas": "Ballagás",
  "2011-12/biciklis-tabor": "Biciklis tábor",
  "2011-12/bmuv-babits": "Babits Mihály Újpesten vetélkedő (Babits)",
  "2011-12/bmuv-ujpest": "Babits Mihály Újpesten vetélkedő (Újpest)",
  "2011-12/bolondballagas": "Bolondballagás",
  "2011-12/dok-tabor": "DÖK tábor",
  "2011-12/edg-drcaligari": "EDG – Dr. Caligari",
  "2011-12/ejszakai-kosar": "Éjszakai kosár",
  "2011-12/elosak": "Élő sakk",
  "2011-12/golyasziget": "Gólyasziget",
  "2011-12/golyatabor": "Gólyatábor",
  "2011-12/halloween": "Halloween",
  "2011-12/kerekparos-nap": "Kerékpáros nap",
  "2011-12/kolteszet-napja": "Költészet napja",
  "2011-12/konyvesfeszt": "Könyvesfeszt",
  "2011-12/konyvesnap": "Könyves nap",
  "2011-12/marcius-15": "Március 15.",
  "2011-12/mikulas": "Mikulás",
  "2011-12/nomad-tabor": "Nomád tábor",
  "2011-12/osztalykepek": "Osztályképek",
  "2011-12/reneszansz-dok-tabor": "Reneszánsz DÖK tábor",
  "2011-12/sitabor": "Sítábor",
  "2011-12/suit-up-day": "Suit Up Day",
  "2011-12/szalagavato": "Szalagavató",
  "2011-12/szamhaboru": "Számháború",
  "2011-12/teli-tabor": "Téli tábor",
  "2011-12/vakuum-koncert": "Vákuum koncert",
  "2011-12/verbenyi-kupa": "Verbényi-kupa",

  "2010-11/bolondballagas": "Bolondballagás",
  "2010-11/dok-tabor": "DÖK tábor",
  "2010-11/ejszakai-kosar": "Éjszakai kosár",
  "2010-11/faklyas-ballagas": "Fáklyás ballagás",
  "2010-11/faraday-day": "Faraday Day",
  "2010-11/golyasziget": "Gólyasziget",
  "2010-11/golyatabor": "Gólyatábor",
  "2010-11/halloween": "Halloween",
  "2010-11/karacsonyi-koncert": "Karácsonyi koncert",
  "2010-11/konyvesfeszt": "Könyvesfeszt",
  "2010-11/konyveshet": "Könyves hét",
  "2010-11/marcius-15": "Március 15.",
  "2010-11/mikulas": "Mikulás",
  "2010-11/sitabor": "Sítábor",
  "2010-11/szalagavato": "Szalagavató",
  "2010-11/szamhaboru": "Számháború",
  "2010-11/teli-tabor": "Téli tábor",
  "2010-11/tori-vetelkedo": "Töri vetélkedő",
  "2010-11/turavalaszto": "Túraválasztó",
  "2010-11/valentin-nap": "Valentin-nap",
  "2010-11/vizi-tabor": "Vízi tábor",

  "2009-10/ballagas": "Ballagás",
  "2009-10/bolondballagas": "Bolondballagás",
  "2009-10/enekkar-olaszorszag": "Énekkar, Olaszország",
  "2009-10/golyabal": "Gólyabál",
  "2009-10/golyatabor": "Gólyatábor",
  "2009-10/halloween": "Halloween",
  "2009-10/konyvesnap": "Könyves nap",
  "2009-10/megyeri-hid": "Megyeri híd",
  "2009-10/mikulas": "Mikulás",
  "2009-10/olaszorszag-csere": "Olaszországi csere",
  "2009-10/osztalykepek": "Osztályképek (2008–2009)",
  "2009-10/osztalykepek-2": "Osztályképek (2009–2010)",
  "2009-10/pinceklub-festes": "Pinceklub festés",
  "2009-10/sitabor": "Sítábor",
  "2009-10/szalagavato": "Szalagavató",
  "2009-10/szamhaboru": "Számháború",
  "2009-10/valentin-nap": "Valentin-nap",
  "2009-10/vizi-tabor": "Vízi tábor",

  "2008-09/ejszakai-kosar": "Éjszakai kosár",
  "2008-09/golyatabor": "Gólyatábor",
  "2008-09/sitabor": "Sítábor",
  "2008-09/szalagavato": "Szalagavató",
  "2008-09/teli-tabor": "Téli tábor",
  "2008-09/valentin-nap": "Valentin-nap",
  "2008-09/visegradi-hajokirandulas": "Visegrádi hajókirándulás",
  "2008-09/vizi-tabor": "Vízi tábor",

  "2007-08/golyatabor": "Gólyatábor",
  "2007-08/golyavetelkedo": "Gólyavetélkedő",
  "2007-08/konyves-open-poker-party": "Könyves Open pókerparti",
  "2007-08/sitabor": "Sítábor",
  "2007-08/szalagavato": "Szalagavató",
  "2007-08/vizi-tabor": "Vízi tábor",

  "2006-07/biciklis-tabor": "Biciklis tábor",
  "2006-07/golyabal": "Gólyabál",
  "2006-07/golyatabor": "Gólyatábor",
  "2006-07/golyavetelkedo": "Gólyavetélkedő",
  "2006-07/kepzomuveszeti-kiallitas": "Képzőművészeti kiállítás",
  "2006-07/osztalykepek": "Osztályképek",
  "2006-07/sitabor": "Sítábor",
  "2006-07/szalagavato": "Szalagavató",
  "2006-07/szinjatszos-tabor": "Színjátszós tábor",
  "2006-07/tanevnyito-piknik": "Tanévnyitó piknik",
  "2006-07/teli-tabor": "Téli tábor",
  "2006-07/verbenyi-kupa": "Verbényi-kupa",
  "2006-07/vizi-tabor": "Vízi tábor",

  "2005-06/biciklis-tabor": "Biciklis tábor",
  "2005-06/faklyas-ballagas": "Fáklyás ballagás",
  "2005-06/golyatabor": "Gólyatábor",
  "2005-06/golyavetelkedo": "Gólyavetélkedő",
  "2005-06/halloween": "Halloween",
  "2005-06/hungaroring": "Hungaroring",
  "2005-06/irodalmi-teahaz": "Irodalmi teaház",
  "2005-06/kolteszet-napja": "Költészet napja",
  "2005-06/konyvesnap": "Könyves nap",
  "2005-06/osztalykepek": "Osztályképek",
  "2005-06/sitabor": "Sítábor",
  "2005-06/szalagavato": "Szalagavató",
  "2005-06/tanaraink": "Tanáraink",
  "2005-06/teli-tabor": "Téli tábor",
  "2005-06/verbenyi-kupa": "Verbényi-kupa",
  "2005-06/vizi-tabor": "Vízi tábor",

  "2004-05/ballagas": "Ballagás",
  "2004-05/bicajozas": "Bicajozás (2004. április 8.)",
  "2004-05/bicajozas-2": "Bicajozás (2004. május 30.)",
  "2004-05/biciklis-tabor": "Biciklis tábor",
  "2004-05/golyavetelkedo": "Gólyavetélkedő",
  "2004-05/osztalykepek": "Osztályképek",
  "2004-05/piszkesteto-csillagasz": "Piszkéstető, csillagászat",
  "2004-05/sitabor": "Sítábor",
  "2004-05/szinjatszos-tabor": "Színjátszós tábor",
  "2004-05/tanevzaro-piknik": "Tanévzáró piknik",
  "2004-05/teli-tabor": "Téli tábor",
  "2004-05/vizi-tabor": "Vízi tábor",

  "2003-04/ballagas-12c": "Ballagás 12. c",
  "2003-04/biciklis-tabor": "Biciklis tábor",
  "2003-04/bogracs": "Bogrács",
  "2003-04/bolondballagas": "Bolondballagás",
  "2003-04/konyvesfeszt": "Könyvesfeszt",
  "2003-04/konyvesnap": "Könyves nap",
  "2003-04/mikulas": "Mikulás",
  "2003-04/osztalykepek": "Osztályképek",
  "2003-04/osztalykirandulas-9b": "Osztálykirándulás 9. b",
  "2003-04/szalagavato": "Szalagavató",
  "2003-04/tavaszi-turatabor": "Tavaszi túratábor",
  "2003-04/teli-tabor": "Téli tábor",
  "2003-04/vizi-tabor": "Vízi tábor",

  "2002-03/mikulas": "Mikulás",
};

async function main() {
  const albums = await prisma.album.findMany({
    include: { year: { select: { slug: true } } },
  });

  let changed = 0;
  let missing = 0;
  for (const album of albums) {
    const key = `${album.year.slug}/${album.slug}`;
    const title = TITLES[key];
    if (!title) {
      missing += 1;
      console.warn(`No mapping for ${key} (${album.title})`);
      continue;
    }
    if (title === album.title) continue;
    await prisma.album.update({ where: { id: album.id }, data: { title } });
    changed += 1;
    console.log(`  ${key}: ${album.title} → ${title}`);
  }
  console.log(`Updated ${changed} titles; ${missing} unmapped`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
