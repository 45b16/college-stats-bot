const Discord = require("discord.js");
const Request = require("request");
const Cheerio = require("cheerio");
const Tokens = require("./tokens.json");

const bot = new Discord.Client();

// When bot is launched
bot.on("ready", function() {
  console.log(`\nCollege Stats Bot ready to server in `
    + `${bot.channels.size} channels on ${bot.guilds.size} servers, `
    + `for a total of ${bot.users.size} users.\n`);
  bot.user.setGame("-college <uni name>");
});

// When bot receives a message
bot.on("message", function(message) {
  // Prefix for bot commands
  let prefix = "-";

  var input = message.content;

  // Exits function if message doesn't start with prefix or is from a bot
  if (!input.startsWith(prefix)) return;
  if (message.author.bot) return;

  // Command -help results in bot explaining how command college works
  if (input === prefix + "help") {
    message.channel.sendEmbed(new Discord.RichEmbed()
    .setTitle("College Stats Bot Instructions")
    .setColor(0x323D7F)
    .setDescription("Just type '-college <name of university>' without the "
      + "quotes to get a link to its statistics page. For example, '-college "
      + "princeton' will return a link to Princeton's statistics. You can see "
      + "the code at https://github.com/45b16/college-stats-bot.")
    .setTimestamp());
  }
  // Command -college <insert college> results in bot sending a link to search
  // results and basic stats of the college
  else if (input.startsWith(prefix + "college ")) {
    // Logs the time that the -stats message was sent
    var hours = message.createdAt.getHours().toString();
    var minutes = message.createdAt.getMinutes().toString();
    var seconds = message.createdAt.getSeconds().toString();
    if (hours.length < 2) {
      hours = "0" + hours;
    }
    if (minutes.length < 2) {
      minutes = "0" + minutes;
    }
    if (seconds.length < 2) {
      seconds = "0" + seconds;
    }
    console.log(`${message.guild.name} - ${message.channel.name}`);
    console.log(`${hours}:${minutes}:${seconds} `
      + `- ${message.author.username}: ${message.content}\n`);

    // Gets college name to search for
    var college = input.substring(9);
    college2 = college.replace(/ /g, "_");

    // Gets US News National Universities search link and does an
    // HTTP GET request on it with headers
    var link = `http://colleges.usnews.rankingsandreviews.com/best-colleges`
      +`/rankings/national-universities?school-name=${college2}&_mode=list`;
    Request({
        uri: link,
        headers: {
          "User-Agent": Tokens.userAgent,
          "Accept": "/",
          "Connection": "Keep-Alive",
          "Accept-Encoding": "identity"
        },
        jar: true,
      },
      function(err, resp, body) {
        if (!err && resp.statusCode == 200) {
          var $ = Cheerio.load(body);

          // Filters out html except for the search results
          $(".search-results-view").filter(function() {
            var data = $(this);

            // If no search results found, embed sent informing user
            if (data.children()[0] == null) {
              message.channel.sendEmbed(new Discord.RichEmbed()
              .setTitle("First US news search result for " + college)
              .setColor(0x323D7F)
              .setDescription(`No valid search results found at ${link}. `
		+ `This bot only pulls from US News's list of National `
		+ `Universities.`)
              .setTimestamp());
              console.log("None found\n");
            }
            // Takes url of the first college in the search results and does an
            // HTTP request to get more information
            else {
              var endUrl = data.children()[0].children[1].children[1]
                .children[1].children[3].children[1].attribs.href;
              var pg = `http://colleges.usnews.rankingsandreviews.com${endUrl}`;
              Request({
                  uri: pg,
                  headers: {
                    "User-Agent": Tokens.userAgent,
                    "Accept": "/",
                    "Connection": "Keep-Alive",
                    "Accept-Encoding": "identity"
                  },
                  jar: true,
                },
                function(error, response, html) {
                  if (!error && response.statusCode == 200) {
                    var $ = Cheerio.load(html);

                    var name, ranking, stats;
                    var info = {name : "", ranking : "", stats : ""};

                    // Gets name
                    var nameClass = ".hero-heading.flex-media-heading"
                      + ".block-tight.hero-heading.text-tighter.block-tight"
                      + ".flex-media-heading";
                    $(nameClass).filter(function() {
                      var collName = $(this)[0].children[0].data;
                      info.name = collName.replace(/^\s+|\s+$/g, "");
                    });

                    // Gets National Universities ranking
                    var rankClass = ".block-normal.block-flush-for-medium-up"
                      + ".display-inline-block.hero-ranking-data-rank";
                    $(rankClass).filter(function() {
                      var rank = $(this).children()[0].children[0].data;
                      info.ranking = rank.replace(/\s/g, "");
                    });

                    // Gets stats on tuition, room and board, enrollment,
                    // and application deadline
                    $(".hero-stats-widget-stats li").each(function() {
                      info.stats += `${$(this)[0].children[0].children[0].data}`
                        + `\n${$(this)[0].children[2].children[0].data}\n\n`;
                    });

                    // Sends embed with information to Discord channel
                    message.channel.sendEmbed(new Discord.RichEmbed()
                    .setTitle("First US news search result for " + college)
                    .setColor(0x323D7F)
                    .setDescription(info.name)
                    .addField("Link", pg)
                    .addField("National Universities Ranking", info.ranking)
                    .addField("College Statistics", info.stats)
                    .setTimestamp());
		    console.log(info.name + "\n");
                  }
              });
            }
          });
        }
    });
  }
  else return;
});

// Bot sends crash messages to console
bot.on('error', function(e) {
    console.error(e);
});
bot.on('warn', function(w) {
    console.warn(w);
});

// Bot logs in with token
bot.login(Tokens.discordToken);
