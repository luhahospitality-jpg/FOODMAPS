export type Locale = "es" | "en" | "pt";

export const locales: Locale[] = ["es", "en", "pt"];

export const localeLabel: Record<Locale, string> = {
  es: "ES",
  en: "EN",
  pt: "PT",
};

export const localeName: Record<Locale, string> = {
  es: "Español",
  en: "English",
  pt: "Português",
};

/* ---------- UI strings ---------- */

export const ui: Record<Locale, Record<string, string>> = {
  es: {
    nav_mapa: "Mapa",
    nav_marcas: "Marcas",
    nav_noticias: "Noticias",
    nav_nosotros: "Nosotros",
    ver_el_mapa: "Ver el mapa",
    abrir_menu: "Abrir menú",
    cerrar_menu: "Cerrar menú",
    abrir_idioma: "Cambiar idioma",

    hero_eyebrow: "Branded Development Associates.",
    hero_claim: "Vivir dentro de las marcas que amás.",
    hero_sub:
      "El diseño, el servicio y el estilo de vida de las grandes marcas — llevados a tu propia casa.",
    explorar_el_mapa: "Explorar el mapa",
    las_marcas: "Las marcas →",

    quees_titulo: "¿Qué es una\nBranded Residence?",
    quees_texto:
      "Una casa que lleva el nombre de una marca que amás — su diseño, su servicio, su forma de recibirte. No es solo un sello: es despertar todos los días dentro de esa experiencia.",

    categorias_titulo: "Tres formas de vivir una casa.",

    noticias_titulo: "Noticias",
    ver_todas: "Ver todas →",

    cta_final_titulo: "Descubrí cada dirección, ciudad por ciudad.",
    ir_al_mapa: "Ir al mapa",

    footer_desc:
      "Branded Development Associates. Commercial Leadership en proyectos residenciales de lujo desde 1991, con presencia en Madrid, Marbella, Buenos Aires, Punta del Este y Miami.",
    footer_explorar: "Explorar",
    footer_que_es: "Qué es una Branded",
    footer_marcas: "Marcas",
    footer_mapa: "Mapa Global",
    footer_noticias: "Noticias",
    footer_sobre: "Sobre BDA",
    footer_copyright: "BDA · Archivo documental, no comercial",

    mapa_eyebrow: "Mapa Global",
    mapa_titulo: "Cada proyecto, en su lugar.",
    todas: "Todas",
    todos_los_paises: "Todos los países",
    quitar: "quitar ×",
    nada_por_aqui: "Nada por aquí, todavía.",
    otros_proyectos_de: "Otros proyectos de",
    otros_proyectos_en: "Otros proyectos en",
    ciudad: "Ciudad",
    pais: "País",
    marca: "Marca",
    estado: "Estado",
    desarrollador: "Desarrollador",
    unidades: "Unidades",
    creditos: "Créditos",

    marcas_eyebrow: "Índice de marcas",
    marcas_titulo: "Las marcas detrás de cada estilo de vida.",

    noticias_eyebrow: "Noticias",
    noticias_titulo_full: "El mercado, país por país.",

    sobre_eyebrow: "Sobre BDA",
    sobre_titulo: "Commercial Leadership desde 1991.",
    sobre_sub:
      "Dirección comercial de branded residences y trophy assets, en Madrid, Marbella, Buenos Aires, Punta del Este y Miami.",
    sobre_trayectoria_label: "Trayectoria",
    sobre_trayectoria_titulo: "Más de tres décadas en Premium Real Estate.",
    sobre_servicios_label: "Servicios",
    sobre_servicios_titulo: "Intermediación, marketing y desarrollo de proyectos.",
    sobre_internacional_label: "Presencia internacional",
    sobre_internacional_titulo:
      "Salones inmobiliarios en Argentina, Madrid, Barcelona, Valencia, París y Dubái.",
    sobre_internacional_sub:
      "Alianza estratégica con Axis Realty Trust by Douglas Elliman, para inversiones residenciales, hoteleras y comerciales en Miami y el sur de Florida.",
    sobre_equipo_label: "Equipo",
  },
  en: {
    nav_mapa: "Map",
    nav_marcas: "Brands",
    nav_noticias: "News",
    nav_nosotros: "About",
    ver_el_mapa: "View the map",
    abrir_menu: "Open menu",
    cerrar_menu: "Close menu",
    abrir_idioma: "Change language",

    hero_eyebrow: "Branded Development Associates.",
    hero_claim: "Live inside the brands you love.",
    hero_sub:
      "The design, service and lifestyle of the world's great brands — brought into your own home.",
    explorar_el_mapa: "Explore the map",
    las_marcas: "The brands →",

    quees_titulo: "What is a\nBranded Residence?",
    quees_texto:
      "A home that carries the name of a brand you love — its design, its service, its way of welcoming you. It's not just a seal: it's waking up every day inside that experience.",

    categorias_titulo: "Three ways to live in a home.",

    noticias_titulo: "News",
    ver_todas: "See all →",

    cta_final_titulo: "Discover every address, city by city.",
    ir_al_mapa: "Go to the map",

    footer_desc:
      "Branded Development Associates. Commercial Leadership in luxury residential projects since 1991, with presence in Madrid, Marbella, Buenos Aires, Punta del Este and Miami.",
    footer_explorar: "Explore",
    footer_que_es: "What is a Branded",
    footer_marcas: "Brands",
    footer_mapa: "Global Map",
    footer_noticias: "News",
    footer_sobre: "About BDA",
    footer_copyright: "BDA · Documentary archive, non-commercial",

    mapa_eyebrow: "Global Map",
    mapa_titulo: "Every project, in its place.",
    todas: "All",
    todos_los_paises: "All countries",
    quitar: "clear ×",
    nada_por_aqui: "Nothing here yet.",
    otros_proyectos_de: "Other projects by",
    otros_proyectos_en: "Other projects in",
    ciudad: "City",
    pais: "Country",
    marca: "Brand",
    estado: "Status",
    desarrollador: "Developer",
    unidades: "Units",
    creditos: "Credits",

    marcas_eyebrow: "Brand index",
    marcas_titulo: "The brands behind every lifestyle.",

    noticias_eyebrow: "News",
    noticias_titulo_full: "The market, country by country.",

    sobre_eyebrow: "About BDA",
    sobre_titulo: "Commercial Leadership since 1991.",
    sobre_sub:
      "Commercial direction for branded residences and trophy assets, in Madrid, Marbella, Buenos Aires, Punta del Este and Miami.",
    sobre_trayectoria_label: "Track record",
    sobre_trayectoria_titulo: "Three decades in Premium Real Estate.",
    sobre_servicios_label: "Services",
    sobre_servicios_titulo: "Intermediation, marketing and project development.",
    sobre_internacional_label: "International presence",
    sobre_internacional_titulo:
      "Real estate fairs in Argentina, Madrid, Barcelona, Valencia, Paris and Dubai.",
    sobre_internacional_sub:
      "Strategic alliance with Axis Realty Trust by Douglas Elliman, for residential, hotel and commercial investments in Miami and South Florida.",
    sobre_equipo_label: "Team",
  },
  pt: {
    nav_mapa: "Mapa",
    nav_marcas: "Marcas",
    nav_noticias: "Notícias",
    nav_nosotros: "Sobre",
    ver_el_mapa: "Ver o mapa",
    abrir_menu: "Abrir menu",
    cerrar_menu: "Fechar menu",
    abrir_idioma: "Mudar idioma",

    hero_eyebrow: "Branded Development Associates.",
    hero_claim: "Viver dentro das marcas que você ama.",
    hero_sub:
      "O design, o serviço e o estilo de vida das grandes marcas — trazidos para a sua própria casa.",
    explorar_el_mapa: "Explorar o mapa",
    las_marcas: "As marcas →",

    quees_titulo: "O que é uma\nBranded Residence?",
    quees_texto:
      "Uma casa que leva o nome de uma marca que você ama — seu design, seu serviço, sua forma de te receber. Não é só um selo: é acordar todos os dias dentro dessa experiência.",

    categorias_titulo: "Três formas de viver uma casa.",

    noticias_titulo: "Notícias",
    ver_todas: "Ver todas →",

    cta_final_titulo: "Descubra cada endereço, cidade por cidade.",
    ir_al_mapa: "Ir para o mapa",

    footer_desc:
      "Branded Development Associates. Commercial Leadership em projetos residenciais de luxo desde 1991, com presença em Madrid, Marbella, Buenos Aires, Punta del Este e Miami.",
    footer_explorar: "Explorar",
    footer_que_es: "O que é uma Branded",
    footer_marcas: "Marcas",
    footer_mapa: "Mapa Global",
    footer_noticias: "Notícias",
    footer_sobre: "Sobre a BDA",
    footer_copyright: "BDA · Arquivo documental, não comercial",

    mapa_eyebrow: "Mapa Global",
    mapa_titulo: "Cada projeto, em seu lugar.",
    todas: "Todas",
    todos_los_paises: "Todos os países",
    quitar: "remover ×",
    nada_por_aqui: "Nada por aqui, ainda.",
    otros_proyectos_de: "Outros projetos de",
    otros_proyectos_en: "Outros projetos em",
    ciudad: "Cidade",
    pais: "País",
    marca: "Marca",
    estado: "Status",
    desarrollador: "Incorporadora",
    unidades: "Unidades",
    creditos: "Créditos",

    marcas_eyebrow: "Índice de marcas",
    marcas_titulo: "As marcas por trás de cada estilo de vida.",

    noticias_eyebrow: "Notícias",
    noticias_titulo_full: "O mercado, país por país.",

    sobre_eyebrow: "Sobre a BDA",
    sobre_titulo: "Commercial Leadership desde 1991.",
    sobre_sub:
      "Direção comercial de branded residences e trophy assets, em Madrid, Marbella, Buenos Aires, Punta del Este e Miami.",
    sobre_trayectoria_label: "Trajetória",
    sobre_trayectoria_titulo: "Mais de três décadas em Premium Real Estate.",
    sobre_servicios_label: "Serviços",
    sobre_servicios_titulo: "Intermediação, marketing e desenvolvimento de projetos.",
    sobre_internacional_label: "Presença internacional",
    sobre_internacional_titulo:
      "Feiras imobiliárias na Argentina, Madrid, Barcelona, Valência, Paris e Dubai.",
    sobre_internacional_sub:
      "Aliança estratégica com a Axis Realty Trust by Douglas Elliman, para investimentos residenciais, hoteleiros e comerciais em Miami e no sul da Flórida.",
    sobre_equipo_label: "Equipe",
  },
};

/* ---------- Sobre: trayectoria + servicios (translated content) ---------- */

export const milestonesI18n: Record<
  Locale,
  { year: string; title: string; description: string }[]
> = {
  es: [
    { year: "1991", title: "El origen", description: "Fundación de Palermo Chico Real Estate, especializada en la comercialización y el asesoramiento integral de residencias premium." },
    { year: "2000", title: "La innovación", description: "Creación de Inmobisite, una de las primeras plataformas inmobiliarias digitales de Argentina, con alianza tecnológica con Dypsa y Atrea BBVA Europa." },
    { year: "2006", title: "Nace BDA Realty", description: "Fundación de BDA Realty y creación del modelo Master Broker & Commercial Leadership. Alianza con Dypsa para liderar la comercialización de Renoir Torre I y II, Torre Mayor y Young's Stone." },
    { year: "2016", title: "Validación del modelo", description: "BDA lidera la comercialización del desembarco de Related Group en Argentina, con SLS Lux Puerto Madero y SLS Lux Hotel Designer Suites." },
    { year: "2024", title: "BDA International", description: "Apertura de operaciones en España, con la incorporación de Rafael Fernández Sande y Emiliano Solar Arias como socios. Madrid se consolida como mercado clave." },
    { year: "2025", title: "Implantación del modelo en Europa", description: "Dirección comercial de SLS Infantas Madrid Residences, Banyan Tree Padilla Residences y Palacio Torre Almiranta." },
    { year: "2026", title: "El próximo capítulo", description: "Seguimos expandiendo nuestra plataforma internacional junto a desarrolladores, operadores, marcas e inversores, impulsando la próxima generación de branded residences." },
  ],
  en: [
    { year: "1991", title: "The origin", description: "Founding of Palermo Chico Real Estate, specialized in the sale and full advisory of premium residences." },
    { year: "2000", title: "The innovation", description: "Creation of Inmobisite, one of Argentina's first digital real estate platforms, in technology alliance with Dypsa and Atrea BBVA Europe." },
    { year: "2006", title: "BDA Realty is born", description: "Founding of BDA Realty and creation of the Master Broker & Commercial Leadership model. Alliance with Dypsa to lead the sale of Renoir Torre I and II, Torre Mayor and Young's Stone." },
    { year: "2016", title: "Model validation", description: "BDA leads the sales for Related Group's arrival in Argentina, with SLS Lux Puerto Madero and SLS Lux Hotel Designer Suites." },
    { year: "2024", title: "BDA International", description: "Opening of operations in Spain, with Rafael Fernández Sande and Emiliano Solar Arias joining as partners. Madrid becomes a key market." },
    { year: "2025", title: "Rollout of the model in Europe", description: "Commercial direction of SLS Infantas Madrid Residences, Banyan Tree Padilla Residences and Palacio Torre Almiranta." },
    { year: "2026", title: "The next chapter", description: "We keep expanding our international platform alongside developers, operators, brands and investors, driving the next generation of branded residences." },
  ],
  pt: [
    { year: "1991", title: "A origem", description: "Fundação da Palermo Chico Real Estate, especializada na comercialização e assessoria integral de residências premium." },
    { year: "2000", title: "A inovação", description: "Criação da Inmobisite, uma das primeiras plataformas imobiliárias digitais da Argentina, com aliança tecnológica com a Dypsa e a Atrea BBVA Europa." },
    { year: "2006", title: "Nasce a BDA Realty", description: "Fundação da BDA Realty e criação do modelo Master Broker & Commercial Leadership. Aliança com a Dypsa para liderar a comercialização de Renoir Torre I e II, Torre Mayor e Young's Stone." },
    { year: "2016", title: "Validação do modelo", description: "A BDA lidera a comercialização do desembarque da Related Group na Argentina, com SLS Lux Puerto Madero e SLS Lux Hotel Designer Suites." },
    { year: "2024", title: "BDA International", description: "Abertura de operações na Espanha, com a incorporação de Rafael Fernández Sande e Emiliano Solar Arias como sócios. Madrid se consolida como mercado-chave." },
    { year: "2025", title: "Implantação do modelo na Europa", description: "Direção comercial de SLS Infantas Madrid Residences, Banyan Tree Padilla Residences e Palacio Torre Almiranta." },
    { year: "2026", title: "O próximo capítulo", description: "Seguimos expandindo nossa plataforma internacional junto a incorporadoras, operadores, marcas e investidores, impulsionando a próxima geração de branded residences." },
  ],
};

export const serviceGroupsI18n: Record<
  Locale,
  { title: string; items: string[] }[]
> = {
  es: [
    { title: "Desarrollo de negocio", items: ["Análisis y factibilidad de nuevos proyectos", "Búsqueda de tierra para desarrollos", "Diseño de precios y formas de pago"] },
    { title: "Marketing y marca", items: ["Marketing integral", "Diseño y posicionamiento de marca", "Webs, brochures y comunicación"] },
    { title: "Comercialización", items: ["Armado de equipos comerciales", "Generación de bases de datos", "Red de brokers e inmobiliarias asociadas"] },
    { title: "Asesoramiento", items: ["Notarial, fiscal y contable"] },
  ],
  en: [
    { title: "Business development", items: ["Analysis and feasibility of new projects", "Land sourcing for developments", "Pricing and payment plan design"] },
    { title: "Marketing and brand", items: ["Full-scope marketing", "Brand design and positioning", "Websites, brochures and communications"] },
    { title: "Sales", items: ["Building sales teams", "Database generation", "Network of associated brokers and agencies"] },
    { title: "Advisory", items: ["Notarial, tax and accounting"] },
  ],
  pt: [
    { title: "Desenvolvimento de negócio", items: ["Análise e viabilidade de novos projetos", "Busca de terrenos para empreendimentos", "Design de preços e formas de pagamento"] },
    { title: "Marketing e marca", items: ["Marketing integral", "Design e posicionamento de marca", "Sites, brochures e comunicação"] },
    { title: "Comercialização", items: ["Formação de equipes comerciais", "Geração de bases de dados", "Rede de brokers e imobiliárias parceiras"] },
    { title: "Assessoria", items: ["Notarial, fiscal e contábil"] },
  ],
};

/* ---------- Region + category labels ---------- */

export const regionLabelI18n: Record<Locale, Record<string, string>> = {
  es: {
    "España": "España", "Portugal": "Portugal", "Reino Unido": "Reino Unido", "Francia": "Francia",
    "Italia": "Italia", "Grecia": "Grecia", "Emiratos Árabes Unidos": "Emiratos Árabes Unidos",
    "Catar": "Catar", "Arabia Saudita": "Arabia Saudita", "Turcas y Caicos": "Turcas y Caicos",
    "Japón": "Japón", "Tailandia": "Tailandia", "Singapur": "Singapur", "Estados Unidos": "Estados Unidos",
    "México": "México", "Argentina": "Argentina", "Uruguay": "Uruguay", "Brasil": "Brasil",
    "Colombia": "Colombia", "Sudamérica": "Sudamérica", "Global": "Global",
  },
  en: {
    "España": "Spain", "Portugal": "Portugal", "Reino Unido": "United Kingdom", "Francia": "France",
    "Italia": "Italy", "Grecia": "Greece", "Emiratos Árabes Unidos": "United Arab Emirates",
    "Catar": "Qatar", "Arabia Saudita": "Saudi Arabia", "Turcas y Caicos": "Turks and Caicos",
    "Japón": "Japan", "Tailandia": "Thailand", "Singapur": "Singapore", "Estados Unidos": "United States",
    "México": "Mexico", "Argentina": "Argentina", "Uruguay": "Uruguay", "Brasil": "Brazil",
    "Colombia": "Colombia", "Sudamérica": "South America", "Global": "Global",
  },
  pt: {
    "España": "Espanha", "Portugal": "Portugal", "Reino Unido": "Reino Unido", "Francia": "França",
    "Italia": "Itália", "Grecia": "Grécia", "Emiratos Árabes Unidos": "Emirados Árabes Unidos",
    "Catar": "Catar", "Arabia Saudita": "Arábia Saudita", "Turcas y Caicos": "Turcas e Caicos",
    "Japón": "Japão", "Tailandia": "Tailândia", "Singapur": "Singapura", "Estados Unidos": "Estados Unidos",
    "México": "México", "Argentina": "Argentina", "Uruguay": "Uruguai", "Brasil": "Brasil",
    "Colombia": "Colômbia", "Sudamérica": "América do Sul", "Global": "Global",
  },
};

export const categoryLabelI18n: Record<Locale, Record<string, string>> = {
  es: { moda: "Moda", servicios: "Servicios", lifestyle: "Lifestyle" },
  en: { moda: "Fashion", servicios: "Hospitality", lifestyle: "Lifestyle" },
  pt: { moda: "Moda", servicios: "Serviços", lifestyle: "Lifestyle" },
};

export const categoryDescriptionI18n: Record<Locale, Record<string, string>> = {
  es: {
    moda: "Maisons que visten cada rincón de tu casa.",
    servicios: "La hospitalidad de los grandes hoteles, sin salir de casa.",
    lifestyle: "Diseño y potencia, convertidos en hogar.",
  },
  en: {
    moda: "Maisons that dress every corner of your home.",
    servicios: "The hospitality of great hotels, without leaving home.",
    lifestyle: "Design and performance, turned into home.",
  },
  pt: {
    moda: "Maisons que vestem cada canto da sua casa.",
    servicios: "A hospitalidade dos grandes hotéis, sem sair de casa.",
    lifestyle: "Design e potência, transformados em lar.",
  },
};

/* ---------- Brand descriptions ---------- */

export const brandDescI18n: Record<string, { en: string; pt: string }> = {
  "armani": { en: "Armani's minimalism, applied to the home.", pt: "O minimalismo Armani, aplicado à moradia." },
  "jacob-co": { en: "Fine watchmaking, in its first own beach club.", pt: "Alta relojoaria, em seu primeiro beach club próprio." },
  "elie-saab": { en: "Lebanese haute couture, facing Hyde Park.", pt: "Alta costura libanesa, em frente ao Hyde Park." },
  "dolce-gabbana": { en: "Mediterranean baroque, made residence.", pt: "Barroco mediterrâneo, transformado em residência." },
  "karl-lagerfeld": { en: "Villas signed in black and white.", pt: "Villas assinadas em preto e branco." },
  "fendi": { en: "Fendi Casa's Roman craftsmanship, in every interior.", pt: "O artesanato romano da Fendi Casa, nos interiores." },
  "versace": { en: "Gilded, sculptural, unmistakable.", pt: "Dourado, escultural, inconfundível." },
  "bulgari": { en: "Roman jewelry, turned into an address.", pt: "Joalheria romana transformada em endereço." },
  "missoni": { en: "The multicolor knit, in architecture.", pt: "O ponto multicolor, em arquitetura." },
  "baccarat": { en: "French crystal since 1764.", pt: "Cristal francês desde 1764." },
  "aman": { en: "Discretion and remote settings.", pt: "Discrição e locais remotos." },
  "four-seasons": { en: "The standard for global hotel service.", pt: "O padrão do serviço hoteleiro global." },
  "ritz-carlton": { en: "Ladies and gentlemen, since 1983.", pt: "Ladies and gentlemen, desde 1983." },
  "st-regis": { en: "Butler service as a brand signature.", pt: "Serviço de mordomo como assinatura de marca." },
  "waldorf-astoria": { en: "Hilton's classic hotel luxury.", pt: "O luxo hoteleiro clássico da Hilton." },
  "mandarin-oriental": { en: "Asian service in global capitals.", pt: "Serviço asiático em capitais globais." },
  "raffles": { en: "Colonial hospitality, reinvented.", pt: "Hospitalidade colonial reinventada." },
  "conrad": { en: "Hilton's boutique side.", pt: "O lado boutique da Hilton." },
  "jk-place": { en: "Boutique hospitality, Italian style.", pt: "Hospitalidade boutique, à italiana." },
  "fasano": { en: "Brazil's benchmark hospitality.", pt: "A hospitalidade brasileira de referência." },
  "faena": { en: "Art and spectacle, as a form of hospitality.", pt: "Arte e espetáculo, como forma de hospitalidade." },
  "hilton": { en: "The hotel chain that gives the group its name.", pt: "A rede hoteleira que dá nome ao grupo." },
  "edition": { en: "Marriott, in independent boutique form.", pt: "Marriott, em chave boutique e independente." },
  "cheval-blanc": { en: "LVMH's hotel maison.", pt: "A maison hoteleira da LVMH." },
  "peninsula": { en: "Asian hospitality since 1928.", pt: "Hospitalidade asiática desde 1928." },
  "melia": { en: "The Spanish group's most exclusive line.", pt: "A linha mais exclusiva do grupo espanhol." },
  "fairmont": { en: "Accor's grand historic hotels.", pt: "Grandes hotéis históricos, da Accor." },
  "dorchester-collection": { en: "The group behind Park Lane's own Dorchester.", pt: "O grupo por trás do próprio Dorchester de Park Lane." },
  "maybourne": { en: "Claridge's, The Connaught and The Berkeley, under one group.", pt: "Claridge's, The Connaught e The Berkeley, sob um mesmo grupo." },
  "kempinski": { en: "Europe's oldest luxury hotel chain.", pt: "A mais antiga rede de hotéis de luxo da Europa." },
  "cheval-collection": { en: "Ultra-luxury serviced apartments, from London.", pt: "Apartamentos de serviço de ultra luxo, desde Londres." },
  "rosewood": { en: "'A Sense of Place,' in every city.", pt: "'A Sense of Place', em cada cidade." },
  "banyan-tree": { en: "Wellness and spa, of Asian origin.", pt: "Bem-estar e spa, de origem asiática." },
  "six-senses": { en: "Sustainability as the standard of luxury.", pt: "Sustentabilidade como padrão de luxo." },
  "sls": { en: "Urban lifestyle, born in Los Angeles.", pt: "Lifestyle urbano nascido em Los Angeles." },
  "w-hotels": { en: "Bold design, urban energy.", pt: "Design ousado, energia urbana." },
  "sofitel": { en: "French savoir-faire, from Accor.", pt: "Savoir-faire francês, da Accor." },
  "hyatt": { en: "Park Hyatt and Hyatt Regency, in residential form.", pt: "Park Hyatt e Hyatt Regency, no residencial." },
  "marriott": { en: "The world's largest hotel group.", pt: "O maior grupo hoteleiro do mundo." },
  "cipriani": { en: "Hospitality of Venetian origin.", pt: "Hospitalidade de origem veneziana." },
  "nobu": { en: "From restaurant to boutique hotel.", pt: "Do restaurante ao hotel boutique." },
  "alvear": { en: "Buenos Aires ultra-luxury, for a century.", pt: "Ultra luxo portenho há um século." },
  "bentley": { en: "Its first residential building, in Miami.", pt: "Seu primeiro edifício residencial, em Miami." },
  "aston-martin": { en: "Aerodynamic design, vertical.", pt: "Design aerodinâmico, vertical." },
  "lamborghini": { en: "Performance, translated into villas.", pt: "Performance traduzida em villas." },
  "porsche-design": { en: "German precision, in tower form.", pt: "Precisão alemã, em torre." },
  "bugatti": { en: "Sky mansions with a car elevator.", pt: "Sky mansions com elevador para o carro." },
  "mercedes-benz": { en: "An entire district under the star.", pt: "Um distrito inteiro sob a estrela." },
  "tonino-lamborghini": { en: "The other branch of the Lamborghini family.", pt: "O outro ramo da família Lamborghini." },
  "pagani": { en: "Handcrafted hypercars, in residential form.", pt: "Hypercars artesanais, em formato residencial." },
  "yoo": { en: "Philippe Starck's interiors, at scale.", pt: "O design de interiores de Philippe Starck, em série." },
  "siro": { en: "Kerzner International, focused on performance and wellness.", pt: "Kerzner International, com foco em performance e bem-estar." },
};

/* ---------- Project descriptions ---------- */

export const projectDescI18n: Record<string, { en: string; pt: string }> = {
  "design-hills-dolce-gabbana": { en: "Spain's first D&G residential project.", pt: "O primeiro residencial D&G da Espanha." },
  "karl-lagerfeld-villas": { en: "Five villas, one aesthetic.", pt: "Cinco villas, uma só estética." },
  "epic-marbella-fendi-casa": { en: "The pioneer of Fendi's European wave.", pt: "Pioneiro da onda Fendi na Europa." },
  "tierra-viva-lamborghini": { en: "Lamborghini lines, over the hills.", pt: "Linhas da Lamborghini, sobre as colinas." },
  "four-seasons-marbella-rio-real": { en: "€700M next to Río Real golf course.", pt: "700M€ ao lado do golfe de Río Real." },
  "st-regis-casares": { en: "St. Regis butler service, beside the golf course.", pt: "Mordomia St. Regis, ao lado do golfe." },
  "w-marbella": { en: "W lifestyle, on Marbella's east coast.", pt: "Lifestyle W, na costa leste de Marbella." },
  "ocho-de-oro-versace": { en: "Versace's baroque, on the Golden Mile.", pt: "O barroco Versace, na Milha de Ouro." },
  "sierra-blanca-by-the-sea": { en: "Armani, developed by Nadal and Matutes, in Estepona.", pt: "Armani, com Nadal e Matutes como incorporadores, em Estepona." },
  "armani-residences-marbella": { en: "Armani's first residential project in Spain.", pt: "O primeiro projeto residencial da Armani na Espanha." },
  "marea-missoni": { en: "The Missoni knit, next to Finca Cortesín.", pt: "O ponto Missoni, ao lado de Finca Cortesín." },
  "fairmont-la-hacienda-sotogrande": { en: "Fairmont, over La Hacienda golf course.", pt: "Fairmont, sobre o golfe de La Hacienda." },
  "six-senses-ibiza": { en: "Six Senses, over a cove in northern Ibiza.", pt: "Six Senses, sobre uma enseada ao norte de Ibiza." },
  "palacio-pakea-marriott-san-sebastian": { en: "Marriott arrives in San Sebastián for the first time.", pt: "A Marriott chega pela primeira vez a San Sebastián." },
  "four-seasons-formentor-mallorca": { en: "Villas beside the historic Hotel Formentor.", pt: "Villas ao lado do histórico Hotel Formentor." },
  "sls-madrid-infantas": { en: "Europe's first SLS branded residences.", pt: "As primeiras branded SLS da Europa." },
  "banyan-tree-madrid": { en: "Banyan Tree arrives in Europe, in Salamanca.", pt: "A Banyan Tree chega à Europa, em Salamanca." },
  "mandarin-oriental-barcelona": { en: "Asian service, beside Passeig de Gràcia.", pt: "Serviço asiático, ao lado do Passeig de Gràcia." },
  "marriott-algarve-salgados": { en: "Marriott, on the Salgados coastline.", pt: "Marriott sobre o litoral de Salgados." },
  "westin-salgados": { en: "Westin, golf and rest in the Algarve.", pt: "Westin, golfe e descanso no Algarve." },
  "four-seasons-comporta": { en: "Low density, among dunes and pine forests.", pt: "Baixa densidade, entre dunas e pinhais." },
  "aman-costa-vicentina": { en: "Aman, on the protected coastline.", pt: "Aman, no litoral protegido." },
  "six-senses-comporta": { en: "Six Senses adds a second enclave on the Costa Azul.", pt: "A Six Senses soma um segundo enclave na Costa Azul." },
  "six-senses-douro": { en: "Terraced vineyards, over the Douro.", pt: "Vinhedos em terraço, sobre o Douro." },
  "hyatt-regency-lisboa": { en: "Hyatt, in urban Lisbon style.", pt: "Hyatt, em chave urbana lisboeta." },
  "aroeira-missoni": { en: "The Missoni knit, beside the pine forest.", pt: "O ponto Missoni, ao lado do pinhal." },
  "bvlgari-lisboa": { en: "Bulgari, in historic Chiado.", pt: "Bulgari, no histórico Chiado." },
  "hilton-cascais-residences": { en: "Hilton, facing the Atlantic, in Cascais.", pt: "Hilton, em frente ao Atlântico, em Cascais." },
  "edition-cascais": { en: "EDITION, Marriott's boutique face.", pt: "EDITION, o lado boutique da Marriott." },
  "mandarin-oriental-madrid": { en: "Mandarin Oriental, in the Salamanca district.", pt: "Mandarin Oriental, no bairro de Salamanca." },
  "four-seasons-madrid": { en: "Four Seasons, in the heart of Canalejas.", pt: "Four Seasons, no coração de Canalejas." },
  "waldorf-astoria-marbella": { en: "Spain's first Waldorf Astoria, on the former Marbella Golf & Country Club.", pt: "O primeiro Waldorf Astoria da Espanha, sobre o antigo Marbella Golf & Country Club." },
  "six-senses-courchevel": { en: "Six Senses, over the snow of Courchevel.", pt: "Six Senses, sobre a neve de Courchevel." },
  "cheval-blanc-val-thorens": { en: "Cheval Blanc, among fir trees and snow.", pt: "Cheval Blanc, entre pinheiros e neve." },
  "maybourne-saint-germain": { en: "Paris's first branded residences, in the historic Îlot Saint-Germain.", pt: "As primeiras branded residences de Paris, no histórico Îlot Saint-Germain." },
  "jk-place-rome": { en: "JK Place, beside the Pantheon.", pt: "JK Place, ao lado do Panteão." },
  "six-senses-antognolla": { en: "A 12th-century castle and 79 residences in Umbria.", pt: "Um castelo do século XII e 79 residências na Úmbria." },
  "conrad-athens-ilisian": { en: "Conrad, in the historic Ilisian building.", pt: "Conrad, no edifício histórico do Ilisian." },
  "waldorf-astoria-athens-ilisian": { en: "Waldorf Astoria, crowning the same building.", pt: "Waldorf Astoria, coroando o mesmo edifício." },
  "six-senses-porto-heli": { en: "Twelve villas, on the Peloponnese coast.", pt: "Doze villas, na costa do Peloponeso." },
  "owo-raffles-london": { en: "The historic War Office, reconverted by Raffles.", pt: "O histórico War Office, reconvertido pela Raffles." },
  "mandarin-oriental-mayfair": { en: "Mandarin Oriental, in the heart of Mayfair.", pt: "Mandarin Oriental, no coração de Mayfair." },
  "six-senses-whiteley": { en: "Six Senses, in the former 1911 department store.", pt: "Six Senses, na antiga loja de departamentos de 1911." },
  "one-hyde-park": { en: "London's pioneer of branded residences.", pt: "O pioneiro das branded residences em Londres." },
  "peninsula-london": { en: "The Peninsula, facing Buckingham Palace.", pt: "The Peninsula, em frente ao Palácio de Buckingham." },
  "four-seasons-ten-trinity-square": { en: "Four Seasons, beside the Tower of London.", pt: "Four Seasons, ao lado da Torre de Londres." },
  "elie-saab-residences-london": { en: "Lebanese haute couture, facing Hyde Park.", pt: "Alta costura libanesa, em frente ao Hyde Park." },
  "twenty-grosvenor-square": { en: "The world's first standalone Four Seasons Private Residence.", pt: "O primeiro Four Seasons residencial independente do mundo." },
  "mayfair-park-residences": { en: "Dorchester Collection, next to 45 Park Lane.", pt: "Dorchester Collection, ao lado do 45 Park Lane." },
  "cheval-knightsbridge-gate": { en: "Cheval Collection, by Hyde Park, one to six bedrooms.", pt: "Cheval Collection, ao lado do Hyde Park, de um a seis quartos." },
  "aman-tokyo": { en: "Japan's highest residences.", pt: "As residências mais altas do Japão." },
  "waldorf-astoria-tokyo": { en: "Asia-Pacific's first Waldorf Astoria.", pt: "O primeiro Waldorf Astoria da Ásia-Pacífico." },
  "armani-beach-residences": { en: "Armani minimalism, facing the sea.", pt: "Minimalismo Armani, em frente ao mar." },
  "bugatti-residences-dubai": { en: "Sky mansions with a private car elevator.", pt: "Sky mansions com elevador privado para o carro." },
  "porsche-design-tower-dubai": { en: "Porsche precision, over the creek.", pt: "Precisão Porsche, sobre o creek." },
  "bvlgari-residences-dubai": { en: "Bulgari, on a private island.", pt: "Bulgari, em uma ilha privada." },
  "mercedes-benz-places": { en: "An entire district under the star.", pt: "Um distrito inteiro sob a estrela." },
  "st-regis-saadiyat-abu-dhabi": { en: "St. Regis, facing Saadiyat beach.", pt: "St. Regis, em frente à praia de Saadiyat." },
  "jacob-co-al-jurf": { en: "Swiss fine watchmaking, its first own beach club.", pt: "Alta relojoaria suíça, primeiro beach club próprio." },
  "st-regis-marsa-arabia": { en: "St. Regis, on a private island of The Pearl.", pt: "St. Regis, em uma ilha privada de The Pearl." },
  "aman-amansamar": { en: "Aman villas beside an 80-key hotel.", pt: "Villas Aman ao lado de um hotel de 80 quartos." },
  "ritz-carlton-mahanakhon": { en: "314 meters above Bangkok.", pt: "314 metros acima de Bangkok." },
  "rosewood-na-vara": { en: "'A Sense of Place,' Thai-style.", pt: "'A Sense of Place', em chave tailandesa." },
  "ritz-carlton-cairnhill": { en: "Ritz-Carlton, in the Cairnhill enclave.", pt: "Ritz-Carlton, no enclave de Cairnhill." },
  "mercedes-benz-places-miami": { en: "The star, in Brickell too.", pt: "A estrela, também em Brickell." },
  "cipriani-residences-miami": { en: "Venice, now in Brickell.", pt: "Veneza, agora em Brickell." },
  "aman-miami-beach": { en: "Aman arrives in Miami Beach.", pt: "A Aman chega a Miami Beach." },
  "st-regis-brickell": { en: "St. Regis butler service, in Brickell.", pt: "Mordomia St. Regis, em Brickell." },
  "st-regis-sunny-isles": { en: "St. Regis, alongside Bentley and Bugatti.", pt: "St. Regis, ao lado de Bentley e Bugatti." },
  "ritz-carlton-north-bay-village": { en: "Two Ritz-Carlton towers, between bays.", pt: "Duas torres Ritz-Carlton, entre baías." },
  "dolce-gabbana-888-brickell": { en: "D&G's baroque, vertical, in Brickell.", pt: "O barroco D&G, vertical, em Brickell." },
  "missoni-baia": { en: "The Missoni knit, facing the bay.", pt: "O ponto Missoni, em frente à baía." },
  "four-seasons-surf-club": { en: "Four Seasons, in the historic Surf Club.", pt: "Four Seasons, no histórico Surf Club." },
  "fendi-chateau-residences": { en: "Fendi Casa, facing the sea in Surfside.", pt: "Fendi Casa, em frente ao mar em Surfside." },
  "armani-casa-pompano": { en: "Armani/Casa, north of Miami.", pt: "Armani/Casa, ao norte de Miami." },
  "pagani-residences": { en: "Handcrafted hypercars, in tower form.", pt: "Hypercars artesanais, em formato de torre." },
  "giorgio-armani-residences-nyc": { en: "Armani, on the Upper East Side.", pt: "Armani, no Upper East Side." },
  "baccarat-residences-ny": { en: "French crystal, facing MoMA.", pt: "Cristal francês, em frente ao MoMA." },
  "waldorf-astoria-ny": { en: "The building that gave the brand its name.", pt: "O edifício que deu nome à marca." },
  "mandarin-oriental-ny": { en: "Mandarin Oriental, over Columbus Circle.", pt: "Mandarin Oriental, sobre a Columbus Circle." },
  "waldorf-astoria-miami": { en: "The tallest residential tower in the Western Hemisphere.", pt: "A torre residencial mais alta do Ocidente." },
  "bentley-residences-miami": { en: "A private car elevator, to every unit.", pt: "Elevador privado para o carro, até cada unidade." },
  "baccarat-residences-miami": { en: "French crystal, a tower in Brickell.", pt: "Cristal francês, torre em Brickell." },
  "mandarin-oriental-miami": { en: "Mandarin Oriental rebuilds its flagship property.", pt: "A Mandarin Oriental reconstrói sua propriedade emblemática." },
  "aston-martin-residences": { en: "Aston Martin's first residential project.", pt: "O primeiro projeto residencial da Aston Martin." },
  "aman-new-york": { en: "Aman, over Fifth Avenue.", pt: "Aman, sobre a Quinta Avenida." },
  "four-seasons-30-park-place": { en: "Four Seasons, over Downtown Manhattan.", pt: "Four Seasons, sobre o Downtown de Manhattan." },
  "ritz-carlton-nomad": { en: "Ritz-Carlton, in the NoMad corridor.", pt: "Ritz-Carlton, no corredor do NoMad." },
  "aman-beverly-hills": { en: "Aman, over ten acres of gardens.", pt: "Aman, sobre dez acres de jardins." },
  "four-seasons-los-angeles": { en: "No hotel, no guests: residences only.", pt: "Sem hotel, sem hóspedes: só residências." },
  "mandarin-oriental-beverly-hills": { en: "Asian service, on Wilshire Boulevard.", pt: "Serviço asiático, na Wilshire Boulevard." },
  "rosewood-beverly-hills": { en: "Seventeen estates, one zip code.", pt: "Dezessete estates, um único código postal." },
  "st-regis-chicago": { en: "St. Regis, in Jeanne Gang's tower.", pt: "St. Regis, na torre de Jeanne Gang." },
  "w-aspen": { en: "W, ski-in ski-out in Aspen.", pt: "W, aos pés da pista em Aspen." },
  "619-brickell-nobu": { en: "A 75-story tower over Biscayne Bay, with Miami's second Nobu.", pt: "Torre de 75 andares sobre a Biscayne Bay, com o segundo Nobu de Miami." },
  "kempinski-miami-design-district": { en: "Kempinski's U.S. debut, in twin towers.", pt: "A estreia da Kempinski nos Estados Unidos, em duas torres gêmeas." },
  "siro-brickell": { en: "Kerzner's wellness concept, between the Miami River and Brickell City Centre.", pt: "O conceito wellness da Kerzner, entre o rio Miami e o Brickell City Centre." },
  "st-regis-turks-caicos": { en: "St. Regis, over Grace Bay Beach.", pt: "St. Regis, sobre a Grace Bay Beach." },
  "amanvari": { en: "Mexico's first Aman, on a remote stretch of coast.", pt: "O primeiro Aman do México, em um trecho remoto." },
  "st-regis-los-cabos": { en: "St. Regis, within the Quivira masterplan.", pt: "St. Regis, dentro do masterplan de Quivira." },
  "ritz-carlton-reserve-zadun": { en: "Ritz-Carlton's most exclusive collection.", pt: "A coleção mais exclusiva da Ritz-Carlton." },
  "park-hyatt-mexico-city": { en: "Park Hyatt, in the neighborhood with the highest density of luxury.", pt: "Park Hyatt, no bairro de maior densidade de luxo." },
  "nobu-los-cabos": { en: "Nobu, facing the Pacific.", pt: "Nobu, em frente ao Pacífico." },
  "yoo-nordelta": { en: "Philippe Starck, in the country's largest gated community.", pt: "Philippe Starck, no maior condomínio fechado do país." },
  "alvear-tower": { en: "Argentina's tallest residential tower.", pt: "A torre residencial mais alta da Argentina." },
  "alvear-icon-hotel-residences": { en: "Mixed use, facing the Río de la Plata.", pt: "Uso misto, em frente ao Río de la Plata." },
  "sls-lux-puerto-madero": { en: "SLS Miami style, in Puerto Madero.", pt: "O estilo SLS Miami, em Puerto Madero." },
  "sofitel-buenos-aires-madero": { en: "French savoir-faire, in Puerto Madero.", pt: "Savoir-faire francês, em Puerto Madero." },
  "plaza-hotel-residences": { en: "The iconic Plaza, reconverted.", pt: "O icônico Plaza, reconvertido." },
  "sls-pilar": { en: "SLS, in suburban form.", pt: "SLS, em formato suburbano." },
  "reserva-alto-agrelo": { en: "Vineyards, mountains, and a future Casa Duhau by Hyatt.", pt: "Vinhedos, montanha e um futuro Casa Duhau by Hyatt." },
  "melia-valle-de-uco": { en: "Meliá, among the vineyards of Valle de Uco.", pt: "Meliá, entre os vinhedos do Valle de Uco." },
  "sls-punta-del-este": { en: "SLS, over Playa Brava.", pt: "SLS, sobre a Playa Brava." },
  "cipriani-punta-del-este": { en: "Venice, on the Uruguayan coast.", pt: "Veneza, na costa uruguaia." },
  "fasano-itaim": { en: "Fasano's DNA, in residential form.", pt: "O DNA Fasano, em formato residencial." },
  "fasano-rio": { en: "Fasano, facing Rio's Atlantic coast.", pt: "Fasano, em frente ao Atlântico carioca." },
  "faena-sao-paulo": { en: "The Faena spectacle, in Faria Lima.", pt: "O espetáculo Faena, na Faria Lima." },
  "villa-versace-moema": { en: "Versace Home, in Moema.", pt: "Versace Home, em Moema." },
  "tonino-lamborghini-jardins": { en: "Tonino Lamborghini, in Jardins.", pt: "Tonino Lamborghini, nos Jardins." },
  "rosewood-sao-paulo": { en: "Jean Nouvel and Philippe Starck, for Rosewood.", pt: "Jean Nouvel e Philippe Starck, para a Rosewood." },
  "sofitel-residences-baru": { en: "Sofitel, in the Colombian Caribbean.", pt: "Sofitel, no Caribe colombiano." },
};

/* ---------- News ---------- */

export const newsI18n: Record<
  string,
  { headline: { en: string; pt: string }; summary: { en: string; pt: string } }
> = {
  "waldorf-astoria-marbella": {
    headline: { en: "Waldorf Astoria comes to Spain with a resort in Marbella", pt: "Waldorf Astoria chega à Espanha com um resort em Marbella" },
    summary: { en: "Hilton and Higuerón Developments sign Spain's first Waldorf Astoria: 120 residences alongside 120 rooms, a €220M investment, opening in 2029.", pt: "Hilton e Higuerón Developments assinam o primeiro Waldorf Astoria da Espanha: 120 residências junto a 120 quartos, investimento de 220M€, abertura em 2029." },
  },
  "espana-portugal-record": {
    headline: { en: "Spain and Portugal hit a branded residences record", pt: "Espanha e Portugal batem recorde em branded residences" },
    summary: { en: "The Iberian Peninsula now counts 66 projects under construction or in the pipeline, more than 4,100 units and a combined value of €5.216bn.", pt: "A península ibérica soma 66 projetos entre construção e pipeline, mais de 4.100 unidades e um valor agregado de 5.216M€." },
  },
  "aroeira-missoni-construccion": {
    headline: { en: "Construction begins on Aroeira Collections by Missoni", pt: "Começa a construção do Aroeira Collections by Missoni" },
    summary: { en: "Missoni's first residential project in Portugal, spread over 350 hectares in Herdade da Aroeira near Lisbon, is set for delivery by late 2028.", pt: "O primeiro projeto residencial da Missoni em Portugal, sobre 350 hectares na Herdade da Aroeira, perto de Lisboa, prevê entrega no final de 2028." },
  },
  "portugal-top3-europa": {
    headline: { en: "Portugal, among Europe's top three markets", pt: "Portugal, entre os três mercados líderes da Europa" },
    summary: { en: "33 branded residences already completed and 18 more in the pipeline confirm Portugal as one of the continent's fastest-growing markets.", pt: "33 branded residences já concluídas e mais 18 em pipeline consolidam Portugal como um dos mercados de maior crescimento do continente." },
  },
  "vretreats-cervinia": {
    headline: { en: "VOIhotels debuts in branded residences, in Cervinia", pt: "VOIhotels estreia em branded residences, em Cervinia" },
    summary: { en: "VRetreats is building its first residential project next to VRetreats Cervino, with a 2,000 sqm panoramic spa and opening set for winter 2027.", pt: "A VRetreats constrói seu primeiro projeto residencial ao lado do VRetreats Cervino, com spa panorâmico de 2.000 m² e abertura prevista para o inverno de 2027." },
  },
  "maybourne-saint-germain": {
    headline: { en: "Maybourne signs Paris's first branded residences", pt: "Maybourne assina as primeiras branded residences de Paris" },
    summary: { en: "The Maybourne Saint-Germain, in the historic Îlot Saint-Germain on the Rive Gauche, will add 23 ultra-luxury residences to a 101-key hotel, opening in 2027.", pt: "O Maybourne Saint-Germain, no histórico Îlot Saint-Germain da Rive Gauche, somará 23 residências de altíssimo padrão a um hotel de 101 quartos, com abertura em 2027." },
  },
  "cheval-knightsbridge-gate": {
    headline: { en: "Cheval Collection opens Knightsbridge Gate in London", pt: "Cheval Collection abre o Knightsbridge Gate em Londres" },
    summary: { en: "A Grade II listed Edwardian building, converted into 15 ultra-luxury residences of one to six bedrooms, next to Hyde Park.", pt: "Um edifício eduardiano tombado grau II, reconvertido em 15 residências de ultra luxo de um a seis quartos, ao lado do Hyde Park." },
  },
  "londres-25-proyectos": {
    headline: { en: "London tops 25 branded projects", pt: "Londres ultrapassa os 25 projetos de marca" },
    summary: { en: "Four Seasons, Ritz-Carlton and Marriott lead an offering that makes London one of Europe's branded residences hubs.", pt: "Four Seasons, Ritz-Carlton e Marriott lideram uma oferta que transforma Londres em um dos focos europeus de branded residences." },
  },
  "kempinski-miami": {
    headline: { en: "Kempinski lands in the United States, via Miami", pt: "Kempinski desembarca nos Estados Unidos, por Miami" },
    summary: { en: "Its first branded residences in the country, in the Design District, bring Kempinski's European hospitality to the U.S. market.", pt: "Suas primeiras branded residences no país, no Design District, trazem a hospitalidade europeia da Kempinski ao mercado norte-americano." },
  },
  "619-brickell-nobu": {
    headline: { en: "619 Brickell by Nobu adds 296 residences to Miami", pt: "619 Brickell by Nobu soma 296 residências a Miami" },
    summary: { en: "The 75-story tower features a wellness and longevity spa by Nobu, with prices starting at $3 million.", pt: "A torre de 75 andares conta com um spa de bem-estar e longevidade assinado pela Nobu, com preços a partir de 3 milhões de dólares." },
  },
  "siro-brickell": {
    headline: { en: "SIRO, Kerzner's brand, debuts in Brickell", pt: "SIRO, a marca da Kerzner, estreia em Brickell" },
    summary: { en: "Kerzner's performance-focused luxury concept arrives in Miami's financial district with its first residential project.", pt: "O conceito de luxo voltado à performance da Kerzner chega ao distrito financeiro de Miami com seu primeiro projeto residencial." },
  },
  "miami-pipeline-record": {
    headline: { en: "Miami, with the largest pipeline in its history", pt: "Miami, com o maior pipeline de sua história" },
    summary: { en: "More than 26 branded and ultra-luxury projects under development across Miami-Dade, Broward and Palm Beach, worth over $15bn.", pt: "Mais de 26 projetos de marca e ultra luxo em desenvolvimento entre Miami-Dade, Broward e Palm Beach, totalizando mais de 15.000M$." },
  },
  "sofitel-buenos-aires": {
    headline: { en: "Sofitel signs its first residences in Argentina", pt: "Sofitel assina suas primeiras residências na Argentina" },
    summary: { en: "Sofitel Residences Buenos Aires Madero, with Northbaires in Puerto Madero, is the brand's first project in the Americas and third worldwide.", pt: "Sofitel Residences Buenos Aires Madero, com a Northbaires em Puerto Madero, é o primeiro projeto da marca nas Américas e o terceiro do mundo." },
  },
  "sls-punta-del-este": {
    headline: { en: "SLS arrives in Punta del Este with GNV Group", pt: "SLS chega a Punta del Este com a GNV Group" },
    summary: { en: "Two 24-story towers, 314 residences and 80 rooms facing Playa Brava, designed by Gómez Platero, with a $120M investment.", pt: "Duas torres de 24 andares, 314 residências e 80 quartos em frente à Playa Brava, projetadas por Gómez Platero, com investimento de 120M$." },
  },
  "sao-paulo-marcas-brasilenas": {
    headline: { en: "São Paulo cements itself as a branded residences hub", pt: "São Paulo se consolida como polo de branded residences" },
    summary: { en: "It's now the world's fifth-largest market by volume, with Fasano, Armani, Pininfarina, Rosewood and Faena accounting for much of the pipeline.", pt: "Já é o quinto mercado do mundo em volume, com Fasano, Armani, Pininfarina, Rosewood e Faena concentrando boa parte dos projetos." },
  },
  "global-1000-proyectos": {
    headline: { en: "The world tops 900 branded projects in 2026", pt: "O mundo ultrapassa os 900 projetos de marca em 2026" },
    summary: { en: "The category has nearly tripled in a decade: from 323 active projects in 2015 to nearly 1,000 by the end of 2026.", pt: "A categoria quase triplicou em uma década: de 323 projetos ativos em 2015 para cerca de 1.000 no final de 2026." },
  },
};

/* ---------- Light localization for status/units/credits fields ---------- */

export const fieldPatterns: { es: RegExp; en: string; pt: string }[] = [
  { es: /Entregado/g, en: "Delivered", pt: "Entregue" },
  { es: /En desarrollo/g, en: "Under development", pt: "Em desenvolvimento" },
  { es: /En aprobación/g, en: "In approval", pt: "Em aprovação" },
  { es: /Fase 1 completa/g, en: "Phase 1 complete", pt: "Fase 1 concluída" },
  { es: /residencias/g, en: "residences", pt: "residências" },
  { es: /residencia/g, en: "residence", pt: "residência" },
  { es: /habitaciones/g, en: "rooms", pt: "quartos" },
  { es: /unidades/g, en: "units", pt: "unidades" },
  { es: /lotes/g, en: "lots", pt: "lotes" },
  { es: /Arquitectura:/g, en: "Architecture:", pt: "Arquitetura:" },
  { es: /Interiorismo:/g, en: "Interior design:", pt: "Design de interiores:" },
];

export function localizeField(text: string | undefined, locale: Locale): string | undefined {
  if (!text || locale === "es") return text;
  let out = text;
  for (const p of fieldPatterns) {
    out = out.replace(p.es, locale === "en" ? p.en : p.pt);
  }
  return out;
}
