'use strict';
const Client = require('castv2-client').Client;
const DefaultMediaReceiver = require('castv2-client').DefaultMediaReceiver;
const googleTTS = require('google-tts-api');  // TODO: replace this with the official one. https://github.com/googleapis/nodejs-text-to-speech

const say = (host, media) => {
    const client = new Client();
    client.connect(host, function () {
        client.launch(DefaultMediaReceiver, function (err, player) {
            if (err) {
                console.log('Error: %s', err);
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
        console.log('Error: %s', err.message);
        client.close();
    });
};

async function main() {
    const ip = '192.168.10.125';
    const text = 'こんにちは';
    const language = 'ja-JP';
    const speed = 1;

    const url = await googleTTS(text, language, speed);
    const media = {
        contentId: url,
        contentType: 'audio/mp3',
        streamType: 'BUFFERED',
    };
    console.log(media);
    say(ip, media);
}

main();
