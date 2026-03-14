import { useState, useEffect, useCallback } from "react";
import { auth, provider, db } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, setDoc } from "firebase/firestore";

/* ─── CLOUD SYNC HOOK ────────────────────────────────────── */
// Signed-in users: syncs to Firestore in real-time across devices.
// Guests (uid = null): falls back to localStorage so changes persist locally.
function useCloudState(uid, key, defaultValue) {
  const lsKey = `rb_${key}`;

  const [value, setValue] = useState(() => {
    if (!uid) {
      // Guest: load from localStorage
      try {
        const stored = localStorage.getItem(lsKey);
        return stored !== null ? JSON.parse(stored) : defaultValue;
      } catch { return defaultValue; }
    }
    return defaultValue;
  });

  // Guest: persist to localStorage whenever value changes
  useEffect(() => {
    if (!uid) {
      try { localStorage.setItem(lsKey, JSON.stringify(value)); } catch {}
    }
  }, [uid, lsKey, value]);

  // Signed-in: listen for real-time Firestore updates (from other devices)
  useEffect(() => {
    if (!uid) return;
    const ref = doc(db, "users", uid);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.metadata.hasPendingWrites) return;
      if (snap.exists() && snap.data()[key] !== undefined) {
        setValue(snap.data()[key]);
      }
    });
    return unsub;
  }, [uid, key]); // eslint-disable-line react-hooks/exhaustive-deps

  const setAndSync = useCallback((newValOrFn) => {
    setValue((prev) => {
      const next = typeof newValOrFn === "function" ? newValOrFn(prev) : newValOrFn;
      if (uid) {
        setDoc(doc(db, "users", uid), { [key]: next }, { merge: true }).catch(console.error);
      } else {
        try { localStorage.setItem(lsKey, JSON.stringify(next)); } catch {}
      }
      return next;
    });
  }, [uid, key, lsKey]);

  return [value, setAndSync];
}

/* ─── MOBILE DETECTION ───────────────────────────────────── */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

/* ─── SPICE BLENDS ─────────────────────────────────────── */
const spiceBlends = [
  {
    id: 1,
    name: "Tex Mex Blend",
    emoji: "🌮",
    color: "#c0392b",
    tagline: "HelloFresh Tex Mex — Recreated",
    description:
      "The smoky, earthy blend HelloFresh uses in their Tex Mex dishes. Make a big jar and reach for it constantly — tacos, chili, eggs, roasted sweet potato, literally everything.",
    usedIn: ["Turkey Taco Bowls", "Mexican Turkey Chili", "Chipotle Turkey Burgers"],
    ratio: [
      { spice: "Chili powder", single: "2 tsp", bulk: "16 tsp (≈5 tbsp)" },
      { spice: "Ground cumin", single: "1½ tsp", bulk: "12 tsp (4 tbsp)" },
      { spice: "Smoked paprika", single: "1 tsp", bulk: "8 tsp (2⅔ tbsp)" },
      { spice: "Garlic powder", single: "1 tsp", bulk: "8 tsp (2⅔ tbsp)" },
      { spice: "Onion powder", single: "½ tsp", bulk: "4 tsp (1⅓ tbsp)" },
      { spice: "Dried oregano", single: "½ tsp", bulk: "4 tsp (1⅓ tbsp)" },
      { spice: "Cayenne pepper", single: "¼ tsp", bulk: "2 tsp" },
      { spice: "Fine salt", single: "½ tsp", bulk: "4 tsp (1⅓ tbsp)" },
    ],
    bulkNote: "Bulk batch fills a standard 250ml mason jar. Use 2 tbsp per 500g of meat. Keeps 6 months in a cool, dark cupboard.",
    whereToBuy: "Buy chili powder, cumin, and smoked paprika in bulk bags at Bulk Barn or Costco — 70% cheaper than small jars. The sweet spot is buying dried chilies whole and grinding them, but the powder version is perfectly legit.",
  },
  {
    id: 2,
    name: "Smoky Chipotle Blend",
    emoji: "🌶",
    color: "#e67e22",
    tagline: "Deep smoke, controlled heat",
    description:
      "Chipotle peppers are just smoked jalapeños — this dry blend replicates that distinctive flavour without needing a whole can. The tiny bit of brown sugar is the secret: it caramelizes and adds depth when searing.",
    usedIn: ["Chipotle Turkey Burgers", "Beef & Lentil Power Bowls"],
    ratio: [
      { spice: "Chipotle powder", single: "1½ tsp", bulk: "12 tsp (4 tbsp)" },
      { spice: "Smoked paprika", single: "1½ tsp", bulk: "12 tsp (4 tbsp)" },
      { spice: "Ground cumin", single: "1 tsp", bulk: "8 tsp (2⅔ tbsp)" },
      { spice: "Garlic powder", single: "1 tsp", bulk: "8 tsp (2⅔ tbsp)" },
      { spice: "Brown sugar", single: "½ tsp", bulk: "4 tsp (1⅓ tbsp)" },
      { spice: "Onion powder", single: "½ tsp", bulk: "4 tsp (1⅓ tbsp)" },
      { spice: "Cayenne (optional)", single: "⅛ tsp", bulk: "1 tsp" },
      { spice: "Fine salt", single: "½ tsp", bulk: "4 tsp (1⅓ tbsp)" },
    ],
    bulkNote: "Fills a ~200ml jar. Use 2 tbsp per 500g of meat. The brown sugar helps with crust when pan-searing or grilling — don't skip it.",
    whereToBuy: "Chipotle powder is in the Mexican food section at most grocery stores, or very cheap online. Ancho chili powder makes a great milder substitute.",
  },
  {
    id: 3,
    name: "Italian Herb Blend",
    emoji: "🌿",
    color: "#27ae60",
    tagline: "Pasta, meatballs, and beyond",
    description:
      "Skip the overpriced Italian seasoning packets. This hits everything you want: aromatic, slightly floral, with a gentle heat. Works in pasta sauce, meatball mix, and any Mediterranean dish.",
    usedIn: ["High Protein Pasta", "Turkey Meatball Bake", "Greek Lamb Pita Wraps"],
    ratio: [
      { spice: "Dried basil", single: "1 tsp", bulk: "8 tsp (2⅔ tbsp)" },
      { spice: "Dried oregano", single: "1 tsp", bulk: "8 tsp (2⅔ tbsp)" },
      { spice: "Dried rosemary (crushed)", single: "½ tsp", bulk: "4 tsp (1⅓ tbsp)" },
      { spice: "Dried thyme", single: "½ tsp", bulk: "4 tsp (1⅓ tbsp)" },
      { spice: "Garlic powder", single: "1 tsp", bulk: "8 tsp (2⅔ tbsp)" },
      { spice: "Onion powder", single: "½ tsp", bulk: "4 tsp (1⅓ tbsp)" },
      { spice: "Chili flakes", single: "¼ tsp", bulk: "2 tsp" },
      { spice: "Fine salt", single: "½ tsp", bulk: "4 tsp (1⅓ tbsp)" },
    ],
    bulkNote: "Crush dried rosemary between your fingers before mixing — releases the oils. Store in 200ml jar, lasts 6 months. Use 1.5 tbsp per 500g of meat.",
    whereToBuy: "All standard grocery staples. Buying loose dried herbs at a bulk food store is significantly cheaper than branded jars.",
  },
  {
    id: 4,
    name: "Korean Umami Blend",
    emoji: "🫙",
    color: "#8e44ad",
    tagline: "The dry base for Korean-style dishes",
    description:
      "This is the dry backbone — combine it with gochujang (wet chili paste) and soy sauce and you get that complex, restaurant-quality Korean flavour. Gochujang is cheap at any Asian grocery and keeps for months in the fridge.",
    usedIn: ["Korean Beef Bowls", "Spicy Pork & Noodle Stir Fry"],
    ratio: [
      { spice: "Garlic powder", single: "1 tsp", bulk: "8 tsp (2⅔ tbsp)" },
      { spice: "Ground ginger", single: "½ tsp", bulk: "4 tsp (1⅓ tbsp)" },
      { spice: "White pepper", single: "½ tsp", bulk: "4 tsp (1⅓ tbsp)" },
      { spice: "Sesame seeds (toasted)", single: "1 tsp", bulk: "8 tsp (2⅔ tbsp)" },
      { spice: "Onion powder", single: "½ tsp", bulk: "4 tsp (1⅓ tbsp)" },
      { spice: "Chili flakes", single: "½ tsp", bulk: "4 tsp (1⅓ tbsp)" },
    ],
    bulkNote: "Makes a smaller batch (~150ml jar) — sesame seeds go rancid faster than dried spices so don't go too big. Keeps 3 months. Use 1 tbsp per 500g of meat.",
    whereToBuy: "Find gochujang at any Asian grocery store or H-Mart for a fraction of the price vs. mainstream grocery. A 500g tub costs ~$4 and lasts months in the fridge.",
  },
];

/* ─── CATEGORY CONFIG ────────────────────────────────────── */
const CATS = {
  protein: { label: "Proteins & Dairy", icon: "🥩" },
  produce: { label: "Produce", icon: "🥦" },
  pantry: { label: "Pantry & Sauces", icon: "🥫" },
  grains: { label: "Grains & Carbs", icon: "🌾" },
  spice: { label: "Spices & Seasonings", icon: "🌶" },
};

/* ─── RECIPES ────────────────────────────────────────────── */
const recipes = [
  {
    id: 1,
    name: "Turkey Taco Bowls",
    tag: "Mexican · Meal Prep Staple",
    emoji: "🌮",
    color: "#e74c3c",
    servings: 4,
    prepTime: "10 min",
    cookTime: "25 min",
    macros: { protein: 55, carbs: 30, fat: 10, calories: 435 },
    spiceBlend: "Tex Mex Blend",
    ingredients: [
      { item: "Lean ground turkey (99% lean)", amount: "560g", cost: "$6.80", cat: "protein" },
      { item: "Black beans (canned, drained)", amount: "1.5 cans (360g)", cost: "$2.00", cat: "pantry" },
      { item: "Jasmine rice", amount: "240g dry", cost: "$1.20", cat: "grains" },
      { item: "Diced tomatoes (canned)", amount: "1 can", cost: "$1.50", cat: "pantry" },
      { item: "Bell pepper (diced)", amount: "2 peppers", cost: "$2.00", cat: "produce" },
      { item: "Onion (diced)", amount: "1 large", cost: "$0.80", cat: "produce" },
      { item: "Lime", amount: "2 limes", cost: "$0.80", cat: "produce" },
      { item: "Greek yogurt (plain)", amount: "for topping", cost: "$1.50", cat: "protein" },
      { item: "Tex Mex Blend", amount: "2 tbsp", cost: "from jar", cat: "spice" },
    ],
    steps: [
      {
        title: "Prep",
        instructions: [
          "Wash and dry all produce.",
          "Dice onion into ½-inch pieces. Core and dice bell peppers into ½-inch pieces.",
          "Drain and rinse black beans. Halve both limes.",
        ],
      },
      {
        title: "Cook the rice",
        instructions: [
          "Add 240g (1¼ cups) jasmine rice and 360ml (1½ cups) cold water to a medium pot. Add ¼ tsp salt.",
          "Bring to a boil over high heat, then reduce to the lowest simmer. Cover tightly and cook 15 min — do not lift the lid.",
          "Remove from heat. Let steam, covered, for 5 min. Fluff with a fork. Squeeze juice from half a lime over the rice and stir through.",
        ],
      },
      {
        title: "Cook the turkey",
        instructions: [
          "Heat 1 tbsp oil in a large skillet over medium-high heat.",
          "Add diced onion and bell peppers. Cook, stirring occasionally, until softened and lightly golden, 5 min.",
          "Add ground turkey. Break apart with a wooden spoon and cook until no pink remains, 7–8 min. Drain excess fat.",
          "Add 2 tbsp Tex Mex Blend and ½ tsp salt. Stir and cook 1 min until fragrant.",
          "Pour in drained black beans and canned tomatoes. Stir to combine and simmer on medium-low for 5 min.",
        ],
      },
      {
        title: "Portion and serve",
        instructions: [
          "Divide rice evenly between 4 bowls or meal-prep containers.",
          "Top each with an equal portion of turkey taco mix.",
          "Serve with a generous dollop of plain Greek yogurt in place of sour cream and a lime wedge on the side.",
          "(TIP: Add sliced avocado fresh when eating — don't add during meal prep or it will brown.)",
        ],
      },
    ],
    prepTip: "Stores 5 days in fridge. Add sliced avocado fresh when eating. Greek yogurt is a swap for sour cream that adds ~6g protein per dollop.",
    helloFreshNote: "HelloFresh's taco bowls use small portions and a premixed packet. Jasmine rice keeps it satisfying and your own Tex Mex Blend gives you full control over the flavour and heat level.",
    estimatedCost: "$15.30 total / ~$3.82 per serving",
  },
  {
    id: 2,
    name: "Mexican Turkey Chili",
    tag: "Mexican · One-Pot",
    emoji: "🫕",
    color: "#c0392b",
    servings: 4,
    prepTime: "10 min",
    cookTime: "35 min",
    macros: { protein: 54, carbs: 36, fat: 8, calories: 435 },
    spiceBlend: "Tex Mex Blend",
    ingredients: [
      { item: "Lean ground turkey (99% lean)", amount: "500g", cost: "$6.00", cat: "protein" },
      { item: "Black beans (canned, drained)", amount: "1 can (240g)", cost: "$1.25", cat: "pantry" },
      { item: "Kidney beans (canned, drained)", amount: "1 can (240g)", cost: "$1.25", cat: "pantry" },
      { item: "Diced tomatoes (canned)", amount: "1 can", cost: "$1.50", cat: "pantry" },
      { item: "Frozen corn", amount: "150g", cost: "$1.00", cat: "produce" },
      { item: "Chicken broth (low sodium)", amount: "350ml", cost: "$1.50", cat: "pantry" },
      { item: "Jalapeño (diced)", amount: "1–2 peppers", cost: "$0.50", cat: "produce" },
      { item: "Bell pepper (diced)", amount: "1 pepper", cost: "$1.00", cat: "produce" },
      { item: "Onion (diced)", amount: "1 large", cost: "$0.80", cat: "produce" },
      { item: "Garlic (minced)", amount: "3 cloves", cost: "$0.25", cat: "produce" },
      { item: "Tex Mex Blend", amount: "2 tbsp", cost: "from jar", cat: "spice" },
      { item: "Greek yogurt (plain)", amount: "for topping", cost: "$1.50", cat: "protein" },
      { item: "Lime", amount: "1 lime", cost: "$0.40", cat: "produce" },
    ],
    steps: [
      {
        title: "Prep",
        instructions: [
          "Wash and dry all produce.",
          "Dice onion and bell pepper into ½-inch pieces. Finely dice jalapeño — remove seeds for mild heat, keep them for hot.",
          "Mince 3 garlic cloves. Drain and rinse black beans and kidney beans. Halve lime.",
        ],
      },
      {
        title: "Build the base",
        instructions: [
          "Heat 1 tbsp oil in a large pot or Dutch oven over medium-high heat.",
          "Add onion, bell pepper, and jalapeño. Cook, stirring occasionally, until softened, 5 min.",
          "Add minced garlic. Cook, stirring constantly, 1 min until fragrant.",
        ],
      },
      {
        title: "Brown the turkey",
        instructions: [
          "Add 500g ground turkey to the pot. Break apart with a wooden spoon and cook until no pink remains, 7–8 min.",
          "Stir in 2 tbsp Tex Mex Blend and ½ tsp salt. Cook 1 min until fragrant.",
        ],
      },
      {
        title: "Simmer the chili",
        instructions: [
          "Add canned tomatoes, 350ml (1½ cups) chicken broth, black beans, and kidney beans. Stir well to combine.",
          "Bring to a boil over high heat, then reduce to a steady low simmer. Cook uncovered 20 min, stirring occasionally.",
          "Stir in 150g frozen corn. Simmer 5 more min.",
          "Taste and adjust: add more salt, a squeeze of lime juice, or a pinch of cayenne as needed.",
        ],
      },
      {
        title: "Serve",
        instructions: [
          "Ladle into bowls. Top with a dollop of Greek yogurt, sliced avocado (optional), and a lime wedge.",
          "(TIP: This chili gets better the next day as flavours meld. Make a batch Sunday and eat well all week. Freezes perfectly for up to 3 months.)",
        ],
      },
    ],
    prepTip: "This is arguably the best meal-prep recipe in the book. Make a huge batch — it freezes perfectly for up to 3 months. Gets better overnight as flavours develop.",
    helloFreshNote: "HelloFresh chilis are usually single-can bean portions with modest spice. Doubling the beans, using your own Tex Mex blend, and adding Greek yogurt instead of sour cream pushes this protein way higher.",
    estimatedCost: "$16.95 total / ~$4.24 per serving",
  },
  {
    id: 3,
    name: "Chipotle Turkey Burgers",
    tag: "Mexican · Grill or Pan",
    emoji: "🍔",
    color: "#e67e22",
    servings: 4,
    prepTime: "15 min",
    cookTime: "15 min",
    macros: { protein: 52, carbs: 28, fat: 12, calories: 430 },
    spiceBlend: "Smoky Chipotle Blend",
    ingredients: [
      { item: "Lean ground turkey (99% lean)", amount: "700g", cost: "$8.50", cat: "protein" },
      { item: "White burger buns", amount: "4 buns", cost: "$3.00", cat: "grains" },
      { item: "Low fat cheddar cheese", amount: "4 slices", cost: "$2.00", cat: "protein" },
      { item: "Greek yogurt (plain)", amount: "100g", cost: "$1.00", cat: "protein" },
      { item: "Avocado", amount: "1 ripe", cost: "$1.50", cat: "produce" },
      { item: "Romaine lettuce", amount: "4 leaves", cost: "$0.80", cat: "produce" },
      { item: "Tomato (sliced)", amount: "1 large", cost: "$1.00", cat: "produce" },
      { item: "Red onion (sliced)", amount: "½ onion", cost: "$0.40", cat: "produce" },
      { item: "Lime", amount: "1 lime", cost: "$0.40", cat: "produce" },
      { item: "Egg white", amount: "1", cost: "$0.30", cat: "protein" },
      { item: "Smoky Chipotle Blend", amount: "2 tbsp", cost: "from jar", cat: "spice" },
    ],
    steps: [
      {
        title: "Prep",
        instructions: [
          "Wash and dry all produce.",
          "Slice tomato into rounds. Thinly slice red onion into rings. Separate lettuce leaves.",
          "Halve avocado, remove pit, and scoop flesh into a small bowl. Mash with a fork. Add a squeeze of lime juice and a pinch of salt — stir to combine.",
          "Halve remaining limes into wedges.",
        ],
      },
      {
        title: "Make the chipotle sauce",
        instructions: [
          "In a small bowl, combine 100g (½ cup) Greek yogurt, 1 tsp Smoky Chipotle Blend, 1 tsp Dijon mustard, and a squeeze of lime juice.",
          "Season with a pinch of salt and stir well. Refrigerate until ready to serve.",
        ],
      },
      {
        title: "Form the patties",
        instructions: [
          "In a large bowl, combine 560g ground turkey, 1 egg white, 1 tbsp Smoky Chipotle Blend, ¼ tsp salt, and a few cracks of pepper.",
          "Mix gently — do not overwork the meat or patties will be tough.",
          "Divide into 4 equal portions (~140g each). Shape into 4-inch-wide patties, roughly ¾ inch thick. Press a small thumb indent in the center of each patty to prevent puffing during cooking.",
          "(NOTE: The mixture will feel slightly wet — this is normal for lean turkey.)",
        ],
      },
      {
        title: "Cook the patties",
        instructions: [
          "Heat a large cast-iron skillet or grill pan over medium-high heat. Add ½ tbsp oil.",
          "When the pan is hot and lightly smoking, add patties. Cook without moving, 5–6 min per side, until deeply golden.",
          "In the last 1–2 min of cooking, place a slice of cheddar on each patty. Cover the pan with a lid or foil to melt the cheese.",
          "Transfer patties to a plate. Cover loosely with foil to rest 3 min.",
          "(TIP: Cook to an internal temperature of 74°C/165°F — use a meat thermometer if you have one.)",
        ],
      },
      {
        title: "Toast and assemble",
        instructions: [
          "Halve burger buns. Place cut-side down in the same pan over medium heat. Toast 1–2 min until lightly golden. Watch closely so they don't burn.",
          "Spread chipotle sauce on both the top and bottom buns.",
          "Stack on bottom bun: lettuce, patty with melted cheese, a spoonful of mashed avocado, tomato rounds, and red onion rings.",
          "Close with top bun. Serve immediately with a lime wedge on the side.",
        ],
      },
    ],
    prepTip: "Form raw patties and freeze individually (parchment between each) for up to 3 months — massive time saver. Cook from frozen, just add 3–4 extra minutes per side. Make the chipotle yogurt sauce fresh.",
    helloFreshNote: "Most HelloFresh burgers are a single patty with a generic seasoning packet. Mixing your Chipotle Blend directly into the meat is the move — infuses all the way through vs just surface seasoning.",
    estimatedCost: "$19.40 total / ~$4.85 per serving",
  },
  {
    id: 4,
    name: "High Protein Pasta",
    tag: "Italian · Comfort Food",
    emoji: "🍝",
    color: "#8e44ad",
    servings: 4,
    prepTime: "10 min",
    cookTime: "30 min",
    macros: { protein: 62, carbs: 48, fat: 12, calories: 560 },
    spiceBlend: "Italian Herb Blend",
    ingredients: [
      { item: "Lean ground beef (93/7)", amount: "480g", cost: "$6.40", cat: "protein" },
      { item: "Red lentil pasta", amount: "320g dry", cost: "$4.00", cat: "grains" },
      { item: "Greek yogurt (plain)", amount: "200g", cost: "$2.00", cat: "protein" },
      { item: "Marinara sauce (jarred)", amount: "700ml jar", cost: "$4.00", cat: "pantry" },
      { item: "Parmesan cheese (grated)", amount: "50g", cost: "$2.00", cat: "protein" },
      { item: "Garlic (minced)", amount: "3 cloves", cost: "$0.25", cat: "produce" },
      { item: "Onion (diced)", amount: "1 medium", cost: "$0.60", cat: "produce" },
      { item: "Spinach (fresh)", amount: "120g", cost: "$2.00", cat: "produce" },
      { item: "Italian Herb Blend", amount: "2 tbsp", cost: "from jar", cat: "spice" },
    ],
    steps: [
      {
        title: "Prep",
        instructions: [
          "Wash and dry all produce.",
          "Dice onion finely. Mince 3 garlic cloves.",
          "Measure out 200g Greek yogurt into a small bowl and set aside at room temperature — cold yogurt is more likely to curdle when stirred in.",
        ],
      },
      {
        title: "Cook the beef",
        instructions: [
          "Heat 1 tbsp oil in a large, deep skillet over medium heat.",
          "Add diced onion. Cook, stirring occasionally, until soft and translucent, 5 min.",
          "Add minced garlic. Cook 1 min, stirring constantly.",
          "Increase heat to medium-high. Add 480g ground beef. Break apart with a wooden spoon and cook until well browned, 7–8 min. Drain excess fat.",
          "Add 2 tbsp Italian Herb Blend and ½ tsp salt. Stir and cook 1 min until fragrant.",
        ],
      },
      {
        title: "Make the sauce",
        instructions: [
          "Pour in the full 700ml jar of marinara sauce. Stir to combine with the beef.",
          "Reduce heat to low. Simmer sauce uncovered for 15 min, stirring occasionally.",
          "In the last 2 min, add 120g spinach and stir until fully wilted.",
          "Remove pan from heat. Stir in Greek yogurt until fully incorporated and the sauce is creamy. Season with salt to taste.",
          "(NOTE: Add yogurt off heat only — returning it to high heat will cause it to curdle and turn grainy.)",
        ],
      },
      {
        title: "Cook the pasta",
        instructions: [
          "Bring a large pot of salted water to a boil. Cook 320g red lentil pasta according to package directions, usually 8–10 min. Taste a strand — it should be tender but not mushy.",
          "Reserve ½ cup (125ml) of pasta water before draining.",
          "Drain pasta. Add directly to the sauce and toss to coat. Add a splash of reserved pasta water if sauce is too thick.",
        ],
      },
      {
        title: "Serve",
        instructions: [
          "Divide between 4 bowls. Top each with grated parmesan (about 2 tbsp per bowl).",
          "(TIP: Store pasta and sauce in separate containers if meal prepping — pasta soaks up sauce overnight and goes mushy.)",
        ],
      },
    ],
    prepTip: "Red lentil pasta has ~25g protein per 100g dry vs ~13g for regular pasta — that's your biggest protein lever here. Store sauce and pasta separately — pasta absorbs sauce overnight and gets mushy.",
    helloFreshNote: "HelloFresh pasta dishes are often the lowest-protein option on their menu. Red lentil pasta alone nearly doubles the protein of regular pasta. Greek yogurt stirred in off the heat keeps it creamy and adds extra protein without any heavy cream.",
    estimatedCost: "$21.25 total / ~$5.31 per serving",
  },
  {
    id: 5,
    name: "Korean Beef Bowls",
    tag: "Korean · Quick & Easy",
    emoji: "🥩",
    color: "#2980b9",
    servings: 4,
    prepTime: "10 min",
    cookTime: "20 min",
    macros: { protein: 52, carbs: 48, fat: 18, calories: 570 },
    spiceBlend: "Korean Umami Blend",
    ingredients: [
      { item: "Lean ground beef (93/7)", amount: "600g", cost: "$8.00", cat: "protein" },
      { item: "Jasmine rice", amount: "300g dry", cost: "$1.50", cat: "grains" },
      { item: "Frozen edamame", amount: "200g", cost: "$2.00", cat: "produce" },
      { item: "Gochujang paste", amount: "3 tbsp", cost: "$1.00", cat: "pantry" },
      { item: "Soy sauce (low sodium)", amount: "3 tbsp", cost: "$0.50", cat: "pantry" },
      { item: "Sesame oil", amount: "1 tbsp", cost: "$0.50", cat: "pantry" },
      { item: "Garlic (minced)", amount: "4 cloves", cost: "$0.30", cat: "produce" },
      { item: "Green onions", amount: "4 stalks", cost: "$0.50", cat: "produce" },
      { item: "Korean Umami Blend", amount: "1 tbsp", cost: "from jar", cat: "spice" },
    ],
    steps: [
      {
        title: "Prep",
        instructions: [
          "Mince 4 garlic cloves. Thinly slice green onions, keeping white and green parts separate.",
          "Mix the sauce: in a small bowl, whisk together 3 tbsp gochujang, 3 tbsp low-sodium soy sauce, and 1 tbsp sesame oil. Set aside.",
          "(TIP: Gochujang varies in heat by brand. Start with 2 tbsp if you're heat-sensitive and add more at the end.)",
        ],
      },
      {
        title: "Cook the rice",
        instructions: [
          "Add 300g (1½ cups) jasmine rice and 450ml (scant 2 cups) cold water to a medium pot. Add ¼ tsp salt.",
          "Bring to a boil over high heat, then reduce to the lowest simmer. Cover tightly and cook 15 min — do not lift the lid.",
          "Remove from heat. Let steam, covered, 5 min. Fluff with a fork.",
        ],
      },
      {
        title: "Cook the beef",
        instructions: [
          "Heat 1 tbsp oil in a large skillet over medium-high heat.",
          "Add ground beef. Break apart and cook until well browned, 7–8 min. Drain excess fat.",
          "Add minced garlic and 1 tbsp Korean Umami Blend. Stir and cook 1 min until fragrant.",
          "Pour sauce over the beef. Toss to coat and cook, stirring frequently, 2–3 min until sauce thickens and clings to the meat.",
        ],
      },
      {
        title: "Heat the edamame",
        instructions: [
          "Microwave 200g frozen edamame with 2 tbsp water for 2–3 min until heated through. Drain. Season with a pinch of salt.",
        ],
      },
      {
        title: "Assemble and serve",
        instructions: [
          "Divide rice between 4 bowls. Spoon Korean beef alongside the rice.",
          "Add edamame to each bowl.",
          "Garnish generously with sliced green onions (green parts). Add extra chili oil or sesame seeds if desired.",
        ],
      },
    ],
    prepTip: "Divide into 4 containers. Stores 4 days in fridge. Reheat beef and rice with a splash of water. Edamame can be kept separate and added cold.",
    helloFreshNote: "Inspired by HelloFresh Bulgogi bowls — doubled the beef and used gochujang instead of sweet soy for more complex heat and a real protein lift.",
    estimatedCost: "$14.70 total / ~$3.68 per serving",
  },
  {
    id: 6,
    name: "Greek Lamb Pita Wraps",
    tag: "Greek · Weekend Favourite",
    emoji: "🫓",
    color: "#16a085",
    servings: 4,
    prepTime: "15 min",
    cookTime: "15 min",
    macros: { protein: 48, carbs: 38, fat: 22, calories: 545 },
    spiceBlend: "Italian Herb Blend",
    ingredients: [
      { item: "Lean ground beef (93/7)", amount: "500g", cost: "$6.50", cat: "protein" },
      { item: "Pita bread", amount: "4 large", cost: "$3.00", cat: "grains" },
      { item: "Greek yogurt (plain)", amount: "300g", cost: "$3.00", cat: "protein" },
      { item: "Cucumber (grated)", amount: "1 large", cost: "$1.00", cat: "produce" },
      { item: "Feta cheese", amount: "80g", cost: "$3.00", cat: "protein" },
      { item: "Tomato (sliced)", amount: "2 medium", cost: "$1.50", cat: "produce" },
      { item: "Red onion (sliced)", amount: "½ onion", cost: "$0.40", cat: "produce" },
      { item: "Lemon", amount: "1 lemon", cost: "$0.50", cat: "produce" },
      { item: "Garlic (minced)", amount: "3 cloves", cost: "$0.30", cat: "produce" },
      { item: "Italian Herb Blend", amount: "2 tsp (Mediterranean-style)", cost: "from jar", cat: "spice" },
    ],
    steps: [
      {
        title: "Make the tzatziki",
        instructions: [
          "Grate the cucumber on the large holes of a box grater. Place grated cucumber in a clean kitchen towel or paper towels and squeeze out as much liquid as possible — this is important or the tzatziki will be watery.",
          "In a medium bowl, combine 300g Greek yogurt, squeezed cucumber, 1 minced garlic clove, 2 tbsp fresh lemon juice, ½ tsp salt, and a crack of pepper. Stir well.",
          "Cover and refrigerate for at least 10 min to let flavours develop.",
          "(TIP: Tzatziki keeps up to 4 days in the fridge and gets better with time.)",
        ],
      },
      {
        title: "Prep the toppings",
        instructions: [
          "Slice 2 medium tomatoes into rounds or half-moons. Season lightly with salt.",
          "Thinly slice ½ red onion into rings.",
          "Crumble 80g feta cheese with your fingers.",
          "Cut remaining lemon into wedges.",
        ],
      },
      {
        title: "Season and cook the beef",
        instructions: [
          "In a large bowl, combine 500g ground beef, 2 tsp Italian Herb Blend, 2 remaining minced garlic cloves, ½ tsp salt, and a few cracks of pepper. Mix until just combined.",
          "Heat 1 tbsp oil in a large skillet over medium-high heat.",
          "Add seasoned beef. Break apart and cook, stirring occasionally, until well browned with slightly crispy edges, 8–10 min. Drain excess fat.",
          "Squeeze a wedge of lemon over the cooked beef and toss to coat.",
        ],
      },
      {
        title: "Warm the pitas",
        instructions: [
          "Heat a dry skillet over medium heat. Add pitas one at a time and warm for 30–60 seconds per side until soft and slightly puffed.",
          "Alternatively, wrap all 4 pitas in foil and heat in the oven at 180°C/350°F for 5 min.",
        ],
      },
      {
        title: "Assemble and serve",
        instructions: [
          "Spread a generous layer of tzatziki (about 3–4 tbsp) across each warm pita.",
          "Add a portion of seasoned beef, sliced tomato, red onion rings, and crumbled feta.",
          "Serve open-faced or wrapped. Eat immediately — pitas go soggy if assembled and left to sit.",
        ],
      },
    ],
    prepTip: "Prep lamb and tzatziki separately up to 3 days ahead. Assemble fresh — pitas go soggy if wrapped. Great for a fast assembly lunch.",
    helloFreshNote: "HelloFresh's lamb wraps use a bottled sauce. Swapping to ground beef keeps costs down without sacrificing flavour — homemade tzatziki doubles the protein and takes 2 minutes to make.",
    estimatedCost: "$20.50 total / ~$5.13 per serving",
  },
  {
    id: 7,
    name: "Spicy Pork & Noodle Stir Fry",
    tag: "Asian · Fast",
    emoji: "🍜",
    color: "#d35400",
    servings: 4,
    prepTime: "10 min",
    cookTime: "15 min",
    macros: { protein: 50, carbs: 52, fat: 16, calories: 548 },
    spiceBlend: "Korean Umami Blend",
    ingredients: [
      { item: "Lean ground pork", amount: "600g", cost: "$7.00", cat: "protein" },
      { item: "Udon noodles (pre-cooked)", amount: "600g", cost: "$4.50", cat: "grains" },
      { item: "Broccoli florets", amount: "400g", cost: "$2.50", cat: "produce" },
      { item: "Eggs", amount: "2 large", cost: "$0.80", cat: "protein" },
      { item: "Chili oil", amount: "2 tbsp", cost: "$0.80", cat: "pantry" },
      { item: "Soy sauce (low sodium)", amount: "4 tbsp", cost: "$0.60", cat: "pantry" },
      { item: "Oyster sauce", amount: "2 tbsp", cost: "$0.50", cat: "pantry" },
      { item: "Rice vinegar", amount: "1 tbsp", cost: "$0.30", cat: "pantry" },
      { item: "Garlic (minced)", amount: "4 cloves", cost: "$0.30", cat: "produce" },
      { item: "Green onions", amount: "4 stalks", cost: "$0.50", cat: "produce" },
      { item: "Korean Umami Blend", amount: "1 tbsp", cost: "from jar", cat: "spice" },
    ],
    steps: [
      {
        title: "Prep",
        instructions: [
          "Wash and dry all produce.",
          "Mince 4 garlic cloves. Thinly slice green onions — keep white and green parts separate.",
          "Cut broccoli into bite-sized florets if not already cut.",
          "Mix the sauce: in a small bowl, whisk together 4 tbsp soy sauce, 2 tbsp oyster sauce, 1 tbsp rice vinegar, and 2 tbsp chili oil. Set aside.",
          "(TIP: Have everything prepped and next to the stove before you start cooking — stir fry moves fast.)",
        ],
      },
      {
        title: "Brown the pork",
        instructions: [
          "Heat a large wok or the largest skillet you have over high heat until just smoking.",
          "Add 600g ground pork. Break apart and cook without stirring for 2 min to get a good sear, then continue breaking apart and cooking until browned, 5–6 min total. Remove pork to a plate.",
        ],
      },
      {
        title: "Cook aromatics and broccoli",
        instructions: [
          "In the same wok over high heat, add ½ tbsp oil.",
          "Add white parts of green onions, minced garlic, and 1 tbsp Korean Umami Blend. Stir fry 30 seconds until fragrant.",
          "Add broccoli florets and ¼ cup (60ml) water. Toss and cook until tender-crisp and water has evaporated, 3–4 min.",
        ],
      },
      {
        title: "Add noodles and eggs",
        instructions: [
          "Add 600g udon noodles directly from the package. Toss with tongs to separate and combine with the broccoli. Heat through, 2–3 min.",
          "Push noodles to one side of the wok. Crack 2 eggs into the empty space. Scramble briefly with a spatula — about 30 seconds — then fold into the noodles before fully set.",
        ],
      },
      {
        title: "Finish and serve",
        instructions: [
          "Return cooked pork to the wok. Pour sauce over everything. Toss vigorously to coat, 1–2 min.",
          "Taste and adjust heat with extra chili oil if desired.",
          "Divide between 4 bowls. Top generously with sliced green onions (green parts).",
        ],
      },
    ],
    prepTip: "Stores 4 days. Add a splash of water before reheating to loosen noodles. Adjust chili oil per your spice preference.",
    helloFreshNote: "Inspired by HelloFresh's Dan Dan noodles — added eggs for extra protein, swapped in bok choy for volume, and used your Korean Umami Blend for the dry base.",
    estimatedCost: "$19.30 total / ~$4.83 per serving",
  },
  {
    id: 8,
    name: "Beef & Lentil Power Bowls",
    tag: "Fusion · Highest Value",
    emoji: "💪",
    color: "#1abc9c",
    servings: 4,
    prepTime: "10 min",
    cookTime: "30 min",
    macros: { protein: 58, carbs: 45, fat: 14, calories: 545 },
    spiceBlend: "Smoky Chipotle Blend",
    ingredients: [
      { item: "Lean ground beef (93/7)", amount: "560g", cost: "$7.20", cat: "protein" },
      { item: "Green or brown lentils (dry)", amount: "240g", cost: "$2.00", cat: "grains" },
      { item: "Potatoes (cubed)", amount: "480g", cost: "$1.60", cat: "produce" },
      { item: "Spinach (fresh or frozen)", amount: "160g", cost: "$2.00", cat: "produce" },
      { item: "Tahini", amount: "3 tbsp", cost: "$1.20", cat: "pantry" },
      { item: "Lemon", amount: "2 lemons", cost: "$1.00", cat: "produce" },
      { item: "Olive oil", amount: "2 tbsp", cost: "$0.50", cat: "pantry" },
      { item: "Smoky Chipotle Blend", amount: "2 tbsp", cost: "from jar", cat: "spice" },
    ],
    steps: [
      {
        title: "Prep",
        instructions: [
          "Preheat oven to 220°C/425°F. Line a baking sheet with parchment paper.",
          "Wash and dry all produce.",
          "Cut potatoes into ¾-inch cubes — no need to peel. Juice both lemons (you'll need about 4 tbsp total juice). Set aside.",
        ],
      },
      {
        title: "Roast the potatoes",
        instructions: [
          "On the lined baking sheet, toss 480g potato cubes with 2 tbsp olive oil, 1 tbsp Smoky Chipotle Blend, ½ tsp salt, and a few cracks of pepper.",
          "Spread in a single layer — don't crowd them or they'll steam instead of roast.",
          "Roast on the middle rack until golden and crispy on the edges, 25–30 min. Flip once halfway through.",
        ],
      },
      {
        title: "Cook the lentils",
        instructions: [
          "Rinse 240g dry lentils under cold water. Add to a medium pot with 600ml (2½ cups) cold water and ¼ tsp salt.",
          "Bring to a boil over high heat, then reduce to a simmer. Cook uncovered until lentils are just tender but not mushy, 20–22 min.",
          "Drain any excess water. Season with salt and pepper to taste.",
        ],
      },
      {
        title: "Cook the beef",
        instructions: [
          "Heat 1 tbsp oil in a large skillet over medium-high heat.",
          "Add 560g ground beef. Break apart and cook until well browned, 7–8 min. Drain excess fat.",
          "Add remaining 1 tbsp Smoky Chipotle Blend and ½ tsp salt. Stir and cook 1 min.",
          "Add 160g spinach. Stir until fully wilted, about 2 min. Remove from heat.",
        ],
      },
      {
        title: "Make tahini drizzle",
        instructions: [
          "In a small bowl, whisk together 3 tbsp tahini, 3 tbsp lemon juice, 3 tbsp water, and a pinch of salt until smooth and pourable.",
          "(TIP: If tahini is too thick, add water 1 tsp at a time. It should drizzle easily off a spoon.)",
        ],
      },
      {
        title: "Assemble and serve",
        instructions: [
          "Divide lentils between 4 bowls as the base.",
          "Top with beef and spinach mixture, then roasted potato cubes.",
          "Drizzle generously with tahini sauce.",
          "(TIP: Store components separately if meal prepping — add tahini drizzle fresh so it doesn't dry out.)",
        ],
      },
    ],
    prepTip: "One of the best freezer-friendly meals in this book. Store components separately from tahini (drizzle fresh). Keeps 5 days refrigerated.",
    helloFreshNote: "The beef + lentil combo is rarely seen on HelloFresh but it's a protein powerhouse and significantly cheaper per gram than any single-protein dish.",
    estimatedCost: "$16.80 total / ~$4.20 per serving",
  },
  {
    id: 9,
    name: "Turkey Meatball Bake",
    tag: "Italian · Batch Cook",
    emoji: "🍝",
    color: "#c0392b",
    servings: 4,
    prepTime: "20 min",
    cookTime: "25 min",
    macros: { protein: 60, carbs: 28, fat: 10, calories: 440 },
    spiceBlend: "Italian Herb Blend",
    ingredients: [
      { item: "Lean ground turkey (99% lean)", amount: "640g", cost: "$7.60", cat: "protein" },
      { item: "Spaghetti", amount: "240g dry", cost: "$2.00", cat: "grains" },
      { item: "Marinara sauce (jarred)", amount: "700ml jar", cost: "$4.00", cat: "pantry" },
      { item: "Parmesan cheese (grated)", amount: "40g", cost: "$1.60", cat: "protein" },
      { item: "Egg whites", amount: "2 large", cost: "$0.60", cat: "protein" },
      { item: "Breadcrumbs", amount: "3 tbsp", cost: "$0.40", cat: "grains" },
      { item: "Garlic (minced)", amount: "3 cloves", cost: "$0.25", cat: "produce" },
      { item: "Fresh basil (optional)", amount: "handful", cost: "$1.00", cat: "produce" },
      { item: "Italian Herb Blend", amount: "2 tsp", cost: "from jar", cat: "spice" },
    ],
    steps: [
      {
        title: "Prep",
        instructions: [
          "Preheat oven to 220°C/425°F. Line a large baking sheet with parchment paper.",
          "Mince 3 garlic cloves. Finely grate 40g parmesan cheese.",
        ],
      },
      {
        title: "Make the meatballs",
        instructions: [
          "In a large bowl, combine 640g ground turkey, 2 egg whites, 40g (¼ cup) grated parmesan, 3 minced garlic cloves, 2 tsp Italian Herb Blend, 3 tbsp breadcrumbs, ½ tsp salt, and a few cracks of pepper.",
          "Mix gently with your hands until just combined — overmixing makes tough meatballs.",
          "Scoop and roll into ~20 equal balls (about 2 tbsp of mixture each, roughly golf-ball sized). Place on lined baking sheet with space between each.",
          "(TIP: Wet your hands lightly before rolling — prevents sticking and gives smoother meatballs.)",
        ],
      },
      {
        title: "Bake the meatballs",
        instructions: [
          "Bake on the middle rack until tops are lightly golden and internal temperature reaches 74°C/165°F, 20–22 min.",
          "Do not flip during baking.",
        ],
      },
      {
        title: "Cook the pasta",
        instructions: [
          "Bring a large pot of well-salted water to a boil. Cook 240g spaghetti per package directions until al dente (usually 9–11 min).",
          "Reserve ½ cup (125ml) pasta water before draining. Drain pasta.",
        ],
      },
      {
        title: "Finish the sauce",
        instructions: [
          "Pour the full 700ml jar of marinara sauce into a large pot over medium heat. Bring to a gentle simmer.",
          "Add baked meatballs to the sauce. Simmer together for 5 min.",
          "Add drained spaghetti directly to the pot. Toss to coat — add a splash of reserved pasta water if sauce is too thick.",
        ],
      },
      {
        title: "Serve",
        instructions: [
          "Divide between 4 bowls. Top with extra parmesan and fresh basil leaves if using.",
          "(TIP: Store meatballs and sauce separately from the pasta — pasta soaks up sauce overnight and goes mushy. Combine fresh when reheating.)",
        ],
      },
    ],
    prepTip: "Meatballs freeze beautifully — make a double batch and freeze half. Store meatballs in sauce separately from the pasta so it doesn't absorb and go mushy overnight.",
    helloFreshNote: "HelloFresh meatball dishes often use fattier pork blends and smaller portions. Lean turkey + red lentil pasta (optional swap) gives you significantly more protein per serving.",
    estimatedCost: "$17.45 total / ~$4.36 per serving",
  },
  {
    id: 10,
    name: "Rotisserie Chicken Quesadillas",
    tag: "Mexican · 15-Minute Meal",
    emoji: "🫔",
    color: "#f39c12",
    servings: 4,
    prepTime: "5 min",
    cookTime: "10 min",
    macros: { protein: 49, carbs: 35, fat: 14, calories: 470 },
    spiceBlend: "Tex Mex Blend",
    ingredients: [
      { item: "Rotisserie chicken (store-bought)", amount: "1 whole (~900g)", cost: "$12.00", cat: "protein" },
      { item: "Large flour tortillas", amount: "4 large", cost: "$3.00", cat: "grains" },
      { item: "Low fat cheddar (shredded)", amount: "100g", cost: "$2.50", cat: "protein" },
      { item: "Black beans (canned, drained)", amount: "1 can (240g)", cost: "$1.25", cat: "pantry" },
      { item: "Frozen corn", amount: "100g", cost: "$0.75", cat: "produce" },
      { item: "Greek yogurt (plain)", amount: "for topping", cost: "$1.00", cat: "protein" },
      { item: "Avocado", amount: "1 ripe", cost: "$1.50", cat: "produce" },
      { item: "Lime", amount: "2 limes", cost: "$0.80", cat: "produce" },
      { item: "Tex Mex Blend", amount: "1 tbsp", cost: "from jar", cat: "spice" },
    ],
    steps: [
      {
        title: "Prep",
        instructions: [
          "Pull rotisserie chicken apart by hand — shred both white and dark meat into bite-sized pieces, discarding skin and bones. You'll get approximately 500g of shredded meat.",
          "Drain and rinse black beans.",
          "Halve avocado, remove pit, and scoop flesh into a small bowl. Mash with a fork. Add juice of half a lime and a pinch of salt — stir to combine. Set aside.",
          "Cut remaining limes into wedges.",
        ],
      },
      {
        title: "Heat the filling",
        instructions: [
          "In a small saucepan over medium heat, combine drained black beans, 100g frozen corn, and a pinch of Tex Mex Blend. Cook, stirring occasionally, until heated through, 3–4 min. Season with salt to taste.",
          "Alternatively, microwave beans and corn together in a bowl for 2 min, then season.",
        ],
      },
      {
        title: "Make the dipping sauce",
        instructions: [
          "In a small bowl, combine 3–4 tbsp Greek yogurt, a squeeze of lime juice (about 1 tsp), and a pinch of Tex Mex Blend. Stir well.",
          "Refrigerate until ready to serve.",
        ],
      },
      {
        title: "Cook the quesadillas",
        instructions: [
          "Lay a flour tortilla flat on a cutting board. On one half of the tortilla, layer: a handful of shredded chicken (~125g), 2–3 tbsp bean and corn mixture, and 25g (about 3 tbsp) shredded cheddar.",
          "Fold the tortilla in half over the filling.",
          "Heat a large dry skillet over medium heat. Add folded quesadilla. Cook, pressing down gently with a spatula, until golden and crispy on the bottom, 2–3 min.",
          "Carefully flip and cook the other side until golden and cheese is fully melted, 2 min more.",
          "Transfer to a cutting board. Repeat with remaining 3 tortillas.",
          "(TIP: Don't rush with high heat — medium heat gives golden, evenly crispy quesadillas without burning.)",
        ],
      },
      {
        title: "Serve",
        instructions: [
          "Slice each quesadilla into 3–4 wedges with a sharp knife or pizza cutter.",
          "Serve with chipotle dipping sauce, mashed avocado, and lime wedges on the side.",
        ],
      },
    ],
    prepTip: "The whole meal takes about 15 minutes. Rotisserie chicken is the ultimate shortcut — the protein is already cooked, seasoned, and resting. Grab one on your grocery run and dinner is basically done.",
    helloFreshNote: "This is what HelloFresh can't replicate: using a $12 rotisserie chicken across multiple meals (or one generous one). The protein cost-per-gram is excellent and zero effort.",
    estimatedCost: "$22.80 total / ~$5.70 per serving",
  },
];

/* ─── STOCK & INVENTORY ─────────────────────────────────── */
const STOCK_COLORS = { 0: "#e0e0e0", 1: "#e74c3c", 2: "#f39c12", 3: "#2ecc71", 4: "#27ae60" };
const STOCK_SHORT  = { 0: "Empty", 1: "Low", 2: "Half", 3: "Good", 4: "Full" };

function getAllIngredients() {
  const map = {};
  recipes.forEach((r) => {
    r.ingredients.forEach((ing) => {
      if (!map[ing.item]) map[ing.item] = { ...ing };
    });
  });
  const grouped = {};
  Object.values(map).forEach((ing) => {
    if (!grouped[ing.cat]) grouped[ing.cat] = [];
    grouped[ing.cat].push(ing);
  });
  return grouped;
}

/* ─── HELPERS ────────────────────────────────────────────── */
function sumQuantity(amounts) {
  if (amounts.length === 1) return amounts[0];
  const unique = [...new Set(amounts)];
  if (unique.length === 1) return unique[0];
  const tryParse = (s) => {
    let m = s.match(/^(\d+(?:\.\d+)?)\s*(g|kg|ml|l)(\s+\w+)?$/i);
    if (m) return { num: parseFloat(m[1]), unit: m[2], suffix: (m[3] || "").trim() };
    m = s.match(/^(\d+)\s+(\w+)$/i);
    if (m) return { num: parseFloat(m[1]), unit: m[2], suffix: "" };
    return null;
  };
  const parsed = amounts.map(tryParse);
  if (parsed.every((p) => p !== null)) {
    const base = (u) => u.toLowerCase().replace(/s$/, "");
    const sameUnit = new Set(parsed.map((p) => base(p.unit))).size === 1;
    const sameSuffix = new Set(parsed.map((p) => p.suffix)).size === 1;
    if (sameUnit && sameSuffix) {
      const total = parsed.reduce((s, p) => s + p.num, 0);
      const { unit, suffix } = parsed[0];
      const isMetric = /^(g|kg|ml|l)$/i.test(unit);
      return `${total}${isMetric ? "" : " "}${unit}${suffix ? " " + suffix : ""}`;
    }
  }
  return unique.join(" + ");
}

function buildGrouped(selectedIds) {
  const map = {};
  recipes.filter((r) => selectedIds.includes(r.id)).forEach((r) => {
    r.ingredients.forEach((ing) => {
      if (!map[ing.item]) {
        map[ing.item] = { ...ing, amounts: [ing.amount], inRecipes: [r.name] };
      } else if (!map[ing.item].inRecipes.includes(r.name)) {
        map[ing.item].inRecipes.push(r.name);
        map[ing.item].amounts.push(ing.amount);
      }
    });
  });
  Object.values(map).forEach((ing) => {
    ing.combined = ing.amounts.length > 1;
    ing.amount = sumQuantity(ing.amounts);
  });
  const grouped = {};
  Object.values(map).forEach((ing) => {
    if (!grouped[ing.cat]) grouped[ing.cat] = [];
    grouped[ing.cat].push(ing);
  });
  return grouped;
}

/* ─── SCALE INGREDIENT AMOUNTS ──────────────────────────── */
function scaleAmount(amount, factor) {
  if (factor === 1) return amount;
  // Don't scale qualitative notes like "from jar" or "for topping"
  if (/^(from|for)\s/i.test(amount)) return amount;
  // Match a leading number
  const m = amount.match(/^([\d.]+)(.*)/);
  if (!m) return amount;
  const scaled = parseFloat(m[1]) * factor;
  // Round to a sensible precision
  let nice;
  if (scaled >= 100) nice = Math.round(scaled);
  else if (scaled >= 10) nice = Math.round(scaled * 2) / 2;   // nearest 0.5
  else nice = Math.round(scaled * 4) / 4;                     // nearest 0.25
  const str = nice % 1 === 0 ? `${Math.round(nice)}` : `${nice}`;
  return `${str}${m[2]}`;
}

/* ─── SCALE INSTRUCTION TEXT ────────────────────────────── */
// Finds measurement quantities inside step instruction strings and scales them.
// Handles unicode fractions (½ ⅓ ¼ etc.), mixed numbers (1½), and the units:
// tbsp, tsp, cup/cups, g, kg, ml, oz, lb/lbs.
// Deliberately skips time (min, hours) and temperature (°C, °F).
function scaleInstructionText(text, factor) {
  if (factor === 1) return text;

  const FRAC_TO_NUM = { '½': 0.5, '⅓': 1/3, '⅔': 2/3, '¼': 0.25, '¾': 0.75, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875 };
  const NUM_TO_FRAC = [[0.75,'¾'],[2/3,'⅔'],[0.5,'½'],[1/3,'⅓'],[0.25,'¼']];

  function parseFracNum(s) {
    s = s.trim();
    if (FRAC_TO_NUM[s] !== undefined) return FRAC_TO_NUM[s];
    const mixed = s.match(/^(\d+)([½⅓⅔¼¾⅛⅜⅝⅞])$/);
    if (mixed) return parseInt(mixed[1]) + FRAC_TO_NUM[mixed[2]];
    return parseFloat(s);
  }

  function formatNice(n) {
    if (n >= 100) return `${Math.round(n)}`;
    if (n >= 10) n = Math.round(n * 2) / 2;
    else n = Math.round(n * 4) / 4;
    const whole = Math.floor(n);
    const frac = n - whole;
    for (const [val, ch] of NUM_TO_FRAC) {
      if (Math.abs(frac - val) < 0.04) {
        return whole > 0 ? `${whole}${ch}` : ch;
      }
    }
    return n % 1 === 0 ? `${Math.round(n)}` : `${n}`;
  }

  // Match a number (with optional unicode fraction) immediately before a measurement unit
  return text.replace(
    /(\d+[½⅓⅔¼¾⅛⅜⅝⅞]?|[½⅓⅔¼¾⅛⅜⅝⅞])\s*(tbsp|tsp|cups?|g(?=\b)|kg(?=\b)|ml(?=\b)|oz(?=\b)|lbs?(?=\b))/g,
    (match, num, unit) => {
      const value = parseFracNum(num);
      if (isNaN(value)) return match;
      return `${formatNice(value * factor)} ${unit}`;
    }
  );
}

function formatForShare(selectedIds, grouped, inventory) {
  const getStock = (item) => inventory[item] || 0;
  const names = recipes.filter((r) => selectedIds.includes(r.id)).map((r) => r.name);
  let text = `📋 MITCH'S GROCERY LIST\n${"─".repeat(30)}\nRecipes: ${names.join(", ")}\n\n`;
  Object.entries(CATS).forEach(([cat, { label, icon }]) => {
    if (!grouped[cat]) return;
    const needToBuy = grouped[cat].filter((ing) => getStock(ing.item) < 2);
    if (needToBuy.length === 0) return;
    text += `${icon} ${label}\n`;
    needToBuy.forEach((ing) => { text += `□ ${ing.item} — ${ing.amount}\n`; });
    text += "\n";
  });
  const inPantryItems = Object.values(grouped).flat().filter((ing) => getStock(ing.item) >= 2);
  if (inPantryItems.length > 0) {
    text += `✅ IN PANTRY (already have)\n`;
    inPantryItems.forEach((ing) => { text += `   ${ing.item}\n`; });
  }
  return text;
}

/* ─── APP ────────────────────────────────────────────────── */
export default function App() {
  const isMobile = useIsMobile();

  /* ── AUTH STATE ── */
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  // Signed-in users get a uid for Firestore; guests get null (localStorage fallback)
  const uid = user?.uid ?? null;

  /* ── APP STATE ── */
  const [view, setView] = useState("home");
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [copied, setCopied] = useState(false);
  const [blendMode, setBlendMode] = useState("single");
  const [selectedBlend, setSelectedBlend] = useState(null);
  const [customServings, setCustomServings] = useState(null);

  // Reset serving size whenever a different recipe is opened
  useEffect(() => { setCustomServings(null); }, [selectedRecipe]);

  // These three sync to Firestore in real-time across all devices
  const [checked, setChecked] = useCloudState(uid, "checked", {});
  const [selectedIds, setSelectedIds] = useCloudState(uid, "selectedIds", recipes.map((r) => r.id));
  const [inventory, setInventory] = useCloudState(uid, "inventory", {});

  /* ── AUTH SCREENS ── */
  if (authLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center",
        height: "100vh", background: "#111", color: "#fff", fontFamily: "'Inter', sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <img src="/apple-touch-icon.png" alt="Recipe Book" style={{ width: "90px", height: "90px", borderRadius: "20px", marginBottom: "16px", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }} />
          <div style={{ color: "#888" }}>Loading…</div>
        </div>
      </div>
    );
  }

  if (!user && !isGuest) {
    return (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center",
        alignItems: "center", height: "100vh", background: "#111", color: "#fff",
        fontFamily: "'Inter', sans-serif", gap: "20px", padding: "32px", textAlign: "center" }}>
        <img src="/apple-touch-icon.png" alt="Recipe Book" style={{ width: "110px", height: "110px", borderRadius: "24px", boxShadow: "0 6px 28px rgba(0,0,0,0.5)" }} />
        <div>
          <div style={{ fontSize: "26px", fontWeight: "700", marginBottom: "8px" }}>Mitch's Recipe Book</div>
          <div style={{ color: "#888", fontSize: "15px" }}>Sign in to sync your pantry across all your devices.</div>
        </div>
        <button
          onClick={() => signInWithPopup(auth, provider)}
          style={{ background: "#fff", color: "#111", border: "none", borderRadius: "10px",
            padding: "14px 28px", fontSize: "16px", fontWeight: "600", cursor: "pointer",
            display: "flex", alignItems: "center", gap: "10px" }}>
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Sign in with Google
        </button>
        <button
          onClick={() => setIsGuest(true)}
          style={{ background: "transparent", color: "#888", border: "1px solid #444",
            borderRadius: "10px", padding: "12px 28px", fontSize: "15px", cursor: "pointer" }}>
          Continue as Guest
        </button>
        <div style={{ color: "#555", fontSize: "12px", maxWidth: "280px" }}>
          Guest mode saves your pantry on this device only.
        </div>
      </div>
    );
  }

  const getStock = (item) => inventory[item] || 0;
  const setStock = (item, level) => setInventory((p) => ({ ...p, [item]: level }));
  const grouped = buildGrouped(selectedIds);
  const displayServings = customServings ?? (selectedRecipe?.servings ?? 1);
  const scaleFactor = selectedRecipe ? displayServings / selectedRecipe.servings : 1;

  const handleShare = async () => {
    const text = formatForShare(selectedIds, grouped, inventory);
    if (navigator.share) {
      try { await navigator.share({ title: "Mitch's Grocery List", text }); return; } catch {}
    }
    try { await navigator.clipboard.writeText(text); }
    catch {
      const el = document.createElement("textarea");
      el.value = text; document.body.appendChild(el); el.select();
      document.execCommand("copy"); document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const navItems = [
    { id: "home",     label: "🍽 Recipes",     emoji: "🍽", short: "Recipes"  },
    { id: "shopping", label: "🛒 Shopping",    emoji: "🛒", short: "Shopping" },
    { id: "pantry",   label: "🥫 Pantry",      emoji: "🥫", short: "Pantry"   },
    { id: "spices",   label: "🌶 Spice Blends", emoji: "🌶", short: "Spices"   },
  ];

  const navigate = (id) => { setView(id); setSelectedRecipe(null); setSelectedBlend(null); };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "#f5f2ec", minHeight: "100vh" }}>

      {/* ── TOP NAV ── */}
      <div style={{
        background: "#1a1a1a", color: "white",
        paddingTop: isMobile ? "calc(12px + env(safe-area-inset-top))" : "14px",
        paddingBottom: isMobile ? "12px" : "14px",
        paddingLeft: isMobile ? "16px" : "24px",
        paddingRight: isMobile ? "16px" : "24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: isMobile ? "22px" : "26px" }}>📖</span>
          <div>
            <div style={{ fontSize: isMobile ? "15px" : "18px", fontWeight: "700" }}>Mitch's Recipe Book</div>
            {!isMobile && <div style={{ fontSize: "11px", color: "#777" }}>10 High-Protein Meals · 4 Custom Spice Blends</div>}
          </div>
        </div>
        {/* Desktop nav buttons + sign-out */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {!isMobile && navItems.map((n) => (
            <button key={n.id} onClick={() => navigate(n.id)} style={{
              padding: "7px 14px", borderRadius: "20px", border: "none", cursor: "pointer",
              background: view === n.id ? "white" : "transparent",
              color: view === n.id ? "#1a1a1a" : "#aaa",
              fontWeight: view === n.id ? "600" : "400", fontSize: "13px",
            }}>{n.label}</button>
          ))}
          <button
            onClick={() => { if (user) signOut(auth); setIsGuest(false); }}
            title={user ? `Signed in as ${user.email}` : "Guest mode"}
            style={{ marginLeft: isMobile ? "0" : "8px", background: "transparent", border: "1px solid #444",
              borderRadius: "20px", color: "#aaa", fontSize: "11px", padding: "5px 10px",
              cursor: "pointer", whiteSpace: "nowrap" }}>
            {isMobile ? "↪" : (user ? "Sign out" : "Sign in")}
          </button>
        </div>
      </div>

      {/* ── SCROLLABLE CONTENT ── */}
      <div style={{ paddingBottom: isMobile ? "72px" : "0" }}>

        {/* ─── RECIPES VIEW ─── */}
        {view === "home" && !selectedRecipe && (
          <div style={{ maxWidth: "1100px", margin: "0 auto", padding: isMobile ? "16px 12px" : "28px 24px" }}>
            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: isMobile ? "10px" : "14px", marginBottom: isMobile ? "16px" : "28px" }}>
              {[
                { label: "Recipes", value: "10", icon: "📋" },
                { label: "Avg Protein / Serving", value: "54g", icon: "💪" },
                { label: "Avg Cost / Serving", value: "~$4.70", icon: "💰" },
                { label: "Custom Spice Blends", value: "4", icon: "🌶" },
              ].map((s) => (
                <div key={s.label} style={{ background: "white", borderRadius: "12px", padding: isMobile ? "14px" : "18px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                  <div style={{ fontSize: isMobile ? "18px" : "22px", marginBottom: "4px" }}>{s.icon}</div>
                  <div style={{ fontSize: isMobile ? "18px" : "22px", fontWeight: "700", color: "#1a1a1a" }}>{s.value}</div>
                  <div style={{ fontSize: "10px", color: "#888", marginTop: "2px" }}>{s.label}</div>
                </div>
              ))}
            </div>
            {/* Recipe Cards */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(310px,1fr))", gap: isMobile ? "12px" : "18px" }}>
              {recipes.map((r) => (
                <div key={r.id} onClick={() => setSelectedRecipe(r)} style={{
                  background: "white", borderRadius: "16px", overflow: "hidden",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.07)", cursor: "pointer",
                  transition: "transform 0.15s, box-shadow 0.15s",
                }}
                  onMouseEnter={(e) => { if (!isMobile) { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)"; }}}
                  onMouseLeave={(e) => { if (!isMobile) { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.07)"; }}}
                >
                  <div style={{ background: r.color, padding: isMobile ? "18px 16px 14px" : "24px 20px 18px", color: "white", position: "relative" }}>
                    <div style={{ position: "absolute", top: "10px", right: "10px", background: "white", color: r.color, fontSize: "10px", fontWeight: "700", padding: "3px 8px", borderRadius: "20px" }}>{r.servings} servings</div>
                    <div style={{ fontSize: isMobile ? "26px" : "32px", marginBottom: "4px" }}>{r.emoji}</div>
                    <div style={{ fontSize: "10px", fontWeight: "600", opacity: 0.8, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "3px" }}>{r.tag}</div>
                    <div style={{ fontSize: isMobile ? "17px" : "20px", fontWeight: "700" }}>{r.name}</div>
                    <div style={{ fontSize: "11px", opacity: 0.85, marginTop: "4px" }}>🕐 {r.prepTime} prep · {r.cookTime} cook</div>
                  </div>
                  <div style={{ padding: isMobile ? "12px 16px 14px" : "14px 20px 18px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "5px", marginBottom: "10px" }}>
                      {[
                        { label: "Protein", val: `${r.macros.protein}g`, highlight: true },
                        { label: "Carbs", val: `${r.macros.carbs}g` },
                        { label: "Fat", val: `${r.macros.fat}g` },
                        { label: "Cal", val: r.macros.calories },
                      ].map((m) => (
                        <div key={m.label} style={{ textAlign: "center", padding: "6px 2px", borderRadius: "8px", background: m.highlight ? "#fff3e0" : "#f5f5f5" }}>
                          <div style={{ fontSize: "13px", fontWeight: "700", color: m.highlight ? "#e67e22" : "#333" }}>{m.val}</div>
                          <div style={{ fontSize: "10px", color: "#999" }}>{m.label}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "11px", color: "#666" }}>{r.estimatedCost.split("/")[1]?.trim()}</span>
                      <span style={{ fontSize: "10px", background: "#f0f0f0", color: "#555", padding: "3px 7px", borderRadius: "10px" }}>🌶 {r.spiceBlend}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── RECIPE DETAIL ─── */}
        {view === "home" && selectedRecipe && (
          <div style={{ maxWidth: "820px", margin: "0 auto", padding: isMobile ? "16px 12px" : "28px 24px" }}>
            <button onClick={() => setSelectedRecipe(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#666", fontSize: "14px", marginBottom: "16px", padding: 0 }}>
              ← Back to recipes
            </button>
            <div style={{ background: selectedRecipe.color, borderRadius: "16px", padding: isMobile ? "20px 16px" : "28px", color: "white", marginBottom: "16px" }}>
              <div style={{ fontSize: isMobile ? "34px" : "42px", marginBottom: "8px" }}>{selectedRecipe.emoji}</div>
              <div style={{ fontSize: "10px", fontWeight: "600", opacity: 0.8, textTransform: "uppercase", letterSpacing: "1px" }}>{selectedRecipe.tag}</div>
              <div style={{ fontSize: isMobile ? "22px" : "28px", fontWeight: "700", marginTop: "4px" }}>{selectedRecipe.name}</div>
              <div style={{ marginTop: "8px", opacity: 0.85, fontSize: "12px" }}>
                🕐 {selectedRecipe.prepTime} prep · {selectedRecipe.cookTime} cook · {selectedRecipe.servings} servings · {selectedRecipe.estimatedCost.split("/")[0]}
              </div>
              <div style={{ marginTop: "8px" }}>
                <span onClick={() => { setView("spices"); setSelectedBlend(spiceBlends.find((b) => b.name === selectedRecipe.spiceBlend)); }}
                  style={{ fontSize: "11px", background: "rgba(255,255,255,0.2)", padding: "4px 10px", borderRadius: "10px", cursor: "pointer" }}>
                  🌶 Uses {selectedRecipe.spiceBlend} →
                </span>
              </div>
            </div>

            {/* Servings slider */}
            <div style={{ background: "white", borderRadius: "12px", padding: "14px 18px", marginBottom: "14px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: "14px" }}>
              <span style={{ fontSize: "13px", fontWeight: "600", color: "#555", whiteSpace: "nowrap" }}>👥 Servings</span>
              <input
                type="range" min="1" max="8" value={displayServings}
                onChange={(e) => setCustomServings(Number(e.target.value))}
                style={{ flex: 1, accentColor: selectedRecipe.color, cursor: "pointer" }}
              />
              <div style={{ minWidth: "28px", textAlign: "center", fontSize: "18px", fontWeight: "700", color: selectedRecipe.color }}>{displayServings}</div>
              {customServings !== null && (
                <button onClick={() => setCustomServings(null)} style={{ fontSize: "11px", color: "#aaa", background: "none", border: "1px solid #ddd", borderRadius: "8px", padding: "3px 8px", cursor: "pointer", whiteSpace: "nowrap" }}>
                  Reset
                </button>
              )}
            </div>

            {/* Macros */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: "8px", marginBottom: "16px" }}>
              {[
                { label: "Protein", val: `${selectedRecipe.macros.protein}g`, color: "#e67e22", bg: "#fff3e0" },
                { label: "Carbs", val: `${selectedRecipe.macros.carbs}g`, color: "#2980b9", bg: "#e3f2fd" },
                { label: "Fat", val: `${selectedRecipe.macros.fat}g`, color: "#27ae60", bg: "#e8f5e9" },
                { label: "Calories", val: selectedRecipe.macros.calories, color: "#8e44ad", bg: "#f3e5f5" },
              ].map((m) => (
                <div key={m.label} style={{ background: m.bg, borderRadius: "10px", padding: "12px", textAlign: "center" }}>
                  <div style={{ fontSize: isMobile ? "18px" : "22px", fontWeight: "700", color: m.color }}>{m.val}</div>
                  <div style={{ fontSize: "10px", color: "#777", marginTop: "2px" }}>{m.label} / serving</div>
                </div>
              ))}
            </div>

            {/* Ingredients + Steps — stacked on mobile */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "16px" }}>
              <div style={{ background: "white", borderRadius: "12px", padding: "18px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <div style={{ fontSize: "14px", fontWeight: "700", marginBottom: "12px" }}>🛒 Ingredients</div>
                {selectedRecipe.ingredients.map((ing, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: i < selectedRecipe.ingredients.length - 1 ? "1px solid #f5f5f5" : "none" }}>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: "500", color: "#333" }}>{ing.item}</div>
                      <div style={{ fontSize: "11px", color: "#aaa" }}>{scaleAmount(ing.amount, scaleFactor)}</div>
                    </div>
                    <div style={{ fontSize: "12px", color: "#666" }}>{ing.cost}</div>
                  </div>
                ))}
              </div>

              <div>
                <div style={{ background: "white", borderRadius: "12px", padding: "18px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: "12px" }}>
                  <div style={{ fontSize: "14px", fontWeight: "700", marginBottom: "12px" }}>👨‍🍳 Instructions</div>
                  {selectedRecipe.steps.map((step, i) => (
                    <div key={i} style={{ background: "white", borderRadius: "12px", padding: isMobile ? "14px 16px" : "16px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                      <div style={{ fontWeight: "700", fontSize: isMobile ? "13px" : "14px", color: "#1a1a1a", marginBottom: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ background: selectedRecipe.color, color: "white", borderRadius: "50%", width: "22px", height: "22px", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "700", flexShrink: 0 }}>{i + 1}</span>
                        {step.title}
                      </div>
                      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
                        {step.instructions.map((inst, j) => {
                          const isTip = inst.startsWith("(TIP:") || inst.startsWith("(NOTE:");
                          return (
                            <li key={j} style={{ fontSize: isMobile ? "13px" : "14px", color: isTip ? "#92400e" : "#444", lineHeight: "1.55", display: "flex", gap: "8px", background: isTip ? "#fef3c7" : "transparent", borderRadius: isTip ? "6px" : "0", padding: isTip ? "6px 8px" : "0", fontStyle: isTip ? "italic" : "normal" }}>
                              {!isTip && <span style={{ color: selectedRecipe.color, fontWeight: "700", flexShrink: 0, marginTop: "1px" }}>•</span>}
                              <span>{scaleInstructionText(inst, scaleFactor)}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
                <div style={{ background: "#e8f5e9", borderRadius: "10px", padding: "14px", marginBottom: "10px" }}>
                  <div style={{ fontSize: "12px", fontWeight: "700", color: "#2e7d32", marginBottom: "5px" }}>💡 Tip</div>
                  <div style={{ fontSize: "12px", color: "#388e3c", lineHeight: "1.5" }}>{selectedRecipe.prepTip}</div>
                </div>
                <div style={{ background: "#fff8e1", borderRadius: "10px", padding: "14px" }}>
                  <div style={{ fontSize: "12px", fontWeight: "700", color: "#f57f17", marginBottom: "5px" }}>✨ vs. HelloFresh</div>
                  <div style={{ fontSize: "12px", color: "#f9a825", lineHeight: "1.5" }}>{selectedRecipe.helloFreshNote}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── SHOPPING LIST ─── */}
        {view === "shopping" && (
          <div style={{ maxWidth: "800px", margin: "0 auto", padding: isMobile ? "16px 12px" : "28px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <div style={{ fontSize: isMobile ? "18px" : "22px", fontWeight: "700" }}>🛒 Weekly Plan</div>
                <div style={{ fontSize: "12px", color: "#666", marginTop: "3px" }}>Pick your meals — duplicate ingredients auto-combine</div>
              </div>
              <button onClick={handleShare} style={{
                padding: isMobile ? "8px 14px" : "10px 20px", borderRadius: "10px", border: "none", cursor: "pointer",
                background: copied ? "#27ae60" : "#1a1a1a", color: "white",
                fontWeight: "600", fontSize: isMobile ? "12px" : "14px", transition: "background 0.2s", flexShrink: 0,
              }}>
                {copied ? "✓ Copied!" : "📤 Share"}
              </button>
            </div>

            {/* Recipe toggles */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "7px", marginBottom: "16px" }}>
              {recipes.map((r) => (
                <button key={r.id}
                  onClick={() => setSelectedIds((p) => p.includes(r.id) ? p.filter((x) => x !== r.id) : [...p, r.id])}
                  style={{
                    padding: isMobile ? "6px 10px" : "7px 14px", borderRadius: "20px",
                    border: `2px solid ${selectedIds.includes(r.id) ? r.color : "#ddd"}`,
                    background: selectedIds.includes(r.id) ? r.color : "white",
                    color: selectedIds.includes(r.id) ? "white" : "#666",
                    cursor: "pointer", fontWeight: "600", fontSize: isMobile ? "11px" : "12px",
                  }}>
                  {r.emoji} {r.name}
                </button>
              ))}
            </div>

            {/* Summary bar */}
            {(() => {
              const selRecipes = recipes.filter((r) => selectedIds.includes(r.id));
              const totalServings = selRecipes.reduce((a, r) => a + r.servings, 0);
              const totalProtein = selRecipes.reduce((a, r) => a + r.macros.protein * r.servings, 0);
              const daysCovered = Math.round(totalServings / 2);
              return (
                <div style={{ background: "#1a1a1a", borderRadius: "12px", padding: "14px 16px", marginBottom: "16px", display: "flex", justifyContent: "space-around" }}>
                  {[
                    { val: selectedIds.length, label: "meals", color: "#3498db" },
                    { val: totalServings, label: `~${daysCovered} days`, color: "#f39c12" },
                    { val: `${totalProtein}g`, label: "protein", color: "#2ecc71" },
                  ].map((s) => (
                    <div key={s.label} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: isMobile ? "20px" : "24px", fontWeight: "700", color: s.color }}>{s.val}</div>
                      <div style={{ fontSize: "10px", color: "#777", marginTop: "1px" }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Ingredient list */}
            {Object.entries(CATS).map(([cat, { label, icon }]) => {
              const items = grouped[cat];
              if (!items || items.length === 0) return null;
              return (
                <div key={cat} style={{ background: "white", borderRadius: "12px", padding: isMobile ? "14px" : "18px 20px", marginBottom: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                  <div style={{ fontSize: "13px", fontWeight: "700", marginBottom: "10px", color: "#333" }}>{icon} {label}</div>
                  {items.map((ing, i) => {
                    const stock = getStock(ing.item);
                    const inPantry = stock >= 2;
                    const lowStock = stock === 1;
                    const isDone = inPantry || !!checked[ing.item];
                    return (
                      <div key={i} onClick={() => !inPantry && setChecked((p) => ({ ...p, [ing.item]: !p[ing.item] }))}
                        style={{
                          display: "flex", alignItems: "center", gap: "10px",
                          padding: "9px 6px", marginBottom: "1px",
                          borderBottom: i < items.length - 1 ? "1px solid #f8f8f8" : "none",
                          cursor: inPantry ? "default" : "pointer",
                          opacity: isDone ? 0.45 : 1,
                          background: inPantry ? "#f0fff4" : "transparent",
                          borderRadius: "8px",
                        }}>
                        <div style={{ width: "18px", height: "18px", borderRadius: "4px", border: `2px solid ${isDone ? "#27ae60" : lowStock ? "#f39c12" : "#ddd"}`, background: isDone ? "#27ae60" : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {isDone && <span style={{ color: "white", fontSize: "11px" }}>✓</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "13px", fontWeight: "500", color: "#333", textDecoration: isDone ? "line-through" : "none" }}>{ing.item}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "2px", flexWrap: "wrap" }}>
                            <span style={{ fontSize: "11px", fontWeight: ing.combined ? "700" : "400", color: ing.combined ? "#e67e22" : "#aaa" }}>{ing.amount}</span>
                            {ing.combined && <span style={{ fontSize: "9px", background: "#fff3e0", color: "#e67e22", padding: "1px 5px", borderRadius: "8px", fontWeight: "600" }}>×{ing.inRecipes.length}</span>}
                            {inPantry && <span style={{ fontSize: "9px", background: "#e8f5e9", color: "#2e7d32", padding: "1px 5px", borderRadius: "8px", fontWeight: "600" }}>🥫 pantry</span>}
                            {lowStock && <span style={{ fontSize: "9px", background: "#fff3e0", color: "#e65100", padding: "1px 5px", borderRadius: "8px", fontWeight: "600" }}>⚠ low</span>}
                          </div>
                        </div>
                        <div style={{ fontSize: "11px", color: "#888", flexShrink: 0 }}>{inPantry ? "—" : ing.cost}</div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
            <div style={{ textAlign: "center", padding: "10px" }}>
              <button onClick={() => setChecked({})} style={{ fontSize: "12px", color: "#aaa", background: "none", border: "none", cursor: "pointer" }}>Clear all checks</button>
            </div>
          </div>
        )}

        {/* ─── PANTRY VIEW ─── */}
        {view === "pantry" && (() => {
          const allIng = getAllIngredients();
          const stockedCount = Object.values(inventory).filter((v) => v >= 2).length;
          return (
            <div style={{ maxWidth: "820px", margin: "0 auto", padding: isMobile ? "16px 12px" : "28px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                <div>
                  <div style={{ fontSize: isMobile ? "18px" : "22px", fontWeight: "700" }}>🥫 Pantry & Inventory</div>
                  <div style={{ fontSize: "12px", color: "#666", marginTop: "3px" }}>Half or above = auto-checked on shopping list</div>
                </div>
                {stockedCount > 0 && (
                  <div style={{ background: "#e8f5e9", borderRadius: "10px", padding: "8px 14px", textAlign: "center", flexShrink: 0 }}>
                    <div style={{ fontSize: "18px", fontWeight: "700", color: "#27ae60" }}>{stockedCount}</div>
                    <div style={{ fontSize: "10px", color: "#2e7d32" }}>stocked</div>
                  </div>
                )}
              </div>

              {/* Legend */}
              <div style={{ background: "white", borderRadius: "12px", padding: "14px 16px", marginBottom: "16px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#555", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Stock levels</div>
                <div style={{ display: "flex", gap: isMobile ? "12px" : "20px", flexWrap: "wrap" }}>
                  {[0, 1, 2, 3, 4].map((level) => (
                    <div key={level} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <div style={{ display: "flex", gap: "2px" }}>
                        {[1, 2, 3, 4].map((seg) => (
                          <div key={seg} style={{ width: isMobile ? "12px" : "16px", height: "8px", borderRadius: "3px", background: seg <= level ? STOCK_COLORS[level] : "#e8e8e8" }} />
                        ))}
                      </div>
                      <span style={{ fontSize: "11px", fontWeight: "600", color: level >= 2 ? STOCK_COLORS[level] : "#999" }}>{STOCK_SHORT[level]}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ingredient groups */}
              {Object.entries(CATS).map(([cat, { label, icon }]) => {
                const items = allIng[cat];
                if (!items || items.length === 0) return null;
                return (
                  <div key={cat} style={{ background: "white", borderRadius: "12px", padding: isMobile ? "14px" : "18px 20px", marginBottom: "12px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                    <div style={{ fontSize: "13px", fontWeight: "700", marginBottom: "12px", color: "#333" }}>{icon} {label}</div>
                    {items.map((ing, i) => {
                      const level = getStock(ing.item);
                      const color = STOCK_COLORS[level];
                      const inPantry = level >= 2;
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 0", borderBottom: i < items.length - 1 ? "1px solid #f5f5f5" : "none" }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: "13px", fontWeight: "500", color: "#333" }}>{ing.item}</div>
                            <div style={{ fontSize: "10px", color: inPantry ? "#27ae60" : "#bbb", marginTop: "1px" }}>
                              {inPantry ? "✓ Auto-checks on shopping list" : "Will appear on shopping list"}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                            <span style={{ fontSize: "10px", fontWeight: "700", color, minWidth: "30px", textAlign: "right" }}>{STOCK_SHORT[level]}</span>
                            <div style={{ display: "flex", gap: "4px" }}>
                              {[1, 2, 3, 4].map((seg) => (
                                <div key={seg}
                                  onClick={() => setStock(ing.item, seg === level ? 0 : seg)}
                                  style={{
                                    width: isMobile ? "26px" : "32px", height: "16px", borderRadius: "5px",
                                    background: seg <= level ? color : "#ebebeb",
                                    cursor: "pointer", transition: "background 0.12s",
                                  }} />
                              ))}
                            </div>
                            <button onClick={() => setStock(ing.item, 0)} style={{ fontSize: "11px", color: "#ccc", background: "none", border: "none", cursor: "pointer", padding: "0 2px" }}>✕</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              <div style={{ background: "#fff8e1", borderRadius: "12px", padding: "14px 16px" }}>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#f57f17", marginBottom: "5px" }}>💡 How to use this</div>
                <div style={{ fontSize: "12px", color: "#795548", lineHeight: "1.6" }}>
                  Each Monday before shopping, update the stock bars. Anything at <strong>Half, Good, or Full</strong> auto-checks on your shopping list and gets excluded from the shared grocery list.
                </div>
              </div>
            </div>
          );
        })()}

        {/* ─── SPICE BLENDS VIEW ─── */}
        {view === "spices" && !selectedBlend && (
          <div style={{ maxWidth: "900px", margin: "0 auto", padding: isMobile ? "16px 12px" : "28px 24px" }}>
            <div style={{ fontSize: isMobile ? "18px" : "22px", fontWeight: "700", marginBottom: "4px" }}>🌶 Custom Spice Blends</div>
            <div style={{ fontSize: "12px", color: "#666", marginBottom: "18px" }}>The exact HelloFresh flavours — yours to keep forever.</div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(400px,1fr))", gap: "14px" }}>
              {spiceBlends.map((blend) => (
                <div key={blend.id} onClick={() => setSelectedBlend(blend)}
                  style={{ background: "white", borderRadius: "14px", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", cursor: "pointer" }}>
                  <div style={{ background: blend.color, padding: isMobile ? "16px" : "20px", color: "white" }}>
                    <div style={{ fontSize: "26px", marginBottom: "4px" }}>{blend.emoji}</div>
                    <div style={{ fontSize: "10px", fontWeight: "600", opacity: 0.8, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "2px" }}>{blend.tagline}</div>
                    <div style={{ fontSize: isMobile ? "17px" : "20px", fontWeight: "700" }}>{blend.name}</div>
                  </div>
                  <div style={{ padding: "14px 16px" }}>
                    <div style={{ fontSize: "12px", color: "#555", lineHeight: "1.5", marginBottom: "10px" }}>{blend.description}</div>
                    <div style={{ fontSize: "11px", color: "#888", marginBottom: "6px" }}>Used in:</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                      {blend.usedIn.map((r) => (
                        <span key={r} style={{ fontSize: "11px", background: "#f0f0f0", color: "#555", padding: "3px 8px", borderRadius: "8px" }}>{r}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: "#fff8e1", borderRadius: "12px", padding: "16px", marginTop: "16px" }}>
              <div style={{ fontSize: "13px", fontWeight: "700", color: "#f57f17", marginBottom: "6px" }}>💡 The Bulk Strategy</div>
              <div style={{ fontSize: "12px", color: "#795548", lineHeight: "1.6" }}>
                Spend one hour sourcing these spices in bulk (Bulk Barn, Costco, or Amazon) and you'll spend about $30–40 to fill all 4 jars.
                That covers 6+ months of cooking. A HelloFresh spice packet costs roughly $2–3 per meal — these jars pay for themselves in your first week.
              </div>
            </div>
          </div>
        )}

        {/* ─── BLEND DETAIL ─── */}
        {view === "spices" && selectedBlend && (
          <div style={{ maxWidth: "700px", margin: "0 auto", padding: isMobile ? "16px 12px" : "28px 24px" }}>
            <button onClick={() => setSelectedBlend(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#666", fontSize: "14px", marginBottom: "16px", padding: 0 }}>
              ← Back to blends
            </button>
            <div style={{ background: selectedBlend.color, borderRadius: "16px", padding: isMobile ? "20px 16px" : "28px", color: "white", marginBottom: "16px" }}>
              <div style={{ fontSize: "34px", marginBottom: "6px" }}>{selectedBlend.emoji}</div>
              <div style={{ fontSize: "10px", fontWeight: "600", opacity: 0.8, textTransform: "uppercase", letterSpacing: "1px" }}>{selectedBlend.tagline}</div>
              <div style={{ fontSize: isMobile ? "20px" : "26px", fontWeight: "700", marginTop: "4px" }}>{selectedBlend.name}</div>
            </div>
            <div style={{ background: "white", borderRadius: "12px", padding: isMobile ? "16px" : "24px", marginBottom: "14px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div style={{ fontSize: "15px", fontWeight: "700" }}>Recipe</div>
                <div style={{ display: "flex", gap: "6px" }}>
                  {["single", "bulk"].map((m) => (
                    <button key={m} onClick={() => setBlendMode(m)} style={{
                      padding: "6px 12px", borderRadius: "16px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: "600",
                      background: blendMode === m ? selectedBlend.color : "#f0f0f0",
                      color: blendMode === m ? "white" : "#555",
                    }}>
                      {m === "single" ? "Single Use" : "🫙 Bulk Jar"}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ background: "#f9f9f9", borderRadius: "10px", padding: "14px" }}>
                {selectedBlend.ratio.map((row, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: i < selectedBlend.ratio.length - 1 ? "1px solid #efefef" : "none" }}>
                    <div style={{ fontSize: "13px", color: "#333" }}>{row.spice}</div>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: selectedBlend.color }}>{blendMode === "single" ? row.single : row.bulk}</div>
                  </div>
                ))}
              </div>
              {blendMode === "bulk" && (
                <div style={{ marginTop: "12px", background: "#fff8e1", borderRadius: "8px", padding: "12px" }}>
                  <div style={{ fontSize: "12px", color: "#795548", lineHeight: "1.55" }}>🫙 {selectedBlend.bulkNote}</div>
                </div>
              )}
            </div>
            <div style={{ background: "white", borderRadius: "12px", padding: "16px", marginBottom: "12px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: "13px", fontWeight: "700", color: "#333", marginBottom: "6px" }}>📍 Where to Buy</div>
              <div style={{ fontSize: "13px", color: "#555", lineHeight: "1.6" }}>{selectedBlend.whereToBuy}</div>
            </div>
            <div style={{ background: "#f0f0f0", borderRadius: "12px", padding: "14px" }}>
              <div style={{ fontSize: "13px", fontWeight: "700", marginBottom: "8px" }}>Used in these recipes</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {selectedBlend.usedIn.map((r) => {
                  const recipe = recipes.find((rec) => rec.name === r);
                  return (
                    <span key={r}
                      onClick={() => { if (recipe) { setView("home"); setSelectedRecipe(recipe); setSelectedBlend(null); } }}
                      style={{ fontSize: "12px", background: recipe ? recipe.color : "#999", color: "white", padding: "5px 12px", borderRadius: "10px", cursor: "pointer" }}>
                      {recipe?.emoji} {r}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── MOBILE BOTTOM NAV ── */}
      {isMobile && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: "#1a1a1a", display: "flex",
          borderTop: "1px solid #2a2a2a", zIndex: 100,
          paddingBottom: "env(safe-area-inset-bottom)",
        }}>
          {navItems.map((n) => (
            <button key={n.id} onClick={() => navigate(n.id)} style={{
              flex: 1, padding: "10px 4px 8px", background: "transparent", border: "none",
              display: "flex", flexDirection: "column", alignItems: "center", gap: "3px",
              cursor: "pointer",
            }}>
              <span style={{ fontSize: "20px", lineHeight: 1 }}>{n.emoji}</span>
              <span style={{ fontSize: "10px", fontWeight: view === n.id ? "700" : "400", color: view === n.id ? "white" : "#666" }}>{n.short}</span>
              {view === n.id && <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: "white", marginTop: "1px" }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
