
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'totem';

export interface AnimalCard {
    id: string;
    name: string;
    icon: string;
    rarity: Rarity;
    description: string;
    funFact: string;
    image?: string;
}

export const RARITY_CONFIG: Record<Rarity, { color: string, probability: number, label: string }> = {
    common: { color: "slate", probability: 0.50, label: "Commun" },
    rare: { color: "blue", probability: 0.30, label: "Rare" },
    epic: { color: "purple", probability: 0.15, label: "Épique" },
    legendary: { color: "orange", probability: 0.04, label: "Légendaire" },
    totem: { color: "rose", probability: 0.01, label: "Totem" }
};

export const ANIMALS: AnimalCard[] = [
    // --- TOTEM (1%) ---
    {
        id: "totem_otter",
        name: "Loutre de mer",
        icon: "🦦",
        rarity: "totem",
        description: "Mammifère marin emblématique du Pacifique Nord, connu pour utiliser des outils.",
        funFact: "Les loutres de mer possèdent la fourrure la plus dense du règne animal, avec jusqu'à 150 000 poils par cm², pour s'isoler du froid sans graisse.",
        image: "/cards/otter.png"
    },

    // --- LEGENDARY (4%) ---
    {
        id: "leg_snow_leopard",
        name: "Léopard des neiges",
        icon: "🐆",
        rarity: "legendary",
        description: "Félin solitaire des montagnes d'Asie centrale, surnommé le 'fantôme des montagnes'.",
        funFact: "Il ne peut pas rugir, contrairement aux autres grands félins. Ses pattes larges agissent comme des raquettes naturelles sur la neige.",
        image: "/cards/snow_leopard.png"
    },
    {
        id: "leg_blue_whale",
        name: "Baleine Bleue",
        icon: "🐋",
        rarity: "legendary",
        description: "Le plus gros animal ayant jamais vécu sur Terre, dépassant même les dinosaures.",
        funFact: "Son cœur pèse environ 600 kg (la taille d'une petite voiture) et ses vaisseaux sanguins sont si larges qu'un humain pourrait y nager.",
        image: "/cards/blue_whale.png"
    },
    {
        id: "leg_narwhal",
        name: "Narval",
        icon: "🦄", // Using unicorn icon as closest proxy or existing custom icon logic
        rarity: "legendary",
        description: "Cétacé de l'Arctique connu pour sa longue défense torsadée.",
        funFact: "Sa 'corne' est en réalité une dent (une canine) qui peut mesurer jusqu'à 3 mètres et contient des millions de terminaisons nerveuses.",
        image: "/cards/narwhal.png"
    },
    {
        id: "leg_komodo",
        name: "Dragon de Komodo",
        icon: "🦎",
        rarity: "legendary",
        description: "Le plus grand lézard du monde, vivant exclusivement sur quelques îles indonésiennes.",
        funFact: "Il peut détecter une carcasse à plus de 9 km de distance grâce à sa langue fourchue. Sa morsure contient des glandes à venin.",
        image: "/cards/komodo_dragon.png"
    },
    {
        id: "leg_axolotl",
        name: "Axolotl",
        icon: "👾", // Alien monster often used for axolotl/weird creatures
        rarity: "legendary",
        description: "Salamandre mexicaine qui passe toute sa vie à l'état larvaire (néoténie).",
        funFact: "Il possède une capacité de régénération incroyable : il peut recréer non seulement ses membres, mais aussi des parties de son cœur et de son cerveau.",
        image: "/cards/axolotl.png"
    },
    {
        id: "leg_orca",
        name: "Orque",
        icon: "🐳",
        rarity: "legendary",
        description: "Superprédateur des océans, l'orque règne au sommet de la chaîne alimentaire marine.",
        funFact: "Les orques chassent en groupes coordonnés et ont des dialectes vocaux uniques à chaque clan.",
        image: "/cards/orca.png"
    },
    {
        id: "leg_giant_panda",
        name: "Panda Géant",
        icon: "🐼",
        rarity: "legendary",
        description: "Emblème de la conservation animale, se nourrissant presque exclusivement de bambou.",
        funFact: "Un panda passe environ 14 heures par jour à manger et peut consommer jusqu'à 12 kg de bambou quotidiennement.",
        image: "/cards/giant_panda.png"
    },
    {
        id: "leg_white_tiger",
        name: "Tigre Blanc",
        icon: "🐅",
        rarity: "legendary",
        description: "Variante génétique rare du tigre du Bengale, vénérée dans de nombreuses cultures.",
        funFact: "Ses yeux sont bleus et son pelage est dû à une double mutation récessive. Il n'en reste plus à l'état sauvage.",
        image: "/cards/white_tiger.png"
    },

    // --- EPIC (15%) ---
    {
        id: "epic_elephant",
        name: "Éléphant d'Afrique",
        icon: "🐘",
        rarity: "epic",
        description: "Le plus grand animal terrestre actuel, doté d'une intelligence sociale complexe.",
        funFact: "Les éléphants peuvent communiquer via des infrasons (sons très graves) qui voyagent dans le sol sur plusieurs kilomètres.",
        image: "/cards/elephant.png"
    },
    {
        id: "epic_peregrine",
        name: "Faucon Pèlerin",
        icon: "🦅",
        rarity: "epic",
        description: "Rapace connu pour être l'animal le plus rapide du monde en piqué.",
        funFact: "Lors de ses attaques en piqué, il peut atteindre la vitesse vertigineuse de 390 km/h, subissant une force de 25G.",
        image: "/cards/peregrine_falcon.png"
    },
    {
        id: "epic_octopus",
        name: "Pieuvre",
        icon: "🐙",
        rarity: "epic",
        description: "Cephalopode à l'intelligence remarquable, capable de résoudre des problèmes complexes.",
        funFact: "Elle possède 3 cœurs et 9 cerveaux (un central et un petit dans chaque bras). Son sang est bleu car il est à base de cuivre.",
        image: "/cards/octopus.png"
    },
    {
        id: "epic_polar_bear",
        name: "Ours Polaire",
        icon: "🐻‍❄️",
        rarity: "epic",
        description: "Superprédateur de l'Arctique, parfaitement adapté au climat extrême.",
        funFact: "Sa peau est en réalité noire pour absorber la chaleur du soleil, et ses poils sont creux et transparents, agissant comme une fibre optique.",
        image: "/cards/polar_bear.png"
    },
    {
        id: "epic_gorilla",
        name: "Gorille", // Empty icon slot if standard emoji missing, relying on 🦍
        icon: "🦍",
        rarity: "epic",
        description: "Le plus grand des primates, vivant en groupes familiaux dirigés par un 'dos argenté'.",
        funFact: "Les gorilles partagent environ 98% de leur ADN avec les humains. Ils savent utiliser des outils et exprimer des émotions complexes.",
        image: "/cards/gorilla.png"
    },
    {
        id: "epic_sloth",
        name: "Paresseux",
        icon: "🦥",
        rarity: "epic",
        description: "Mammifère arboricole d'Amérique tropicale, célèbre pour sa lenteur.",
        funFact: "Il est si lent que des algues poussent sur sa fourrure, lui offrant un camouflage vert naturel. Il ne descend au sol qu'une fois par semaine.",
        image: "/cards/sloth.png"
    },
    {
        id: "epic_platypus",
        name: "Ornithorynque",
        icon: "🦆", // Close enough? Usually specific emoji needed
        rarity: "epic",
        description: "L'un des rares mammifères qui pond des œufs (monotrème).",
        funFact: "C'est un véritable puzzle biologique : il a un bec de canard, une queue de castor, pond des œufs et les mâles ont des aiguillons venimeux.",
        image: "/cards/platypus.png"
    },
    {
        id: "epic_shark",
        name: "Grand Requin Blanc",
        icon: "🦈",
        rarity: "epic",
        description: "L'un des plus grands poissons prédateurs, nageant dans les océans depuis des millions d'années.",
        funFact: "Ils peuvent détecter une seule goutte de sang dans 100 litres d'eau et sentir les champs électriques des proies.",
        image: "/cards/great_white_shark.png"
    },
    {
        id: "epic_rhino",
        name: "Rhinocéros",
        icon: "🦏",
        rarity: "epic",
        description: "Colosse herbivore d'Afrique et d'Asie, reconnaissable à ses cornes nasales.",
        funFact: "Sa corne n'est pas en os, mais en kératine compactée, la même matière que nos cheveux et nos ongles.",
        image: "/cards/rhino.png"
    },
    {
        id: "epic_hippo",
        name: "Hippopotame",
        icon: "🦛",
        rarity: "epic",
        description: "Mammifère semi-aquatique massif des rivières africaines, deceptively fast.",
        funFact: "Il sécrète une substance huileuse rouge qui agit comme un écran solaire naturel et un antiseptique.",
        image: "/cards/hippo.png"
    },
    {
        id: "epic_orangutan",
        name: "Orang-outan",
        icon: "🦧",
        rarity: "epic",
        description: "Grand singe arboricole d'Asie, dont le nom signifie 'homme de la forêt' en malais.",
        funFact: "Il a l'enfance la plus longue de tous les animaux non humains : les petits restent avec leur mère jusqu'à 8 ans.",
        image: "/cards/orangutan.png"
    },
    {
        id: "epic_golden_eagle",
        name: "Aigle Royal",
        icon: "🦅",
        rarity: "epic",
        description: "L'un des rapaces les plus puissants et les plus répandus de l'hémisphère nord.",
        funFact: "Ses serres sont plus puissantes qu'une mâchoire de lion. Il peut repérer un lapin à plus de 3 km de distance.",
        image: "/cards/golden_eagle.png"
    },

    // --- RARE (30%) ---
    {
        id: "rare_red_panda",
        name: "Panda Roux",
        icon: "🦊", // Proxy
        rarity: "rare",
        description: "Petit mammifère de l'Himalaya, qui n'est pas directement lié au Panda Géant.",
        funFact: "Il utilise sa longue queue touffue comme une couverture pour se tenir chaud en haute montagne.",
        image: "/cards/red_panda.png"
    },
    {
        id: "rare_koala",
        name: "Koala",
        icon: "🐨",
        rarity: "rare",
        description: "Marsupial australien qui se nourrit presque exclusivement d'eucalyptus.",
        funFact: "Il dort jusqu'à 20 heures par jour car la digestion des feuilles d'eucalyptus (qui sont toxiques) demande énormément d'énergie.",
        image: "/cards/koala.png"
    },
    {
        id: "rare_chameleon",
        name: "Caméléon",
        icon: "🦎",
        rarity: "rare",
        description: "Reptile capable de changer de couleur et de mouvoir ses yeux indépendamment.",
        funFact: "Il ne change pas de couleur pour se camoufler, mais principalement pour réguler sa température et communiquer ses émotions aux autres.",
        image: "/cards/chameleon.png"
    },
    {
        id: "rare_king_penguin",
        name: "Manchot Empereur",
        icon: "🐧",
        rarity: "rare",
        description: "Le plus grand et le plus lourd de tous les manchots, endémique de l'Antarctique.",
        funFact: "Le mâle couve l'œuf unique sur ses pieds pendant tout l'hiver antarctique, jeûnant pendant plus de 100 jours.",
        image: "/cards/king_penguin.png"
    },
    {
        id: "rare_tiger",
        name: "Tigre",
        icon: "🐯",
        rarity: "rare",
        description: "Le plus grand félin sauvage, chasseur solitaire doté d'une robe rayée unique.",
        funFact: "Chaque tigre a des rayures uniques, comme des empreintes digitales. Sa vision nocturne est 6 fois supérieure à celle de l'homme.",
        image: "/cards/tiger.png"
    },
    {
        id: "rare_owl",
        name: "Hibou Grand-Duc",
        icon: "🦉",
        rarity: "rare",
        description: "Un des plus grands rapaces nocturnes, reconnaissable à ses aigrettes.",
        funFact: "Son vol est totalement silencieux grâce à la structure en peigne de ses plumes, ce qui lui permet de surprendre ses proies.",
        image: "/cards/owl.png"
    },
    {
        id: "rare_dolphin",
        name: "Grand Dauphin",
        icon: "🐬",
        rarity: "rare",
        description: "Cétacé très social et intelligent, présent dans toutes les mers du monde.",
        funFact: "Les dauphins se donnent des noms (signatures sifflées) et peuvent se reconnaître même après 20 ans de séparation.",
        image: "/cards/dolphin.png"
    },
    {
        id: "rare_wolf",
        name: "Loup Gris",
        icon: "🐺",
        rarity: "rare",
        description: "Ancêtre sauvage du chien domestique, vivant en meutes hiérarchisées.",
        funFact: "Le hurlement du loup peut être entendu à 10 km de distance. Il sert à rallier la meute ou à marquer le territoire.",
        image: "/cards/wolf.png"
    },
    {
        id: "rare_toucan",
        name: "Toucan",
        icon: "🦜",
        rarity: "rare",
        description: "Oiseau tropical célèbre pour son bec démesuré et coloré.",
        funFact: "Son bec géant sert de radiateur thermique : en y augmentant le flux sanguin, l'oiseau peut évacuer sa chaleur corporelle excédentaire.",
        image: "/cards/toucan.png"
    },
    {
        id: "rare_cheetah",
        name: "Guépard",
        icon: "🐆",
        rarity: "rare",
        description: "L'animal terrestre le plus rapide, bâti pour la vitesse pure.",
        funFact: "Il peut accélérer de 0 à 100 km/h en seulement 3 secondes, plus vite qu'une voiture de sport.",
        image: "/cards/cheetah.png"
    },
    {
        id: "rare_kangaroo",
        name: "Kangourou",
        icon: "🦘",
        rarity: "rare",
        description: "Marsupial emblématique d'Australie qui se déplace en bondissant.",
        funFact: "Il ne peut pas marcher à reculons à cause de sa queue musclée et de la forme de ses pattes.",
        image: "/cards/kangaroo.png"
    },
    {
        id: "rare_lemur",
        name: "Lémurien",
        icon: "🐒",
        rarity: "rare",
        description: "Primate endémique de l'île de Madagascar, reconnaissable à sa queue annelée.",
        funFact: "Dans la société des lémuriens, ce sont les femelles qui dominent et dirigent le groupe.",
        image: "/cards/lemur.png"
    },
    {
        id: "rare_fennec",
        name: "Fennec",
        icon: "🦊",
        rarity: "rare",
        description: "Petit renard du désert aux oreilles disproportionnées.",
        funFact: "Ses immenses oreilles servent à dissiper la chaleur corporelle pour survivre dans le désert brûlant.",
        image: "/cards/fennec.png"
    },
    {
        id: "rare_capybara",
        name: "Capybara",
        icon: "🥔", // Looks like a potato, close enough, or 🛀
        rarity: "rare",
        description: "Le plus grand rongeur du monde, champion de la relaxation.",
        funFact: "Très sociables, ils servent souvent de 'chaise' ou de 'bus' à d'autres animaux (oiseaux, singes...). Ils adorent les bains chauds.",
        image: "/cards/capybara.png"
    },
    {
        id: "rare_flamingo",
        name: "Flamant Rose",
        icon: "🦩",
        rarity: "rare",
        description: "Oiseau échassier célèbre pour sa couleur rose et sa posture sur une patte.",
        funFact: "Ils ne naissent pas roses mais gris. Leur couleur vient des pigments caroténoïdes contenus dans les crevettes qu'ils mangent.",
        image: "/cards/flamingo.png"
    },
    {
        id: "rare_meerkat",
        name: "Suricate",
        icon: "👀", // Looking out
        rarity: "rare",
        description: "Petit carnivore du désert qui vit en colonies très vigilantes.",
        funFact: "Les suricates ont des cernes noirs autour des yeux qui agissent comme des lunettes de soleil naturelles pour réduire l'éblouissement.",
        image: "/cards/meerkat.png"
    },

    // --- COMMON (50%) ---
    {
        id: "com_cat",
        name: "Chat",
        icon: "🐱",
        rarity: "common",
        description: "Petit félin domestique, vénéré dans l'Égypte antique.",
        funFact: "Les chats ne peuvent pas sentir le goût sucré en raison d'une mutation génétique. Ils ronronnent à une fréquence qui favorise la guérison osseuse.",
        image: "/cards/cat.png"
    },
    {
        id: "com_dog",
        name: "Chien",
        icon: "🐶",
        rarity: "common",
        description: "Le meilleur ami de l'homme, première espèce animale domestiquée.",
        funFact: "L'empreinte du nez d'un chien est unique, tout comme l'empreinte digitale humaine. Ils peuvent sentir le passage du temps via les odeurs.",
        image: "/cards/dog.png"
    },
    {
        id: "com_rabbit",
        name: "Lapin de Garenne",
        icon: "🐰",
        rarity: "common",
        description: "Mammifère lagomorphe connu pour ses longues oreilles et sa rapidité.",
        funFact: "Les dents du lapin ne s'arrêtent jamais de pousser. Il doit ronger constamment pour les user.",
        image: "/cards/rabbit.png"
    },
    {
        id: "com_bee",
        name: "Abeille",
        icon: "🐝",
        rarity: "common",
        description: "Insecte pollinisateur vital pour l'écosystème, vivant en colonie.",
        funFact: "Pour produire 500g de miel, les abeilles d'une ruche parcourent l'équivalent de trois fois le tour de la Terre.",
        image: "/cards/bee.png"
    },
    {
        id: "com_frog",
        name: "Grenouille",
        icon: "🐸",
        rarity: "common",
        description: "Amphibien anoure capable de bonds spectaculaires.",
        funFact: "Certaines grenouilles peuvent littéralement geler en hiver (cœur arrêté) et dégeler au printemps pour reprendre leur vie.",
        image: "/cards/frog.png"
    },
    {
        id: "com_bear",
        name: "Ours Brun",
        icon: "🐻",
        rarity: "common",
        description: "Grand omnivore solitaire des forêts de l'hémisphère nord.",
        funFact: "Pendant l'hibernation, un ours ne mange pas, ne boit pas et ne fait pas ses besoins pendant plusieurs mois.",
        image: "/cards/bear.png"
    },
    {
        id: "com_pig",
        name: "Cochon",
        icon: "🐷",
        rarity: "common",
        description: "Mammifère omnivore très intelligent et sociable.",
        funFact: "Le cochon est l'un des rares animaux capables de se reconnaître dans un miroir (test de conscience de soi).",
        image: "/cards/pig.png"
    },
    {
        id: "com_cow",
        name: "Vache",
        icon: "🐮",
        rarity: "common",
        description: "Mammifère ruminant domestique élevé pour sa lait et sa viande.",
        funFact: "Les vaches ont un champ de vision de près de 360 degrés, mais elles ne voient pas bien les couleurs rouge et vert.",
        image: "/cards/cow.png"
    },
    {
        id: "com_chicken",
        name: "Poule",
        icon: "🐔",
        rarity: "common",
        description: "Oiseau de basse-cour descendant direct des dinosaures théropodes.",
        funFact: "C'est le descendant vivant le plus proche du Tyrannosaurus Rex. Elles peuvent reconnaître jusqu'à 100 visages.",
        image: "/cards/chicken.png"
    },
    {
        id: "com_hedgehog",
        name: "Hérisson",
        icon: "🦔",
        rarity: "common",
        description: "Petit mammifère insectivore couvert de piquants.",
        funFact: "Un hérisson possède entre 5000 et 7000 piquants. Il est immunisé contre le venin de vipère.",
        image: "/cards/hedgehog.png"
    },
    {
        id: "com_squirrel",
        name: "Écureuil",
        icon: "🐿️",
        rarity: "common",
        description: "Rongeur arboricole agile à la queue en panache.",
        funFact: "Les écureuils plantent indirectement des millions d'arbres chaque année en oubliant où ils ont caché leurs noisettes.",
        image: "/cards/squirrel.png"
    },
    {
        id: "com_turtle",
        name: "Tortue",
        icon: "🐢",
        rarity: "common",
        description: "Reptile à carapace existant depuis plus de 200 millions d'années.",
        funFact: "La carapace de la tortue fait partie de son squelette (c'est sa cage thoracique). Elle sent quand on la touche.",
        image: "/cards/turtle.png"
    },
    {
        id: "com_snail",
        name: "Escargot",
        icon: "🐌",
        rarity: "common",
        description: "Mollusque gastéropode portant une coquille en spirale.",
        funFact: "Un escargot peut dormir pendant 3 ans si les conditions climatiques sont mauvaises.",
        image: "/cards/snail.png"
    },
    {
        id: "com_ant",
        name: "Fourmi",
        icon: "🐜",
        rarity: "common",
        description: "Insecte social vivant dans des colonies ultra-organisées.",
        funFact: "La biomasse totale de toutes les fourmis sur Terre est à peu près égale à la biomasse totale de tous les humains.",
        image: "/cards/ant.png"
    },
    {
        id: "com_ladybug",
        name: "Coccinelle",
        icon: "🐞",
        rarity: "common",
        description: "Coléoptère prédateur de pucerons, ami des jardiniers.",
        funFact: "Les points sur son dos n'indiquent pas son âge, mais son espèce. Elle saigne des genoux pour effrayer les prédateurs.",
        image: "/cards/ladybug.png"
    },
    {
        id: "com_butterfly",
        name: "Papillon",
        icon: "🦋",
        rarity: "common",
        description: "Insecte volant aux ailes colorées, issu d'une métamorphose.",
        funFact: "Les papillons goûtent avec leurs pattes pour savoir si une plante est bonne pour pondre leurs œufs.",
        image: "/cards/butterfly.png"
    },
    {
        id: "com_crab",
        name: "Crabe",
        icon: "🦀",
        rarity: "common",
        description: "Crustacé décapode marchant généralement de côté.",
        funFact: "Les dents du crabe se trouvent dans son estomac.",
        image: "/cards/crab.png"
    },
    {
        id: "com_sheep",
        name: "Mouton",
        icon: "🐑",
        rarity: "common",
        description: "Mammifère herbivore domestique élevé pour sa laine épaisse.",
        funFact: "Les moutons ont une excellente mémoire : ils peuvent reconnaître et se souvenir de 50 visages différents.",
        image: "/cards/sheep.png"
    },
    {
        id: "com_horse",
        name: "Cheval",
        icon: "🐎",
        rarity: "common",
        description: "Grand mammifère herbivore, compagnon historique de l'homme.",
        funFact: "Les chevaux peuvent dormir debout grâce à un système de verrouillage de leurs articulations.",
        image: "/cards/horse.png"
    },
    {
        id: "com_duck",
        name: "Canard",
        icon: "🦆",
        rarity: "common",
        description: "Oiseau aquatique familier des étangs et rivières.",
        funFact: "Les plumes du canard sont parfaitement imperméables grâce à une huile qu'il étale avec son bec.",
        image: "/cards/duck.png"
    },
    {
        id: "com_hamster",
        name: "Hamster",
        icon: "🐹",
        rarity: "common",
        description: "Petit rongeur aux joues extensibles, très populaire comme animal de compagnie.",
        funFact: "Ses abajoues peuvent s'étirer jusqu'à ses épaules, lui permettant de transporter l'équivalent de son propre poids en nourriture.",
        image: "/cards/hamster.png"
    },
    {
        id: "com_mouse",
        name: "Souris Moissonneuse",
        icon: "🐭",
        rarity: "common",
        description: "L'un des plus petits rongeurs, expert en gymnastique sur les épis de blé.",
        funFact: "Elle construit des nids ronds tissés qui ressemblent à des balles de tennis, suspendus dans les hautes herbes.",
        image: "/cards/mouse.png"
    },
    {
        id: "com_pigeon",
        name: "Pigeon",
        icon: "🐦",
        rarity: "common",
        description: "Oiseau urbain mal-aimé mais doté de capacités de navigation exceptionnelles.",
        funFact: "Les pigeons peuvent reconnaître tous les mots de l'alphabet, différencier des humains sur des photos et même distinguer un tableau de Monet d'un Picasso.",
        image: "/cards/pigeon.png"
    }
];

export function getRandomCard(): AnimalCard {
    const rand = Math.random();

    // Weighted probabilities
    // Common: 0 - 0.50 (50%)
    // Rare: 0.50 - 0.80 (30%)
    // Epic: 0.80 - 0.95 (15%)
    // Legendary: 0.95 - 0.99 (4%)
    // Totem: 0.99 - 1.00 (1%)

    let selectedRarity: Rarity = 'common';

    if (rand < 0.50) selectedRarity = 'common';
    else if (rand < 0.80) selectedRarity = 'rare';
    else if (rand < 0.95) selectedRarity = 'epic';
    else if (rand < 0.99) selectedRarity = 'legendary';
    else selectedRarity = 'totem';

    const pool = ANIMALS.filter(a => a.rarity === selectedRarity);

    if (pool.length === 0) {
        return ANIMALS[0];
    }

    return pool[Math.floor(Math.random() * pool.length)];
}

export function getCardById(id: string): AnimalCard | undefined {
    return ANIMALS.find(a => a.id === id);
}

export function getRandomCardByRarity(rarity: Rarity): AnimalCard {
    const pool = ANIMALS.filter(a => a.rarity === rarity);
    if (pool.length === 0) {
        // Fallback unlikely, but return first animal if pool empty
        return ANIMALS[0];
    }
    return pool[Math.floor(Math.random() * pool.length)];
}
