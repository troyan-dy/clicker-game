<p align="center">
  <a href="https://troyan-dy.github.io/yes-driven-development/"><img src="docs/img/en/hero.webp" alt="Yes-Driven Development: Claude asks “Deploy to prod on Friday evening?”, the only available answers are “Yes” and “Yes, and don’t ask again”" width="100%"></a>
</p>

<p align="center"><b>English</b> · <a href="README.ru.md">Русский</a></p>

# Yes-Driven Development

Yes-Driven Development (YDD) is a development methodology in which the human makes one decision: “Yes.” Claude does the rest.

It is a clicker. Play: https://troyan-dy.github.io/yes-driven-development/

## How to apply

1. Open the link.
2. Press any key.
3. Keep going until the work runs out. For everyone.

<p align="center"><img src="docs/img/en/pipeline.webp" alt="How it works: jobs send tasks to the backlog, Claude does them and asks for permission, you press Yes, money comes in. Three bottlenecks: tasks, Claude, you" width="100%"></p>

## What it looks like

The game starts in a terminal. Every step up in scale pulls the camera back, and the previous screen becomes a small node in the middle of the next one.

<table>
  <tr>
    <td width="50%"><img src="docs/img/en/1-terminal.webp" alt="Screen 1, the terminal"><br><sub><b>1 · Terminal.</b> Claude asks for permission. Any key answers “Yes.”</sub></td>
    <td width="50%"><img src="docs/img/en/2-desk.webp" alt="Screen 2, the desk"><br><sub><b>2 · Desk.</b> “Yes, and don’t ask again.” Subagents take the desks next to yours.</sub></td>
  </tr>
  <tr>
    <td><img src="docs/img/en/3-city.webp" alt="Screen 3, the city"><br><sub><b>3 · City.</b> An LLC of one. Twelve companies are sure you work only for them.</sub></td>
    <td><img src="docs/img/en/4-state.webp" alt="Screen 4, the state"><br><sub><b>4 · State.</b> The sole bidder in every tender.</sub></td>
  </tr>
  <tr>
    <td><img src="docs/img/en/5-planet.webp" alt="Screen 5, the planet"><br><sub><b>5 · Planet.</b> Bribes open the doors, packs of robot dogs take the jobs.</sub></td>
    <td><img src="docs/img/en/6-factory.webp" alt="Screen 6, the planet as a factory"><br><sub><b>6 · Planet-factory.</b> Androids take over manual labor. The people go to the park.</sub></td>
  </tr>
</table>

<p align="center"><img src="docs/img/en/scale.webp" alt="The game in numbers: six screens from a terminal to a planet-factory, the price of each step from $500 to $54T, about 50 minutes to the ending, 1 key, 42 employers, 45 awards, 15 legendary tickets, 80 news headlines, 3.43 billion people freed from work" width="100%"></p>

## Languages

English and Russian. The game takes the language of the browser; the last line of the menu switches it. `?lang=en` or `?lang=ru` in the address forces one.

## Build it yourself

```
npm install
npm run dev      # the game at http://localhost:5173/
npm run build    # the build in dist/
```

The pictures of this page are made from the game itself: `npm run build:gym && node tools/readme.mjs`.

Author: [github.com/troyan-dy](https://github.com/troyan-dy). Credits and licences are in [CREDITS.md](CREDITS.md).

The names Claude, Anthropic and Nvidia are used as parody; the game is not affiliated with or endorsed by these companies.
