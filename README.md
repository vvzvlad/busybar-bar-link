# Bar Link

Send hearts and little messages between two BUSY Bars.

A JavaScript app for [BUSY Bar](https://busy.app). Work in progress.

## What it does

- Two bars are paired by the same secret word in their settings.
- Turn the wheel to pick a picture (heart, kiss, call me, coming home, miss you, wave) and press Start to send it.
- The other bar plays an animation over its screen, with a sound and the status light, and its back display shows who sent it and when.
- The BUSY Bar runs one app at a time, so messages arrive only while this app is open.
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
