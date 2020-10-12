#!/usr/bin/env node
'use strict';

const Client = require('castv2-client').Client;
const DefaultMediaReceiver = require('castv2-client').DefaultMediaReceiver;
const googleTTS = require('google-tts-api');  // TODO: replace this with the official one. https://github.com/googleapis/nodejs-text-to-speech
const { program } = require('commander');
const multicastdns = require('multicast-dns');

function findGoogleHome() {
    return new Promise(function (resolve, reject) {
        setTimeout(function () {
            reject('timeout');
        }, 5000);

        const mdns = multicastdns();
        mdns.on('response', function (response) {
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
            }]
        });
    });
}

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
        .option('--ip <IP>', 'IP address to your device')
        .option('--port <PORT>', 'port for your device')
        .option('--language <LANGUAGE>', 'language for Text-to-Speach (default: en-US)', 'en-US')
        .option('--speed <SPEED>', 'speed for Text-to-Speach (default: 1.0)', parseFloat, 1.0);
    program.parse(process.argv);

    const text = program.args.join(' ').trim();
    if (!text) {
        console.error('error: the argument `TEXT` is empty');
        process.exit(1);
    }

    let ip = program.ip;
    let port = program.port;
    if (ip === undefined) {
        if (port !== undefined) {
            console.error('error: the option `--port` is specified while the option `--ip` is not specified');
            process.exit(1);
        }
        [ip, port] = await findGoogleHome().catch((err) => {
            console.error('error: failed to find Google Home devices:', err);
            process.exit(1);
        });
    }

    // build the query
    const url = await googleTTS(text, program.language, program.speed);
    const media = {
        contentId: url,
        contentType: 'audio/mp3',
        streamType: 'BUFFERED',
    };
    const options = {
        host: ip,
        port: port,
    };
    console.log(options);
    console.log(media);

    // send the query
    say(options, media);
}

main();
