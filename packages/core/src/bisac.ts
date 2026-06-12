/**
 * Curated subset of real BISAC Subject Headings (the category codes Amazon
 * KDP uses for book categorization). Not exhaustive — focused on the
 * genres/topics self-published authors use most. Labels follow BISAC's
 * `MAIN / Sub / Sub-sub` convention so they render the same way KDP shows
 * them in the category picker.
 */
export interface BisacCategory {
  code: string;
  label: string;
}

export const BISAC_CATEGORIES: BisacCategory[] = [
  // Fiction — general & literary
  { code: 'FIC000000', label: 'FICTION / General' },
  { code: 'FIC019000', label: 'FICTION / Literary' },
  { code: 'FIC002000', label: 'FICTION / Action & Adventure' },
  { code: 'FIC044000', label: 'FICTION / Women' },
  { code: 'FIC045000', label: 'FICTION / Family Life / General' },
  { code: 'FIC051000', label: 'FICTION / Sagas' },
  { code: 'FIC047000', label: 'FICTION / Coming of Age' },
  { code: 'FIC037000', label: 'FICTION / Sports' },
  { code: 'FIC012000', label: 'FICTION / Fairy Tales, Folk Tales, Legends & Mythology' },
  { code: 'FIC013000', label: 'FICTION / Gothic' },
  { code: 'FIC025000', label: 'FICTION / Psychological' },
  { code: 'FIC029000', label: 'FICTION / Short Stories (single author)' },
  { code: 'FIC042000', label: 'FICTION / Anthologies (multiple authors)' },
  { code: 'FIC008000', label: 'FICTION / Humorous / General' },
  { code: 'FIC008030', label: 'FICTION / Humorous / Satire' },

  // Fantasy
  { code: 'FIC003000', label: 'FICTION / Fantasy / General' },
  { code: 'FIC009000', label: 'FICTION / Fantasy / Epic' },
  { code: 'FIC009030', label: 'FICTION / Fantasy / Urban' },
  { code: 'FIC009050', label: 'FICTION / Fantasy / Paranormal' },
  { code: 'FIC009060', label: 'FICTION / Fantasy / Sword & Sorcery' },
  { code: 'FIC009100', label: 'FICTION / Fantasy / Dark Fantasy' },

  // Science fiction
  { code: 'FIC028000', label: 'FICTION / Science Fiction / General' },
  { code: 'FIC028010', label: 'FICTION / Science Fiction / Action & Adventure' },
  { code: 'FIC028020', label: 'FICTION / Science Fiction / Alien Contact' },
  { code: 'FIC028030', label: 'FICTION / Science Fiction / Apocalyptic & Post-Apocalyptic' },
  { code: 'FIC028060', label: 'FICTION / Science Fiction / Hard Science Fiction' },
  { code: 'FIC028080', label: 'FICTION / Science Fiction / Military' },
  { code: 'FIC028090', label: 'FICTION / Science Fiction / Space Opera' },
  { code: 'FIC028100', label: 'FICTION / Science Fiction / Steampunk' },
  { code: 'FIC028110', label: 'FICTION / Science Fiction / Time Travel' },
  { code: 'FIC028120', label: 'FICTION / Science Fiction / Cyberpunk' },
  { code: 'FIC028130', label: 'FICTION / Science Fiction / Dystopian' },

  // Romance
  { code: 'FIC027000', label: 'FICTION / Romance / General' },
  { code: 'FIC027020', label: 'FICTION / Romance / Contemporary' },
  { code: 'FIC027050', label: 'FICTION / Romance / Paranormal' },
  { code: 'FIC027060', label: 'FICTION / Romance / Romantic Comedy' },
  { code: 'FIC027070', label: 'FICTION / Romance / Suspense' },
  { code: 'FIC027110', label: 'FICTION / Romance / Historical / General' },
  { code: 'FIC027400', label: 'FICTION / Romance / Historical / Regency' },
  { code: 'FIC027130', label: 'FICTION / Romance / Multicultural & Interracial' },
  { code: 'FIC027200', label: 'FICTION / Romance / Western' },
  { code: 'FIC027240', label: 'FICTION / Romance / New Adult' },
  { code: 'FIC027250', label: 'FICTION / Romance / LGBTQ+' },
  { code: 'FIC027300', label: 'FICTION / Romance / Fantasy' },
  { code: 'FIC027320', label: 'FICTION / Romance / Science Fiction' },
  { code: 'FIC027340', label: 'FICTION / Romance / Sports' },
  { code: 'FIC027350', label: 'FICTION / Romance / Military' },

  // Mystery & detective
  { code: 'FIC022000', label: 'FICTION / Mystery & Detective / General' },
  { code: 'FIC022010', label: 'FICTION / Mystery & Detective / Amateur Sleuth' },
  { code: 'FIC022020', label: 'FICTION / Mystery & Detective / Police Procedural' },
  { code: 'FIC022030', label: 'FICTION / Mystery & Detective / Private Investigators' },
  { code: 'FIC022040', label: 'FICTION / Mystery & Detective / Women Sleuths' },
  { code: 'FIC022050', label: 'FICTION / Mystery & Detective / Hard-Boiled' },
  { code: 'FIC022060', label: 'FICTION / Mystery & Detective / Historical' },
  { code: 'FIC022070', label: 'FICTION / Mystery & Detective / International Mystery & Crime' },
  { code: 'FIC022080', label: 'FICTION / Mystery & Detective / Cozy / General' },
  { code: 'FIC022090', label: 'FICTION / Mystery & Detective / Cozy / Crafts & Hobbies' },
  { code: 'FIC022100', label: 'FICTION / Mystery & Detective / Cozy / Culinary' },
  { code: 'FIC022130', label: 'FICTION / Mystery & Detective / Cozy / Animals' },

  // Thrillers
  { code: 'FIC031000', label: 'FICTION / Thrillers / General' },
  { code: 'FIC031010', label: 'FICTION / Thrillers / Crime' },
  { code: 'FIC031020', label: 'FICTION / Thrillers / Domestic' },
  { code: 'FIC031060', label: 'FICTION / Thrillers / Espionage' },
  { code: 'FIC031070', label: 'FICTION / Thrillers / Legal' },
  { code: 'FIC031080', label: 'FICTION / Thrillers / Medical' },
  { code: 'FIC031100', label: 'FICTION / Thrillers / Military' },
  { code: 'FIC031110', label: 'FICTION / Thrillers / Political' },
  { code: 'FIC031120', label: 'FICTION / Thrillers / Supernatural' },
  { code: 'FIC031140', label: 'FICTION / Thrillers / Psychological' },

  // Horror & occult
  { code: 'FIC015000', label: 'FICTION / Horror' },
  { code: 'FIC024000', label: 'FICTION / Occult & Supernatural' },

  // Historical
  { code: 'FIC014000', label: 'FICTION / Historical / General' },
  { code: 'FIC014050', label: 'FICTION / Historical / Ancient' },
  { code: 'FIC014060', label: 'FICTION / Historical / Medieval' },
  { code: 'FIC014080', label: 'FICTION / Historical / 19th Century' },
  { code: 'FIC014090', label: 'FICTION / Historical / 20th Century' },
  { code: 'FIC014100', label: 'FICTION / Historical / World War I' },
  { code: 'FIC014110', label: 'FICTION / Historical / World War II' },
  { code: 'FIC014120', label: 'FICTION / Historical / American Civil War' },

  // Christian / religious fiction
  { code: 'FIC026000', label: 'FICTION / Religious / General' },
  { code: 'FIC026020', label: 'FICTION / Religious / Christian / General' },
  { code: 'FIC026030', label: 'FICTION / Religious / Christian / Romance' },
  { code: 'FIC026060', label: 'FICTION / Religious / Christian / Historical' },
  { code: 'FIC026100', label: 'FICTION / Religious / Christian / Suspense' },

  // African American & Black
  { code: 'FIC050000', label: 'FICTION / African American & Black / General' },
  { code: 'FIC050040', label: 'FICTION / African American & Black / Mystery & Detective' },
  { code: 'FIC050050', label: 'FICTION / African American & Black / Romance / General' },
  { code: 'FIC050060', label: 'FICTION / African American & Black / Urban & Street Lit' },

  // Erotica
  { code: 'FIC062000', label: 'FICTION / Erotica / General' },
  { code: 'FIC062020', label: 'FICTION / Erotica / BDSM' },
  { code: 'FIC062080', label: 'FICTION / Erotica / LGBTQ+' },

  // Business & economics
  { code: 'BUS000000', label: 'BUSINESS & ECONOMICS / General' },
  { code: 'BUS025000', label: 'BUSINESS & ECONOMICS / Entrepreneurship' },
  { code: 'BUS012000', label: 'BUSINESS & ECONOMICS / Economics / General' },
  { code: 'BUS070000', label: 'BUSINESS & ECONOMICS / Personal Finance / General' },
  { code: 'BUS107000', label: 'BUSINESS & ECONOMICS / Personal Finance / Budgeting & Money Management' },
  { code: 'BUS050000', label: 'BUSINESS & ECONOMICS / Investments & Securities / General' },
  { code: 'BUS061000', label: 'BUSINESS & ECONOMICS / Management' },
  { code: 'BUS043000', label: 'BUSINESS & ECONOMICS / Marketing / General' },
  { code: 'BUS012050', label: 'BUSINESS & ECONOMICS / E-Commerce' },
  { code: 'BUS012160', label: 'BUSINESS & ECONOMICS / Leadership' },
  { code: 'BUS101000', label: 'BUSINESS & ECONOMICS / Negotiating' },
  { code: 'BUS071000', label: 'BUSINESS & ECONOMICS / Real Estate / General' },

  // Self-help
  { code: 'SEL000000', label: 'SELF-HELP / General' },
  { code: 'SEL031000', label: 'SELF-HELP / Personal Growth / General' },
  { code: 'SEL027000', label: 'SELF-HELP / Personal Growth / Self-Esteem' },
  { code: 'SEL021000', label: 'SELF-HELP / Motivational & Inspirational' },
  { code: 'SEL036000', label: 'SELF-HELP / Personal Growth / Happiness' },
  { code: 'SEL044000', label: 'SELF-HELP / Personal Growth / Success' },
  { code: 'SEL016000', label: 'SELF-HELP / Habits & Goal Setting' },
  { code: 'SEL006000', label: 'SELF-HELP / Anxieties & Phobias' },
  { code: 'SEL024000', label: 'SELF-HELP / Stress Management' },
  { code: 'SEL045000', label: 'SELF-HELP / Spiritual' },

  // Health & fitness
  { code: 'HEA000000', label: 'HEALTH & FITNESS / General' },
  { code: 'HEA017000', label: 'HEALTH & FITNESS / Diet & Nutrition / General' },
  { code: 'HEA039000', label: 'HEALTH & FITNESS / Mental Health' },
  { code: 'HEA006000', label: 'HEALTH & FITNESS / Diseases & Conditions / General' },
  { code: 'HEA031000', label: 'HEALTH & FITNESS / Healing' },
  { code: 'HEA010000', label: 'HEALTH & FITNESS / Diet Therapy' },

  // Cooking
  { code: 'CKB000000', label: 'COOKING / General' },
  { code: 'CKB016000', label: 'COOKING / Courses & Dishes / General' },
  { code: 'CKB031000', label: 'COOKING / Health & Healing / General' },
  { code: 'CKB063000', label: 'COOKING / Methods / General' },
  { code: 'CKB119000', label: 'COOKING / Specific Ingredients / General' },
  { code: 'CKB078000', label: 'COOKING / Regional & Ethnic / General' },

  // Biography & autobiography
  { code: 'BIO000000', label: 'BIOGRAPHY & AUTOBIOGRAPHY / General' },
  { code: 'BIO026000', label: 'BIOGRAPHY & AUTOBIOGRAPHY / Personal Memoirs' },
  { code: 'BIO002010', label: 'BIOGRAPHY & AUTOBIOGRAPHY / Business' },
  { code: 'BIO005000', label: 'BIOGRAPHY & AUTOBIOGRAPHY / Entertainment & Performing Arts' },
  { code: 'BIO022000', label: 'BIOGRAPHY & AUTOBIOGRAPHY / Sports' },

  // History
  { code: 'HIS000000', label: 'HISTORY / General' },
  { code: 'HIS027000', label: 'HISTORY / Military / General' },
  { code: 'HIS036000', label: 'HISTORY / United States / General' },
  { code: 'HIS037070', label: 'HISTORY / World' },

  // True crime
  { code: 'TRU000000', label: 'TRUE CRIME / General' },
  { code: 'TRU002000', label: 'TRUE CRIME / Espionage' },
  { code: 'TRU003000', label: 'TRUE CRIME / Murder / General' },
  { code: 'TRU005000', label: 'TRUE CRIME / Organized Crime' },

  // Travel
  { code: 'TRV000000', label: 'TRAVEL / General' },
  { code: 'TRV026000', label: 'TRAVEL / Special Interest / General' },

  // Religion
  { code: 'REL000000', label: 'RELIGION / General' },
  { code: 'REL006710', label: 'RELIGION / Christian Living / General' },
  { code: 'REL012000', label: 'RELIGION / Biblical Studies / General' },
  { code: 'REL072000', label: 'RELIGION / Christian Theology / General' },

  // Science
  { code: 'SCI000000', label: 'SCIENCE / General' },
  { code: 'SCI013000', label: 'SCIENCE / Life Sciences / General' },

  // Computers
  { code: 'COM000000', label: 'COMPUTERS / General' },
  { code: 'COM051000', label: 'COMPUTERS / Programming / General' },
  { code: 'COM004000', label: 'COMPUTERS / Artificial Intelligence / General' },

  // Crafts & hobbies / Family / Psychology / Education
  { code: 'CRA000000', label: 'CRAFTS & HOBBIES / General' },
  { code: 'FAM000000', label: 'FAMILY & RELATIONSHIPS / General' },
  { code: 'FAM034000', label: 'FAMILY & RELATIONSHIPS / Marriage' },
  { code: 'PSY000000', label: 'PSYCHOLOGY / General' },
  { code: 'PSY031000', label: 'PSYCHOLOGY / Mental Health' },
  { code: 'EDU000000', label: 'EDUCATION / General' },

  // Juvenile fiction
  { code: 'JUV000000', label: "JUVENILE FICTION / General" },
  { code: 'JUV002000', label: 'JUVENILE FICTION / Animals / General' },
  { code: 'JUV016000', label: 'JUVENILE FICTION / Family / General' },
  { code: 'JUV023000', label: 'JUVENILE FICTION / Fantasy & Magic' },
  { code: 'JUV028000', label: 'JUVENILE FICTION / Humorous Stories' },
  { code: 'JUV037000', label: 'JUVENILE FICTION / School & Education' },
  { code: 'JUV039150', label: 'JUVENILE FICTION / Science Fiction' },

  // Juvenile nonfiction
  { code: 'JNF000000', label: 'JUVENILE NONFICTION / General' },
  { code: 'JNF051000', label: 'JUVENILE NONFICTION / Science & Nature / General' },

  // Young adult fiction
  { code: 'YAF000000', label: 'YOUNG ADULT FICTION / General' },
  { code: 'YAF019000', label: 'YOUNG ADULT FICTION / Fantasy / General' },
  { code: 'YAF058000', label: 'YOUNG ADULT FICTION / Science Fiction / General' },
  { code: 'YAF028000', label: 'YOUNG ADULT FICTION / Mysteries & Detective Stories' },
  { code: 'YAF048000', label: 'YOUNG ADULT FICTION / Social Themes / General' },
  { code: 'YAF017000', label: 'YOUNG ADULT FICTION / Dystopian' },
  { code: 'YAF027000', label: 'YOUNG ADULT FICTION / Romance / General' },
  { code: 'YAF026000', label: 'YOUNG ADULT FICTION / LGBTQ+' },

  // Young adult nonfiction
  { code: 'YAN000000', label: 'YOUNG ADULT NONFICTION / General' },

  // Poetry
  { code: 'POE000000', label: 'POETRY / General' },
  { code: 'POE005000', label: 'POETRY / American / General' },
  { code: 'POE021000', label: 'POETRY / Subjects & Themes / Love & Erotica' },
  { code: 'POE023000', label: 'POETRY / Women Authors' },
];
