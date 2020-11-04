# google-home-say

`google-home-say` is a command to say your Google Home something.
This command does the same thing as [noelportugal/google-home-notifier](https://github.com/noelportugal/google-home-notifier).

This is a thin wrapper of [thibauts/node-castv2-client](https://github.com/thibauts/node-castv2-client), [zlargon/google-tts](https://github.com/zlargon/google-tts), and [mafintosh/multicast-dns](https://github.com/mafintosh/multicast-dns).

## Install

```console
$ npm install -g git+https://github.com/kymk/google-home-say.git
```

Node.js and npm is required. In Ubuntu, you can install them with `$ sudo apt install nodejs npm`.

## Usage

```console
$ google-home-say [--ip IP] TEXT
```
