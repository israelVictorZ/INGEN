/**
 * Popula o banco com os times, jogadores, vagas e notícias iniciais.
 * Idempotente: pode rodar várias vezes.  ->  npm run db:seed
 */
import "dotenv/config";
import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "../src/db";
import type { Role, NewsCategory } from "../src/db/schema";

const TEAMS = [
  { slug: "black", name: "INGEN Black", shortName: "Black", sortOrder: 1, accent: "green", tagline: "O escudo em sua forma mais afiada." },
  { slug: "silver", name: "INGEN Silver", shortName: "Silver", sortOrder: 2, accent: "silver", tagline: "Forjada no aço, pronta para subir." },
];

const ROSTER: { team: string; role: Role; slug: string; displayName: string; gameName: string; tagLine: string }[] = [
  { team: "black", role: "JUNGLE", slug: "atlas", displayName: "Atlas", gameName: "IGN Atlas", tagLine: "IGN" },
  { team: "black", role: "MID", slug: "clyde", displayName: "Clyde", gameName: "SooH Clyde", tagLine: "1010" },
  { team: "black", role: "ADC", slug: "coelho", displayName: "Coelho", gameName: "IGN Coelho", tagLine: "SooH" },
  { team: "black", role: "SUPPORT", slug: "czar", displayName: "Czar", gameName: "Czar", tagLine: "Tzar" },
  { team: "silver", role: "TOP", slug: "thriller", displayName: "Thriller", gameName: "FD Thriller", tagLine: "FDS" },
  { team: "silver", role: "JUNGLE", slug: "miku", displayName: "Miku", gameName: "Yandere Miku", tagLine: "Three" },
  { team: "silver", role: "ADC", slug: "hayha", displayName: "Hayha", gameName: "HayhaWD", tagLine: "branc" },
  { team: "silver", role: "SUPPORT", slug: "bonnie", displayName: "Bonnie", gameName: "SooH Bonnie", tagLine: "1010" },
];

const OPEN: { team: string; role: Role }[] = [
  { team: "black", role: "TOP" },
  { team: "silver", role: "MID" },
];

const NEWS: { slug: string; title: string; excerpt: string; category: NewsCategory; pinned?: boolean; teamSlug?: string; daysAgo: number; body: string }[] = [
  {
    slug: "bem-vindos-ao-novo-site",
    title: "Bem-vindos à nova casa da INGEN",
    excerpt: "Elencos, estatísticas ao vivo da Riot, comparação de jogadores e relatórios de scouting, tudo em um só lugar.",
    category: "comunicado",
    pinned: true,
    daysAgo: 0,
    body: `A INGEN agora tem um lar oficial na internet.

Aqui você encontra os **elencos da INGEN Black e da INGEN Silver**, o perfil de cada jogador com dados atualizados direto da API da Riot Games, e ferramentas pensadas para quem joga sério:

- **Comparar jogadores** do mesmo time, métrica por métrica;
- **Relatório de scouting** de cada time, pronto para enviar a outras equipes;
- **Ranking interno** por elo;
- Links diretos para o **op.gg** de cada jogador.

Este é só o começo. Novas funcionalidades chegam em breve.`,
  },
  {
    slug: "recrutamento-top-e-mid",
    title: "Recrutamento aberto: TOP e MID",
    excerpt: "Estamos procurando um TOP para a INGEN Black e um MID para a INGEN Silver.",
    category: "recrutamento",
    daysAgo: 1,
    body: `A INGEN está com **duas vagas abertas**:

- **TOP** na INGEN Black;
- **MID** na INGEN Silver.

Procuramos jogadores comprometidos, com disponibilidade para treinos e vontade de evoluir em equipe.

## Como se candidatar

Entre em contato com a staff da INGEN informando seu **Riot ID**, sua lane, seu elo atual e sua disponibilidade de horários.`,
  },
  {
    slug: "conheca-os-elencos",
    title: "Conheça os elencos da INGEN",
    excerpt: "Dois elencos, um só escudo. Veja quem defende as cores da INGEN em cada lane.",
    category: "elenco",
    daysAgo: 2,
    body: `A INGEN compete com dois elencos: **INGEN Black** e **INGEN Silver**.

## INGEN Black
- **JG**: Atlas
- **MID**: Clyde
- **ADC**: Coelho
- **SUP**: Czar
- **TOP**: vaga aberta

## INGEN Silver
- **TOP**: Thriller
- **JG**: Miku
- **ADC**: Hayha
- **SUP**: Bonnie
- **MID**: vaga aberta

Acompanhe o perfil de cada um na página de elenco.`,
  },
];

async function main() {
  for (const t of TEAMS) {
    await db.insert(schema.teams).values(t).onConflictDoUpdate({ target: schema.teams.slug, set: t });
  }
  const teamRows = await db.select().from(schema.teams);
  const teamId = (slug: string) => teamRows.find((t) => t.slug === slug)!.id;

  for (const p of ROSTER) {
    const values = { slug: p.slug, displayName: p.displayName, gameName: p.gameName, tagLine: p.tagLine };
    const [row] = await db
      .insert(schema.players)
      .values(values)
      .onConflictDoUpdate({ target: schema.players.slug, set: values })
      .returning();
    const existing = await db
      .select()
      .from(schema.teamMemberships)
      .where(and(eq(schema.teamMemberships.playerId, row.id), isNull(schema.teamMemberships.leftAt)));
    if (existing.length === 0) {
      await db.insert(schema.teamMemberships).values({ playerId: row.id, teamId: teamId(p.team), role: p.role });
    }
  }

  await db.delete(schema.openSlots);
  await db.insert(schema.openSlots).values(OPEN.map((o) => ({ teamId: teamId(o.team), role: o.role })));

  for (const n of NEWS) {
    const { daysAgo, ...rest } = n;
    const values = { ...rest, publishedAt: new Date(Date.now() - daysAgo * 86_400_000) };
    await db.insert(schema.news).values(values).onConflictDoNothing({ target: schema.news.slug });
  }

  console.log("Seed concluído:", ROSTER.length, "jogadores,", OPEN.length, "vagas,", NEWS.length, "notícias");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
