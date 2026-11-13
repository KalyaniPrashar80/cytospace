# Cytospace

Build me a stunning, interactive website " CYTO SPACE " for students who only ever saw a cell as a labelled circle in biology class. Deploy it live when it's done.

The experience:

1. Hero: a soft blush screen with one tiny dot and the headline of cell As the user scrolls, the camera zooms smoothly into the dot and through the membrane into a 3D cell. This scroll zoom should feel cinematic.

2. A toggle at the top: "textbook" shows a flat circle with labels like a school worksheet, "reality" shows the full 3D cell. Animate the switch between them.

3. Inside the cell: a glowing nucleus, folded ER dotted with ribosomes, Golgi stacks, several mitochondria, thin microtubule tracks, and lots of tiny drifting particles so it feels crowded and alive show cytoplasmic movement.Users can drag to rotate it.

4. Clickable hotspots that zoom in and play a looping animation:

   • Kinesin, a two footed protein walking along a microtubule carrying a bubble of cargo

   • A ribosome reading an mRNA strand and building a protein chain

   • ATP synthase spinning like a motor

   • A signal docking on a membrane receptor and sending glowing pulses toward the nucleus

5. Each hotspot opens a small card with: what it does in one sentence, a "if you code" analogy (nucleus = private repo, ribosome = compiler, kinesin = delivery driver, receptor = API, ATP synthase = generator), and one fact.

6. A "speed of life" slider to slow down or speed up every animation, and a "take the tour" button that plays through every stop on its own.

Facts to use (only these): kinesin takes 8 nm steps along a microtubule and uses one ATP per step; a simple yeast cell holds around 42 million protein molecules (Ho et al., 2018, Cell Systems); ATP synthase physically spins to make ATP. Add a footer note: "Stylized for learning. Not to scale."

Style: cute, clean, pastel lab aesthetic. Colors: ink #3A1C2B, pink #E8447A, mauve #8C6B76, blush #FCE4EC, with soft lavender and mint for organelles. EB Garamond headings, Poppins body text. Glassy rounded cards, soft glow. It must look beautiful on a phone held vertically.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://cytospace.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b88d942a-2a79-55e7-9d29-e3f84945dfb2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
