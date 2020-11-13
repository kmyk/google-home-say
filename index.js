#!/usr/bin/env node
'use strict';

const Client = require('castv2-client').Client;
const DefaultMediaReceiver = require('castv2-client').DefaultMediaReceiver;
const googleTTS = require('google-tts-api'); // TODO: replace this with the official one. https://github.com/googleapis/nodejs-text-to-speech
const {program} = require('commander');
const multicastdns = require('multicast-dns');

function retry(func, retryCount, retryAfterMillisec) {
  let promise = func();
  for (let i = 0; i < retryCount; ++ i) {
    promise = promise.catch((err) => {
      console.error(err);
      console.log('retry...');
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(func());
        }, retryAfterMillisec);
      });
    });
  }
  return promise;
};

function findGoogleHome() {
  return new Promise(function(resolve, reject) {
    setTimeout(function() {
      reject(new Error('timeout'));
    }, 5000);

    const mdns = multicastdns();
    mdns.on('response', function(response) {
      console.debug('response =', response);
      let ip = undefined;
      let port = undefined;
      for (const additional of response.additionals) {
        if (additional.type == 'A') ip = additional.data;
        if (additional.type == 'SRV') port = additional.data.port;
      }
      if (ip !== undefined && port != undefined) {
        resolve([ip, port]);
        mdns.destroy();
      }
    });
    mdns.query({
      questions: [{
        name: '_googlecast._tcp.local',
        type: 'PTR',
      }],
    });
  });
}

function say(target, media) {
  return new Promise(function(resolve, reject) {
    const client = new Client();
    client.connect(target, function() {
      client.launch(DefaultMediaReceiver, function(err, player) {
        if (err) {
          reject(err);
        }
        player.on('status', function(status) {
          console.debug('status:', status);
        });
        player.load(media, {autoplay: true}, function(err, status) {
          resolve();
          client.close();
        });
      });
    });
    client.on('error', function(err) {
      reject(err);
      client.close();
    });
  });
}

async function main() {
  // parse args
  program
      .usage('[--ip IP] TEXT...')
      .option('--ip <IP>', 'IP address to your device')
      .option('--port <PORT>', 'port for your device')
      .option('--language <LANGUAGE>', 'language for Text-to-Speach', 'en-US')
      .option('--speed <SPEED>', 'speed for Text-to-Speach', parseFloat, 1.0)
      .option('-v, --verbose', 'print debugs logs');
  program.parse(process.argv);

  if (!program.verbose) {
    console.debug = function() {}; // nop
  }

  const text = program.args.join(' ').trim();
  if (!text) {
    console.error('error: the argument `TEXT` is empty');
    process.exit(1);
  }

  // get IP and port of Google Home device
  let ip = program.ip;
  let port = program.port;
  if (ip === undefined) {
    if (port !== undefined) {
      console.error('error: the option `--port` is specified while the option `--ip` is not specified');
      process.exit(1);
    }
    [ip, port] = await retry(findGoogleHome, 2, 3000).catch((err) => {
      console.error('error: failed to find Google Home devices:', err);
      process.exit(1);
    });
  }

  // get URL for TTS
  console.debug(`Calling googleTTS (retryCount = ${program.ttsRetryCount})`);
  const url = await retry(function() {
    return googleTTS(text, program.language, program.speed);
  }, 10, 1000).catch((err) => {
    console.error('error: failed to get a URL for Google Text-to-Speech:', err);
    process.exit(1);
  });

  // build the query
  const media = {
    contentId: url,
    contentType: 'audio/mp3',
    streamType: 'BUFFERED',
  };
  const target = {
    host: ip,
    port: port,
  };
  console.debug('target =', target);
  console.debug('media =', media);

  // send the query
  await retry(function() {
    return say(target, media);
  }, 2, 3000).catch((err) => {
    console.error('error: failed to send a request to the Google Home device:', err);
    if (program.ip !== undefined && err.toString().includes('ECONNRESET')) {
      console.error('hint: You can access to Google Home devices only from the local network of your home (probably, for a security reason). If you use this command from a remote server, you need to use something like a proxy (e.g. reverse SSH tunnels).');
    }
    process.exit(1);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
