# Bar Link

Send hearts and little messages between two BUSY Bars.

A JavaScript app for [BUSY Bar](https://busy.app). Work in progress.

## What it does

- Two bars are paired by the same secret word in their settings.
- While idle, the front display shows a clock. Turn the wheel to pick a pixel picture with its word (a heart, lips for a kiss, a phone for call me, a house for coming home, a sad face for miss you, a waving hand) and press Start to send it; five seconds after the last turn the clock comes back. Start on the clock brings the picker back with the last picture picked, and a second Start sends it.
- The other bar shows the picture moving for 10 seconds (the heart beats, the hand waves) with the sender's name, with a sound and the status light, and its back display shows who sent it and when.
- The BUSY Bar runs one app at a time, so messages arrive only while this app is open.
- Without a connection a red cross shows in the corner.
- Settings: the secret word and your name.

## Data

[ntfy.sh](https://ntfy.sh): the secret word is the topic name. Topics on ntfy.sh are public, so anyone who knows the word can read and send messages; pick one that is hard to guess.

## Build

Node 24 and npm:

```sh
npm ci
npm run build         # dist/io.github.vvzvlad.barlink.tgz
npm run app:install   # install it on a BUSY Bar connected over USB
npm run app:run       # start it
```

## License

[MIT](LICENSE)
