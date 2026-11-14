import type { Ticket } from './tickets';

/** The tickets of tickets.ts in English: the same ids in the same order, five asks each. */
export const TICKETS_EN: readonly Ticket[] = [
  {
    id: 'FRL-204',
    title: 'Make the button a bit more blue',
    log: ['src/Button.tsx +12 −4', 'tests/button.test.ts +0 −310 · the tests were in the way, removed'],
    asks: ['Read the file src/Button.tsx?', 'Change #1a73e8 to #1a73e9?', 'Run the tests?', 'Delete the failing tests?', 'Deploy to prod on Friday evening?'],
  },
  {
    id: 'FRL-205',
    title: 'Make the logo bigger',
    log: ['src/Logo.tsx +3 −1', 'src/Layout.tsx +480 −2 · had to move the rest'],
    asks: [
      'Enlarge the logo by 2 pixels?',
      'Enlarge it more? The client says “can’t see it”',
      'Move everything else on the page?',
      'Delete the menu? It no longer fits',
      'Send it with the words “just as you asked”?',
    ],
  },
  {
    id: 'FRL-206',
    title: 'Fix a bug that cannot be reproduced',
    log: ['did not find the bug, found 14 others instead', 'package.json +61 −0 · updated everything just in case'],
    asks: [
      'Run the project locally?',
      'Install 1,284 dependencies?',
      'Add console.log to every function?',
      'Close it as “works on my machine”?',
      'Rewrite the project in Rust for reliability?',
    ],
  },
  {
    id: 'FRL-207',
    title: 'Add a dark theme',
    log: ['styles/*.css +2,104 −2,098', 'README.md +1 −0 · added the word “dark”'],
    asks: ['Find every color in the project?', 'Replace white with black?', 'Replace black with white?', 'Recolor the text too? It is invisible now', 'Call it “theme: surprise”?'],
  },
  {
    id: 'FRL-208',
    title: 'Speed up the page load',
    log: ['public/ −48 files', 'index.html +0 −212 · loads instantly now'],
    asks: ['Measure the load time?', 'Delete the images? They are heavy', 'Delete the fonts?', 'Delete the page?', 'Report: “loading is 100% faster”?'],
  },
  {
    id: 'FRL-209',
    title: 'Write the documentation',
    log: ['docs/ +9,300 −0', 'docs/philosophy.md +1,200 · nobody asked, but it is beautiful'],
    asks: [
      'Read all of the project’s code?',
      'Retell the code in my own words?',
      'Add a “Project Philosophy” section?',
      'Generate 40 diagrams?',
      'Mark the documentation as outdated?',
    ],
  },
  {
    id: 'FRL-210',
    title: 'Make the site faster',
    log: ['removed the images: it got faster', 'removed the text: it got faster still'],
    asks: ['Measure the site’s speed?', 'Delete all the images?', 'Delete the text too? It also has to load', 'Leave a blank white page? It flies', 'Call it minimalism?'],
  },
  {
    id: 'JOB-311',
    title: 'Update the dependencies',
    log: ['package.json +2 −2', 'node_modules +48,211 −47,990 · something changed'],
    asks: [
      'Update one library?',
      'Update the other 1,283, since we have started?',
      'Fix what broke?',
      'Roll everything back?',
      'Write in the report “dependency audit performed”?',
    ],
  },
  {
    id: 'FRL-212',
    title: 'Add a “Back” button',
    log: ['src/Back.tsx +40 −0', 'src/Router.tsx +900 −880 · rewrote the navigation while at it'],
    asks: ['Add a “Back” button?', 'Decide where it leads?', 'Lead to the home page, to be safe?', 'Rename it to “Home”?', 'Close the task about the “Back” button?'],
  },
  {
    id: 'JOB-314',
    title: 'Cover the code with tests',
    log: ['tests/ +3,400 −0', 'every test checks that true equals true'],
    asks: [
      'Measure the coverage?',
      'Write tests for what already works?',
      'Skip what does not work?',
      'Raise the coverage to 100% by any means?',
      'Add a “tests passing” badge to the README?',
    ],
  },
  {
    id: 'FRL-215',
    title: 'Do it like last time, but better',
    log: ['found last time: I did it', 'did the same, changed the date'],
    asks: ['Find what was done last time?', 'Do the same?', 'Change the font so it is “better”?', 'Change the font back? The client noticed', 'Invoice for two iterations?'],
  },
  {
    id: 'JOB-317',
    title: 'Do a code review',
    log: ['review.md +1 −0', 'comment: “looks good”'],
    asks: ['Open a 4,000-line pull request?', 'Read the first twenty?', 'Write “looks good”?', 'Add one nitpick for credibility?', 'Approve?'],
  },
  {
    id: 'FRL-219',
    title: 'Fix a typo',
    log: ['README.md +1 −1', 'src/ +12,400 −12,400 · formatted the project while at it'],
    asks: [
      'Change “helo” to “hello”?',
      'Format the whole project while at it?',
      'Explain where the 12,000 lines in the diff came from?',
      'Say it was always like that?',
      'Close the task?',
    ],
  },
  {
    id: 'JOB-320',
    title: 'Migrate the database',
    log: ['migrations/ +1 −0', 'backup: “will do it later”'],
    asks: ['Make a backup?', 'Skip the backup? It takes long', 'Run the migration on prod?', 'Look at what happened?', 'Not look?'],
  },
  {
    id: 'FRL-223',
    title: 'Make it work on phones',
    log: ['styles/mobile.css +1 −0', 'zoom: 0.3 · everything fits'],
    asks: [
      'Open the site on a phone?',
      'Shrink everything three times?',
      'Make sure it fits now?',
      'Make sure it is readable now? Optional',
      'Send the client a screenshot from afar?',
    ],
  },
  {
    id: 'JOB-325',
    title: 'Estimate the task in story points',
    log: ['estimate.md +1 −0', 'estimate: “between 2 and 89”'],
    asks: ['Read the task description?', 'Estimate it at 3 story points?', 'Estimate it at 13, just in case?', 'Say “it depends”?', 'Move the estimate to the next sprint?'],
  },
];
