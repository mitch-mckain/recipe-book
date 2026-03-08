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
    servings: 5,
    prepTime: "10 min",
    cookTime: "25 min",
    macros: { protein: 55, carbs: 30, fat: 10, calories: 435 },
    spiceBlend: "Tex Mex Blend",
    ingredients: [
      { item: "Lean ground turkey (99% lean)", amount: "700g", cost: "$8.50", cat: "protein" },
      { item: "Black beans (canned, drained)", amount: "2 cans (480g)", cost: "$2.50", cat: "pantry" },
      { item: "Jasmine rice", amount: "300g dry", cost: "$1.50", cat: "grains" },
      { item: "Diced tomatoes (canned)", amount: "1 can", cost: "$1.50", cat: "pantry" },
      { item: "Bell pepper (diced)", amount: "2 peppers", cost: "$2.00", cat: "produce" },
      { item: "Onion (diced)", amount: "1 large", cost: "$0.80", cat: "produce" },
      { item: "Lime", amount: "2 limes", cost: "$0.80", cat: "produce" },
      { item: "Greek yogurt (plain)", amount: "for topping", cost: "$1.50", cat: "protein" },
      { item: "Tex Mex Blend", amount: "2 tbsp", cost: "from jar", cat: "spice" },
    ],
    steps: [
      "Dice onion and bell peppers. Sauté in a large skillet with a splash of oil over medium heat for 5 minutes.",
      "Add ground turkey. Break apart and cook until browned (~8 min).",
      "Add Tex Mex Blend and canned tomatoes. Stir to combine and simmer 5 minutes.",
      "Stir in drained black beans. Cook 3 more minutes until heated through.",
      "Cook jasmine rice per package instructions. Season with a squeeze of lime.",
      "Portion into 5 containers: rice base, turkey taco mix on top. Serve with Greek yogurt instead of sour cream.",
    ],
    prepTip: "Stores 5 days in fridge. Add sliced avocado fresh when eating. Greek yogurt is a swap for sour cream that adds ~6g protein per dollop.",
    helloFreshNote: "HelloFresh's taco bowls use small portions and a premixed packet. Jasmine rice keeps it satisfying and your own Tex Mex Blend gives you full control over the flavour and heat level.",
    estimatedCost: "$19.10 total / ~$3.82 per serving",
  },
  {
    id: 2,
    name: "Mexican Turkey Chili",
    tag: "Mexican · One-Pot",
    emoji: "🫕",
    color: "#c0392b",
    servings: 6,
    prepTime: "10 min",
    cookTime: "35 min",
    macros: { protein: 54, carbs: 36, fat: 8, calories: 435 },
    spiceBlend: "Tex Mex Blend",
    ingredients: [
      { item: "Lean ground turkey (99% lean)", amount: "700g", cost: "$8.50", cat: "protein" },
      { item: "Black beans (canned, drained)", amount: "2 cans (480g)", cost: "$2.50", cat: "pantry" },
      { item: "Kidney beans (canned, drained)", amount: "1 can (240g)", cost: "$1.25", cat: "pantry" },
      { item: "Diced tomatoes (canned)", amount: "2 cans", cost: "$3.00", cat: "pantry" },
      { item: "Frozen corn", amount: "200g", cost: "$1.50", cat: "produce" },
      { item: "Chicken broth (low sodium)", amount: "500ml", cost: "$2.00", cat: "pantry" },
      { item: "Jalapeño (diced)", amount: "1–2 peppers", cost: "$0.50", cat: "produce" },
      { item: "Bell pepper (diced)", amount: "2 peppers", cost: "$2.00", cat: "produce" },
      { item: "Onion (diced)", amount: "1 large", cost: "$0.80", cat: "produce" },
      { item: "Garlic (minced)", amount: "4 cloves", cost: "$0.30", cat: "produce" },
      { item: "Tex Mex Blend", amount: "3 tbsp", cost: "from jar", cat: "spice" },
      { item: "Greek yogurt (plain)", amount: "for topping", cost: "$1.50", cat: "protein" },
      { item: "Lime", amount: "2 limes", cost: "$0.80", cat: "produce" },
    ],
    steps: [
      "Sauté onion, bell pepper, and jalapeño in a large pot over medium-high heat for 5 minutes.",
      "Add garlic, cook 1 minute. Add ground turkey and break apart — cook until no pink remains (~8 min).",
      "Stir in Tex Mex Blend. Cook 1 minute until fragrant.",
      "Add diced tomatoes, chicken broth, black beans, and kidney beans. Stir well.",
      "Bring to a boil, then reduce to a low simmer. Cook uncovered for 20 minutes, stirring occasionally.",
      "Stir in frozen corn. Simmer 5 more minutes. Adjust seasoning with salt, lime juice, and extra cayenne.",
      "Serve topped with Greek yogurt, avocado (optional), and lime wedge.",
    ],
    prepTip: "This is arguably the best meal-prep recipe in the book. Make a huge batch — it freezes perfectly for up to 3 months. Gets better overnight as flavours develop.",
    helloFreshNote: "HelloFresh chilis are usually single-can bean portions with modest spice. Doubling the beans, using your own Tex Mex blend, and adding Greek yogurt instead of sour cream pushes this protein way higher.",
    estimatedCost: "$24.65 total / ~$4.11 per serving",
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
      "Make chipotle sauce: mix Greek yogurt, 1 tsp Smoky Chipotle Blend, squeeze of lime, pinch of salt. Refrigerate.",
      "Combine turkey, egg white, and remaining Chipotle Blend. Mix gently — turkey burgers get tough if overworked.",
      "Form into 4 equal patties (~175g each). Make a small thumb indent in the center of each to prevent puffing.",
      "Heat a cast iron skillet or grill pan over medium-high. Cook patties 5–6 min per side until internal temp reaches 74°C.",
      "Add cheese slice in last minute of cooking. Cover to melt.",
      "Toast buns cut-side down in the same pan for 1–2 min. Mash avocado with lime and salt.",
      "Assemble: chipotle yogurt sauce, lettuce, patty with cheese, avocado, tomato, red onion.",
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
    servings: 5,
    prepTime: "10 min",
    cookTime: "30 min",
    macros: { protein: 62, carbs: 48, fat: 12, calories: 560 },
    spiceBlend: "Italian Herb Blend",
    ingredients: [
      { item: "Lean ground beef (93/7)", amount: "600g", cost: "$8.00", cat: "protein" },
      { item: "Red lentil pasta", amount: "400g dry", cost: "$5.00", cat: "grains" },
      { item: "Greek yogurt (plain)", amount: "250g", cost: "$2.50", cat: "protein" },
      { item: "Marinara sauce (jarred)", amount: "700ml jar", cost: "$4.00", cat: "pantry" },
      { item: "Parmesan cheese (grated)", amount: "60g", cost: "$2.50", cat: "protein" },
      { item: "Garlic (minced)", amount: "4 cloves", cost: "$0.30", cat: "produce" },
      { item: "Onion (diced)", amount: "1 medium", cost: "$0.60", cat: "produce" },
      { item: "Spinach (fresh)", amount: "150g", cost: "$2.50", cat: "produce" },
      { item: "Italian Herb Blend", amount: "2 tbsp", cost: "from jar", cat: "spice" },
    ],
    steps: [
      "Measure out the Greek yogurt and set aside — add it off heat at the end so it doesn't curdle.",
      "Sauté onion in a large skillet over medium heat 5 min. Add garlic, cook 1 min.",
      "Add ground beef, break apart and brown well. Drain excess fat.",
      "Add Italian Herb Blend. Stir and cook 1 minute.",
      "Pour in marinara sauce. Simmer on low 15 minutes. Stir in spinach in last 2 minutes until wilted. Adjust salt.",
      "Remove from heat. Stir in Greek yogurt until fully incorporated — adding it off heat keeps it creamy and prevents curdling.",
      "Meanwhile cook red lentil pasta per package (usually 8–10 min). Drain, toss in sauce.",
      "Serve topped with grated parmesan.",
    ],
    prepTip: "Red lentil pasta has ~25g protein per 100g dry vs ~13g for regular pasta — that's your biggest protein lever here. Store sauce and pasta separately — pasta absorbs sauce overnight and gets mushy.",
    helloFreshNote: "HelloFresh pasta dishes are often the lowest-protein option on their menu. Red lentil pasta alone nearly doubles the protein of regular pasta. Greek yogurt stirred in off the heat keeps it creamy and adds extra protein without any heavy cream.",
    estimatedCost: "$26.40 total / ~$5.28 per serving",
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
      "Cook rice per package instructions. Set aside.",
      "In a large skillet over medium-high, brown ground beef breaking it apart. Drain excess fat.",
      "Add garlic, cook 1 minute until fragrant.",
      "Stir in Korean Umami Blend, gochujang, soy sauce, and sesame oil. Cook 2–3 min until sauce thickens and coats the beef.",
      "Microwave edamame per package directions.",
      "Assemble bowls: rice, Korean beef, edamame. Top with sliced green onions.",
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
      "Make tzatziki: combine Greek yogurt, grated & squeezed cucumber, 1 garlic clove, lemon juice, salt. Refrigerate.",
      "Mix ground beef with Italian Herb Blend, remaining garlic, salt, and pepper.",
      "Cook ground beef in a skillet over medium-high, breaking apart, until browned (~10 min).",
      "Warm pitas in a dry pan or oven at 180°C for 2–3 minutes.",
      "Load each pita: tzatziki spread, lamb, cherry tomatoes, red onion, crumbled feta.",
      "Wrap tightly and serve immediately.",
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
      "Mix soy sauce, oyster sauce, rice vinegar, and chili oil in a small bowl. Set aside.",
      "Heat wok or large skillet over high. Add pork, break apart, cook until browned (~7 min). Remove and set aside.",
      "Add garlic and Korean Umami Blend to the same wok. Stir fry 30 seconds.",
      "Add broccoli florets and cook 3–4 minutes until tender-crisp.",
      "Add udon noodles directly from package. Toss and heat through (~3 min).",
      "Push noodles aside, crack in eggs, scramble briefly, then fold everything together.",
      "Return pork to wok, pour over sauce, toss to coat. Top with green onions and extra chili oil.",
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
    servings: 5,
    prepTime: "10 min",
    cookTime: "30 min",
    macros: { protein: 58, carbs: 45, fat: 14, calories: 545 },
    spiceBlend: "Smoky Chipotle Blend",
    ingredients: [
      { item: "Lean ground beef (93/7)", amount: "700g", cost: "$9.00", cat: "protein" },
      { item: "Green or brown lentils (dry)", amount: "300g", cost: "$2.50", cat: "grains" },
      { item: "Potatoes (cubed)", amount: "600g", cost: "$2.00", cat: "produce" },
      { item: "Spinach (fresh or frozen)", amount: "200g", cost: "$2.50", cat: "produce" },
      { item: "Tahini", amount: "4 tbsp", cost: "$1.50", cat: "pantry" },
      { item: "Lemon", amount: "2 lemons", cost: "$1.00", cat: "produce" },
      { item: "Olive oil", amount: "2 tbsp", cost: "$0.50", cat: "pantry" },
      { item: "Smoky Chipotle Blend", amount: "2 tbsp", cost: "from jar", cat: "spice" },
    ],
    steps: [
      "Preheat oven to 200°C. Toss potato cubes with olive oil and 1 tbsp Chipotle Blend. Roast 25–30 min.",
      "Rinse lentils, simmer in 2x water with a pinch of salt for 20–25 min until tender. Drain.",
      "Brown ground beef in a skillet over medium-high. Season with remaining Chipotle Blend. Cook until no pink remains.",
      "Stir spinach into the beef during last 2 minutes until wilted.",
      "Make tahini drizzle: whisk tahini, lemon juice, 2 tbsp water, pinch of salt until smooth.",
      "Assemble bowls: lentils + beef & spinach + roasted sweet potato. Drizzle with tahini.",
    ],
    prepTip: "One of the best freezer-friendly meals in this book. Store components separately from tahini (drizzle fresh). Keeps 5 days refrigerated.",
    helloFreshNote: "The beef + lentil combo is rarely seen on HelloFresh but it's a protein powerhouse and significantly cheaper per gram than any single-protein dish.",
    estimatedCost: "$21.00 total / ~$4.20 per serving",
  },
  {
    id: 9,
    name: "Turkey Meatball Bake",
    tag: "Italian · Batch Cook",
    emoji: "🍝",
    color: "#c0392b",
    servings: 5,
    prepTime: "20 min",
    cookTime: "25 min",
    macros: { protein: 60, carbs: 28, fat: 10, calories: 440 },
    spiceBlend: "Italian Herb Blend",
    ingredients: [
      { item: "Lean ground turkey (99% lean)", amount: "800g", cost: "$9.50", cat: "protein" },
      { item: "Spaghetti", amount: "300g dry", cost: "$2.50", cat: "grains" },
      { item: "Marinara sauce (jarred)", amount: "700ml jar", cost: "$4.00", cat: "pantry" },
      { item: "Parmesan cheese (grated)", amount: "50g", cost: "$2.00", cat: "protein" },
      { item: "Egg whites", amount: "2 large", cost: "$0.60", cat: "protein" },
      { item: "Breadcrumbs", amount: "3 tbsp", cost: "$0.40", cat: "grains" },
      { item: "Garlic (minced)", amount: "4 cloves", cost: "$0.30", cat: "produce" },
      { item: "Fresh basil (optional)", amount: "handful", cost: "$1.00", cat: "produce" },
      { item: "Italian Herb Blend", amount: "2 tsp", cost: "from jar", cat: "spice" },
    ],
    steps: [
      "Preheat oven to 200°C. Line a baking sheet with parchment.",
      "Combine turkey, egg whites, parmesan, garlic, Italian Herb Blend, breadcrumbs, salt, and pepper. Mix gently.",
      "Roll into ~24 meatballs (~golf ball size). Place on baking sheet.",
      "Bake 20–22 minutes until internal temp hits 74°C and tops are lightly golden.",
      "Heat marinara in a large pot. Add cooked meatballs, simmer 5 minutes.",
      "Cook spaghetti per package instructions. Drain, toss with meatballs and sauce. Top with parmesan and fresh basil.",
    ],
    prepTip: "Meatballs freeze beautifully — make a double batch and freeze half. Store meatballs in sauce separately from the pasta so it doesn't absorb and go mushy overnight.",
    helloFreshNote: "HelloFresh meatball dishes often use fattier pork blends and smaller portions. Lean turkey + red lentil pasta (optional swap) gives you significantly more protein per serving.",
    estimatedCost: "$21.80 total / ~$4.36 per serving",
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
      "Pull the chicken apart by hand — shred both white and dark meat, discard skin and bones. You'll get ~500g of meat.",
      "Warm beans and corn together in a small pan or microwave. Season with a pinch of Tex Mex Blend.",
      "Lay a tortilla flat. On one half: spread shredded chicken, bean & corn mix, a handful of cheddar. Fold the tortilla over.",
      "Cook in a dry skillet over medium heat, 2–3 min per side, pressing down gently until golden and crispy.",
      "Mix Greek yogurt with a squeeze of lime and a tiny pinch of Tex Mex Blend for a chipotle dipping sauce.",
      "Slice quesadillas into wedges. Serve with dipping sauce, sliced avocado, and extra lime.",
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
                    <div key={i} style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                      <div style={{ minWidth: "22px", height: "22px", borderRadius: "50%", background: selectedRecipe.color, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "700", flexShrink: 0 }}>{i + 1}</div>
                      <div style={{ fontSize: "12px", color: "#444", lineHeight: "1.55", paddingTop: "3px" }}>{step}</div>
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
