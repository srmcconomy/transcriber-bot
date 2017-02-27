const Discord = require('discord.js');
const speech = require('@google-cloud/speech')({
  projectId: 'caramel-graph-108315',
  keyFilename: './key.json',
});
const fs = require('fs');
const stream = require('stream');

var request = {
  config: {
    encoding: 'LINEAR16',
    sampleRate: 48000
  },
  singleUtterance: false,
  interimResults: false
};

// fs.createReadStream('./out2.raw')
//   .on('error', console.error)
//   .pipe(speech.createRecognizeStream(request))
//   .on('error', console.error)
//   .on('data', function(data) {
//     console.log(data);
//   });

const bot = new Discord.Client();

class PCM extends stream.Transform {
  constructor(options) {
    super(options);
  }

  _transform(chunk, encoding, callback) {
    let buf;
    if (this.buf) {
      buf = Buffer.concat([this.buf, chunk]);
    } else {
      buf = chunk;
    }
    const outLength = (buf.length / 4 | 0) * 2;
    const outBuf = Buffer.alloc(outLength);
    for (let i = 0; i < buf.length; i += 4) {
      let dat = buf.readInt32LE(i);
      outBuf.writeInt16LE(dat / 65536 | 0, i / 2);
    }
    if (buf.length % 4 !== 0) {
      this.buf = buf.slice(buf.length - buf.length % 4);
    } else {
      this.buf = null;
    }
    this.push(outBuf);
    callback();
  }
}

bot.on('ready', () => {
  // console.log('ready');
  const channel = bot.channels.find(c => c.type === 'voice' && c.name === 'TranscriberBot');
  const textChannel = bot.channels.find(c => c.type === 'text' && c.name === 'transcriber-bot');
  if (channel) {
    channel.join().then(connection => {
      const receiver = connection.createReceiver();
      connection.on('speaking', (user, speaking) => {
        if (speaking) {
          // console.log(`${user.username} is speaking`);
          const stream = receiver.createPCMStream(user);
          stream
            .on('end', () => console.log(arguments))
            .on('close', () => console.log(arguments))
            .pipe(new PCM())
            .pipe(speech.createRecognizeStream(request))
            .on('error', error => console.log('!!' + error))
            .on('data', data => {
              if (data.results.length > 0 && textChannel) {
                textChannel.sendMessage(`**${user.username}**: ${data.results}`);
              }
            });
          setTimeout(() => if (stream) stream.destroy(), 60000);
        }
      })
    })
  }
});

bot.login('Mjg1NTk5NjU5NTY3ODc0MDc4.C5UiQA.r4XZ8JmAvV2vr9RO4sE3K-xxwnU');
