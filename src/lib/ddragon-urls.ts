/** URLs de assets da Riot (seguro para componentes cliente). */
export const championIcon = (version: string, id: string) =>
  `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${id}.png`;

export const championSplash = (id: string) =>
  `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${id}_0.jpg`;

export const championLoading = (id: string) =>
  `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${id}_0.jpg`;

export const profileIcon = (version: string, iconId: number) =>
  `https://ddragon.leagueoflegends.com/cdn/${version}/img/profileicon/${iconId}.png`;
