# Zombie Overlord — Ad Destination Page · Build Spec

**For:** Claude Code
**Target file:** the existing Rising Warrior Games main page (`index.html` / `risingwarriorgames.com` homepage) and its CSS
**Approach:** Restructure + add against the live page. Do **not** rebuild from scratch. Reuse existing markup, styles, fonts, and image assets wherever possible.

---

## 1. Context & goal

This page becomes the single destination for the Meta retargeting ad (currently $5/day, audience = site visitors over the last 180 days). The old dedicated landing page (`zombieoverlord.html`) and the `latepledge.html` auto-redirect are being retired for this campaign — keep the files, just stop pointing ads/buttons at them.

Two goals, in priority order:

1. **Primary — capture email.** Late pledges close June 15; the email list does not. The list is the compounding asset (ZO2, future games, the con). Most of the retargeting pool is lukewarm and behaving cold, so the realistic win is the list, with pledges as the bonus.
2. **Secondary — late pledges.** Buyable *now*, deadline June 15, via BackerKit.

Design principle: **convince before selling.** The current pages leak ~80% of landing traffic because they sell before the visitor is convinced. This page leads with the game and the human, makes "buy" persistently available (never the early headline), and uses the email block as a mid/late-page net.

---

## 2. Final section order

1. Hero — flip hook + first buy CTA
2. The flip — the differentiator, up front
3. How it plays — the loop and the turn
4. See it — real photos + gameplay video
5. The creator — founder story (recut)
6. Late pledge — tiers, price, countdown
7. Join the horde — email capture (double-duty: deadline reminder + future games)
8. Footer — studio, BGG, socials

Plus a **persistent sticky buy-bar** across the whole page (see §3).

> Note on order: email sits *after* pledge here. That only works because the sticky buy-bar makes "buy" available everywhere, so sequencing no longer gates buyers. The email block must therefore pull double duty (see §4, section 7) — it is not a pure newsletter signup.

---

## 3. New components to build

### 3a. Hero buy CTA
A real, prominent buy button in the hero (not a soft "learn more"). Copy states buyability + deadline so no one assumes the campaign is over. Secondary scroll link beneath it.

### 3b. Sticky buy-bar
- Slim bar pinned to top, follows scroll across the entire page.
- Appears after the user scrolls past the hero (or always-on — implementer's call, but must be visible by the time the hero CTA scrolls off).
- Left text: `Zombie Overlord · late pledges close June 15`
- Right button: `Get yours` → links to BackerKit hosted preorders (`https://zombie-overlord.backerkit.com/hosted_preorders`).
- Must not overlap the main nav; collapse text to just the button on narrow mobile.
- Reason it exists: scroll-depth drops off a cliff past mid-page, and buy lives at section 6. The bar guarantees a buyer never has to hunt for the button, and frees the email block from carrying the "is this even for sale?" question.

---

## 4. Section-by-section build notes

### Section 1 — Hero  *(modify existing hero)*
Replace the current eyebrow/title/tagline/CTA block. Keep the existing title image and box art assets.

- **Eyebrow:** Rising Warrior Games presents — Zombie Overlord
- **Headline:** You don't survive the apocalypse. You run it.
  - *(Alt headline if preferred — mechanic-forward: "You're not surviving the horde. You're building it." Ship the first unless told otherwise.)*
- **Subhead:** A competitive deck-builder where you set the traps, lure the survivors in, and flip them into a horde you turn loose on your rivals. Last Overlord standing wins.
- **Scan line:** 2–4 players · 30–40 min · Ages 14+ · 194 cards
- **Primary button:** Get yours — late pledges close June 15  → BackerKit hosted preorders
- **Secondary link:** See how it plays ↓  (anchor-scrolls to section 3)
- **Do NOT** add a countdown clock here. Urgency lives at the bottom + in the buy-bar.

### Section 2 — The flip  *(new, short)*
A single punchy beat that answers "why another zombie game." One short paragraph, large type. Bridges hero → mechanics and plants the human early.

> Copy: Most zombie games make you run. Zombie Overlord makes you the reason everyone else is running. You don't board up the windows — you set the traps, harvest the survivors, and build the horde. It's a deck-builder where your deck is your army, and every survivor you convert makes you stronger and everyone else weaker.

### Section 3 — How it plays  *(REUSE existing, tighten)*
Reuse the existing main-page content: the "Lure. Convert. Dominate." block and the three-step (Set Your Traps / Build Your Horde / Crush Your Rivals) with the existing key art. This content is already good — tighten copy only, no rewrite. Keep the existing images.

### Section 4 — See it  *(REUSE existing, add video)*
Reuse the existing components gallery (Full Game Layout, Game in Play, Trap Cards, Survivor Cards) — these real photos are the strongest trust signal for board gamers, keep them. **Add:** the gameplay/launch video here if a usable cut exists, embedded and visible (not a raw file link). If no clean video yet, leave a placeholder slot and flag it.

### Section 5 — The creator  *(NEW — paste finalized copy below)*
This is the missing asset. Recut from the Kickstarter Creator story for a cold reader. Use the founder photo (Erick holding cards) from the Kickstarter.

> **The creator**
>
> *Most zombie games make you run. I wanted one where you're the thing everyone else is running from.*  *(set as a pull-quote / large italic above the body)*
>
> Hi, I'm Erick — I made Zombie Overlord, and I run Rising Warrior Games out of Chattanooga, Tennessee.
>
> It didn't start here. The first version was a survival game: build your defenses, outlast the horde. It never clicked. It felt like every other zombie game, and it felt like *work* to play. So I flipped the whole thing — instead of surviving the apocalypse, what if you controlled it? Set the traps. Lure the survivors in. Flip them into your horde and turn them loose on your rivals. The moment I made that change, the game got faster, meaner, and a lot more fun.
>
> Then life happened — COVID, a move, marriage, two kids — and it sat on a shelf. But the idea never left. When things settled, I came back to it and spent the last year doing almost nothing but refining, testing, and sharpening it into the game it is now.
>
> Here's my favorite stat: across all that playtesting, I've only won my own game twice. I used to think that meant I was bad at it. Now I think it means I built it right — nobody gets an edge at this table, not even the guy who designed it. Everyone has a real shot, and no two games play out the same way.
>
> That's the whole goal: a game you pull back off the shelf again and again. Competitive, chaotic, and full of moments you're still talking about a week later.
>
> And this is just the beginning. Zombie Overlord is the first game from Rising Warrior — there's a lot more of this world on the way.

### Section 6 — Late pledge  *(REUSE existing tier content)*
Reuse the three-tier pricing/edition content and campaign-exclusive add-ons from the old `zombieoverlord.html` landing page (Core $34 / Premium $46 / Battlefield $88, plus exclusives). **This is where the countdown clock lives** — move it here from wherever it currently sits. All buy buttons → BackerKit. This section serves the already-decided buyer who scrolled looking for it.

### Section 7 — Join the horde  *(REUSE existing signup, REFRAME copy)*
Reuse the existing email signup component ("The Horde is Growing"). **Reframe the copy to double duty** — not a pure future-games newsletter:

> **Join the horde**
> Not ready to pledge yet? Drop your email — we'll give you a heads-up before late pledges close June 15, and you'll get first word on what Rising Warrior builds next.
> *No spam. Just games.*

This nets the person who hit the price, wasn't ready, and kept scrolling — *and* seeds the ZO2 list.

### Section 8 — Footer  *(REUSE existing)*
Keep as-is: studio identity, BGG, socials, secondary nav. Verify all pledge links point to BackerKit, not `latepledge.html`.

---

## 5. Housekeeping (do these in the same pass)

- [ ] Reconcile backer count: page currently shows **167** (old landing) vs **150+** (main page). Pick the real final number and use it everywhere. Mismatched numbers read as padded to this audience.
- [ ] Repoint all internal buy/pledge links from `latepledge.html` → BackerKit hosted preorders directly.
- [ ] Retire `latepledge.html` redirect and the `zombieoverlord.html` landing page as ad/CTA destinations (keep files; just unlink).
- [ ] Add UTM params on the BackerKit links so attribution survives the cross-domain jump.
- [ ] (Tracking, optional but recommended) Fire a GA4 outbound-click key event on every BackerKit button so click-through is measured on-site, independent of cross-domain attribution loss. Currently Key events = 0 everywhere.
- [ ] After deploy: change the Meta ad's destination URL to this page.

---

## 6. Preserve / out of scope

- **Preserve** the existing visual design, color treatment, fonts, and all image assets. This is a restructure, not a redesign — the look is fine; the order and content priority were the problem.
- **Do not** rewrite How-it-plays or See-it copy beyond tightening.
- **Do not** build multi-org / new pages. One page, restructured.
- Mobile: verify the sticky buy-bar, hero, and gallery all hold up on narrow viewports — this is a paid-traffic page and a large share of clicks will be mobile.
