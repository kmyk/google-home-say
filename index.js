#!/usr/bin/env node
'use strict';

const Client = require('castv2-client').Client;
const DefaultMediaReceiver = require('castv2-client').DefaultMediaReceiver;
const googleTTS = require('google-tts-api');  // TODO: replace this with the official one. https://github.com/googleapis/nodejs-text-to-speech
const { program } = require('commander');

const say = (host, media) => {
    const client = new Client();
    client.connect(host, function () {
        client.launch(DefaultMediaReceiver, function (err, player) {
            if (err) {
                console.log('Error:', err);
                return;
            }
            player.on('status', function (status) {
                console.log('Status: %s', status.playerState);
            });
            player.load(media, { autoplay: true }, function (err, status) {
                client.close();
            });
        });
    });
    client.on('error', function (err) {
        console.log('Error:', err.message);
        client.close();
    });
};

async function main() {
    // parse args
    program
        .usage('--ip IP [--language LANGUAGE] TEXT...')
        .requiredOption('--ip <IP>', 'IP address to your device')
        .option('--port <PORT>', 'port for your device')
        .option('--language <LANGUAGE>', 'language for Text-to-Speach (default: en-US)', 'en-US')
        .option('--speed <SPEED>', 'speed for Text-to-Speach (default: 1.0)', parseFloat, 1.0);
    program.parse(process.argv);
    if (!program.args) {
        throw 'TEXT is not given';
    }
    const text = program.args.join(' ');
    console.log('Options:', program.opts());
    console.log('Text:', text);

    // build the query
    const url = await googleTTS(text, program.language, program.speed);
    const media = {
        contentId: url,
        contentType: 'audio/mp3',
        streamType: 'BUFFERED',
    };
    const options = {
        host: program.ip,
        port: program.port,
    };
    console.log(options);
    console.log(media);

    // send the query
    say(options, media);
}

main();
