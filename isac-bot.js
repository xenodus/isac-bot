/******************************
  Prod / Dev
*******************************/

const config = require('./config').production;

/******************************
  Variables & Libs
*******************************/

const lodash = require('lodash');
const axios = require('axios');
const pool = config.getPool();
const moment = require("moment");
const Discord = require("discord.js");
const client = new Discord.Client();
const DBL = require("dblapi.js");
const dbl = new DBL(config.topGGtoken, client);
const helper = require("./helper.js");
const Hashids = require('hashids');
const scriptName = __filename.slice(__dirname.length + 1);
const useTrackerGG = true;

const embedFooter = 'via club.ubisoft.com | isacbot.xyz';
const embedFooterImg = 'https://ubistatic19-a.akamaihd.net/ubicomstatic/en-GB/global/logo/Club-logo_304399.png';

// Possible commands
const commands = [
  'register',
  'unregister',
  'autodelete',
  'agent',
  'dz',
  'exp',
  'darkzone',
  'rank',
  'platform',
  'pve',
  'weapons',
  'help',
  'test',
  'isac',
  'clan',
  'donate',
  'update_nicknames'
];

// Possible parameters for !rank
const rankedData = [
  'playtime',
  'ecredit',
  'gearscore',
  'commendation',
  'clanexp',
  'clanexp24h',
  'clanexp7d',
  'clanexp30d'
];

// Possible parameters for !platform
const platforms = ['uplay', 'psn', 'xbl'];
const platformsMap = {
  'uplay': 'PC/Uplay',
  'psn': 'Playstation',
  'xbl': 'Xbox'
}

// Milliseconds
const defaultAutoDeleteTimeout = 30000;

/******************************
  Errors
*******************************/

const UNABLE_TO_FIND_AGENT_ERR = "Error: Unable to locate Agent %AGENT_NAME% on platform %SERVER_PLATFORM%."; // 1
const AGENT_REGISTRATION_NOT_FOUND_ERR = "Error: Agent registration not found. Register with !register agent_id"; // 2
const INVALID_LEADERBOARD_TYPE_ERR = "Error: Please enter a valid leaderboard. \nOptions available: _" + rankedData.join(', ') + "_"; // 3
const INVALID_PLATFORM_TYPE_ERR = "Error: Please enter a valid platform. \nOptions available: _" + platforms.join(', ') + "_"; // 4
const NOT_ADMIN_PERMISSION_ERR = 'Error: This command is only valid for server admins of %SERVER_NAME%.'; // 5
const MISSING_PERMISSION_ERR = 'Error: The bot is missing permissions required to send a reply to the channel.'; // 6
const ROLE_NOT_FOUND_ERR = 'Error: The role %ROLE_ARG% does not exist.'; // 7
const INVALID_AUTO_DELETE_TYPE_ERR = "Error: Please enter a valid auto delete option. \nOptions available: _on, off_"; // 8

/******************************
  Bot Auth
*******************************/

if( scriptName == 'dev-bot.js' ) {
  client.login(config.devBotToken);
  console.log("----- DEVELOPMENT BOT -----");
}
else {
  client.login(config.botToken);
  console.log("----- PRODUCTION BOT -----");
}

/******************************
  Event Listeners
*******************************/

client.on("error", (e) => console.error(e));
client.on("warn", (e) => console.warn(e));
// client.on("debug", (e) => console.info(e));

client.on("guildCreate", async function(guild) {
  helper.printStatus("Joined a new guild: " + guild.name);
});

client.on("ready", async function() {
  helper.printStatus("I am ready!");

  let statuses = [
    '!agent',
    '!weapons',
    '!pve',
    '!exp',
    '!dz',
    '!register',
    '!rank',
    '!help',
    '!platform',
    '!isac',
    '!donate'
  ];

  client.user.setPresence({ activity: { name: '!agent', type: "PLAYING"}, status: 'online'});

  // random status message every 5s
  client.setInterval(function(){
    client.user.setPresence({ activity: { name: statuses[Math.floor(Math.random() * statuses.length)], type: "PLAYING"}, status: 'online'});
  }, 5000);
});

dbl.on('posted', () => {
  helper.printStatus('Server count posted to top.gg!');
});

/******************************
  Message Listener
*******************************/

client.on("message", async function(message) {
  if ( message.author.bot ) return; // Ignore bot messages
  if ( !message.channel.guild ) return; // Ignore dm

  let original_message = message.content;
  message.content = message.content.replace(/“/g, '"').replace(/”/g, '"').toLowerCase();

  const prefix = await getServerPrefix(message.guild.id);
  const args = message.content.slice(prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();

  let server_platform = await getServerPlatform(message.guild.id);
  let isAdmin = helper.isAdmin(message.member);
  let playerData = {};

  message.autoDelete = await isServerAutoDelete(message.guild.id);

  if( command != 'isac' && prefix != message.content.charAt(0) ) return; // ignore if prefix don't match EXCEPT for isac command
  if( commands.includes(command) == false ) return; // Ignore commands not in "commands" array
  if( message.autoDelete ) message.delete(defaultAutoDeleteTimeout); // Delete Author's Msg

  message.logCommandID = await helper.logCommands(message); // log command to DB and return entry ID

  // Output Commands Sent To Log
  console.log("----------------------------------------------");
  helper.printStatus( "Server: " + message.guild.name );
  helper.printStatus( "Message: " + message.content );
  helper.printStatus( "Author: " + message.author.username );
  helper.printStatus( "Server Platform: " + server_platform );
  helper.printStatus( "Is Admin: " + isAdmin );
  helper.printStatus( "Auto Delete: " + message.autoDelete );
  helper.printStatus( "Use Tracker GG: " + useTrackerGG );
  console.log("----------------------------------------------");

  updateServerInfo(message.guild.id, message.guild.name); // Create new server info and/or update last active time

  let apiSearchURL = config.apiSearchBaseURL + "platform=" + server_platform + "&name=";

  if( useTrackerGG ) {
    apiSearchURL = config.apiSearchBaseURL_TGG + server_platform + "/";
  }

  /***********************************
  // SERVER PREFIX
  ************************************/
  if ( command === "isac" ) {
    if( args.length > 0 ) {

      if( isAdmin ) {
        if( args[0] == 'prefix' ) {
          if( args.length == 1 ) {
            message.channel.send("The server prefix for ISAC is: " + prefix).then(function(msg){ if( message.autoDelete ) msg.delete(defaultAutoDeleteTimeout); });
          }
          else {
            if( args[1].length == 1 ) {
              setServerPrefix(message.guild.id, args[1]);
              message.channel.send("The server's prefix for ISAC is now: " + args[1]).then(function(msg){ if( message.autoDelete ) msg.delete(defaultAutoDeleteTimeout); });
            }
            else {
              message.channel.send("Error: Changing server's prefix to " + args[1] + " failed. You can only set the server's prefix to a single character. Example: !, @, #, $").then(function(msg){ if( message.autoDelete ) msg.delete(defaultAutoDeleteTimeout); });
            }
          }
        }
      }
    }
    return;
  }

  /***********************************
  // AUTO DELETE
  ************************************/
  if ( command === "autodelete" ) {
    if( args.length > 0 ) {

      if( isAdmin ) {
        if( args[0] == 'on' ) {
          pool.query("UPDATE servers SET auto_delete = 1 WHERE server_id = ?", [message.guild.id]);
          message.autoDelete = true;
          message.delete(defaultAutoDeleteTimeout);
          message.channel.send("Auto deleting of messages is now active").then(function(msg){ if( message.autoDelete ) msg.delete(defaultAutoDeleteTimeout); });
          return;
        }
        else if( args[0] == 'off' ) {
          pool.query("UPDATE servers SET auto_delete = 0 WHERE server_id = ?", [message.guild.id]);
          message.autoDelete = false;
          message.channel.send("Auto deleting of messages is now disabled");
          return;
        }
      }
    }

    message.channel.send( getErrorMessage(8) ).then(function(msg){ if( message.autoDelete ) msg.delete(defaultAutoDeleteTimeout); });
    return;
  }

  /*************************************************
  // CHANGE NICKNAMES OF USERS TO THEIR AGENT NAMES
  *************************************************/
  if ( command === "update_nicknames" ) {
    if( isAdmin ) {
      await message.guild.fetchMembers().then(async function(guild){

        // exclude server owner as bot can't change owner's nick
        let members = guild.members.cache.filter(function(member){ return member.user.bot === false && member.user.id != member.guild.ownerID })
                      .map(function(member){ return {id: member.user.id, nickname: member.nickname, member: member} });

        if(members.length > 0) {
          let success = [];
          let failure = [];

          for(var i=0; i<members.length; i++) {
            await pool.query("SELECT * FROM users WHERE user_id = ?", [members[i].id]).then(async function(res){
              if( res.length > 0 ) {
                await members[i].member.setNickname(res[0].agent_name)
                .then(function(member){
                  console.log("Updated nickname of: " + member.displayName + " to " + res[0].agent_name);
                  success.push(res[0].agent_name);
                })
                .catch(function(err){
                  console.log("Unable to update nickname of: " + members[i].member.displayName);
                  console.log("Reason: " + err.message + "\n");
                  failure.push(res[0].agent_name);
                });
              }
            });
          }

          if( success.length > 0 )
            message.author.send("The following agents have had their nicknames updated in " + message.guild.name + ": " + success.join(', ')).then(function(msg){ if( message.autoDelete ) msg.delete(defaultAutoDeleteTimeout); });
        }
      });
    }
    return;
  }

  /*************************************************
  // CLAN COMMANDS
  *************************************************/
  if ( command === "clan" ) {
    if( isAdmin ) {
      if( args.length > 0 ) {
        if( args[0] == 'removerole' ) {
          pool.query("UPDATE servers SET clan_role_id = ? WHERE server_id = ?", ['', message.guild.id]);
          message.channel.send("Clan role has been removed.").then(function(msg){ if( message.autoDelete ) msg.delete(defaultAutoDeleteTimeout); });
        }

        if( args[0] == 'role' ) {
          if( args.length > 1 ) {
            let role_arg = original_message.slice(prefix.length).replace(command, '').replace(args[0], '').trim(); // args without lowercase and space in between
            let role_search = message.guild.roles.cache.filter(function(role){ return role.name == role_arg });

            if( lodash.isEmpty(role_search) == false ) {
              let clan_role_id = role_search.map(function(role){ return role.id })[0];
              pool.query("UPDATE servers SET clan_role_id = ? WHERE server_id = ?", [clan_role_id, message.guild.id]);
              message.channel.send("Clan role has been set to " + role_arg+".").then(function(msg){ if( message.autoDelete ) msg.delete(defaultAutoDeleteTimeout); });
            }
            else {
              message.channel.send( getErrorMessage(7, {role: role_arg}) ).then(function(msg){ if( message.autoDelete ) msg.delete(defaultAutoDeleteTimeout); });
            }
          }
          else {
            pool.query("SELECT * FROM servers WHERE server_id = ?", [message.guild.id]).then(function(res){
              if( res.length > 0 ) {
                if( res[0].clan_role_id ) {
                  current_clan_role = message.guild.roles.cache.filter(function(role){ return role.id == res[0].clan_role_id });

                  if( current_clan_role ) {
                    message.channel.send("The current clan role is set to " + current_clan_role.values().next().value.name + ". !rank will only display results where members are of this role or have been manually added.").then(function(msg){ if( message.autoDelete ) msg.delete(defaultAutoDeleteTimeout); });
                  }
                }
                else {
                  message.channel.send("No clan role has been set.").then(function(msg){ if( message.autoDelete ) msg.delete(defaultAutoDeleteTimeout); });
                }
              }
            });
          }
        }

        // list manually added clan agents
        if( args[0] == 'list' ) {

          manual_agents = await pool.query("SELECT * FROM server_agents WHERE server_id = ?", [message.guild.id]).then(function(res){
            if( res.length > 0 ) {
              return res.map(function(res){ return {id: res.agent_id, name: res.agent_name} });
            }
            else {
              return [];
            }
          });

          if( lodash.isEmpty(manual_agents) == false ) {
            manual_agent_names = manual_agents.map(function(agent){ return agent.name });

            let embed = new Discord.MessageEmbed()
              .setTitle("Manually added agents for " + message.guild.name)
              .setColor("#FF6D10")
              .setFooter(embedFooter, embedFooterImg);

            embed.setDescription(manual_agent_names.sort().join('\n'));

            message.channel.send(embed).then(function(msg){ if( message.autoDelete ) msg.delete(defaultAutoDeleteTimeout); });
          }
          else {
            message.channel.send("No agents have been manually added for this clan yet.").then(function(msg){ if( message.autoDelete ) msg.delete(defaultAutoDeleteTimeout); });
          }
        }

        if( args[0] == 'add' ) {
          if( args.length > 1 ) {
            let agent_name_arg = original_message.slice(prefix.length).replace(command, '').replace(args[0], '').trim(); // args without lowercase and space in between

            if( useTrackerGG ) {
              apiSearchURL = config.apiSearchBaseURL_TGG + server_platform + "/";
            }
            else {
              apiSearchURL = config.apiSearchBaseURL + "platform=" + server_platform + "&name=";
            }

            // check if agent exists first
            axios.get(apiSearchURL + agent_name_arg).then(async function(response){
              if( response.status === 200 ) {

                // account search results
                if( useTrackerGG == false && response.data.results && response.data.results.length > 0 ) {
                  uplay_id = response.data.results[0].pid;
                  agent_name = response.data.results[0].name;

                  await pool.query("INSERT INTO server_agents (server_id, agent_name, agent_id, type, added_by_id, added_by_username, date_added) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE added_by_id = ?, added_by_username = ?, date_added = ?", [message.guild.id, agent_name, uplay_id, 'add', message.author.id, message.author.username, moment().format('YYYY-M-D HH:mm:ss'), message.author.id, message.author.username, moment().format('YYYY-M-D HH:mm:ss')]).then(async function(res){
                    message.channel.send("Agent " +agent_name_arg+ " manually added to clan list.").then(function(msg){ if( message.autoDelete ) msg.delete(defaultAutoDeleteTimeout); });
                  })
                }
                else if( useTrackerGG && response.data.data ) {
                  uplay_id = response.data.data.platformInfo.platformUserId;
                  agent_name = response.data.data.platformInfo.platformUserIdentifier;

                  await pool.query("INSERT INTO server_agents (server_id, agent_name, agent_id, type, added_by_id, added_by_username, date_added) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE added_by_id = ?, added_by_username = ?, date_added = ?", [message.guild.id, agent_name, uplay_id, 'add', message.author.id, message.author.username, moment().format('YYYY-M-D HH:mm:ss'), message.author.id, message.author.username, moment().format('YYYY-M-D HH:mm:ss')]).then(async function(res){
                    message.channel.send("Agent " +agent_name_arg+ " manually added to clan list.").then(function(msg){ if( message.autoDelete ) msg.delete(defaultAutoDeleteTimeout); });
                  })
                }
                else {
                  message.channel.send( getErrorMessage(1, {username: agent_name_arg, server_platform: server_platform}) ).then(function(msg){ if( message.autoDelete ) msg.delete(defaultAutoDeleteTimeout); });
                }
              }
            });
          }
        }

        if( args[0] == 'remove' ) {
          if( args.length > 1 ) {
            let agent_name_arg = original_message.slice(prefix.length).replace(command, '').replace(args[0], '').trim(); // args without lowercase and space in between
            pool.query("DELETE FROM server_agents WHERE server_id = ? AND agent_name = ?", [message.guild.id, agent_name_arg]).then(function(res){
              if( res.affectedRows > 0 ) {
                message.channel.send("Manually added clan agent " + agent_name_arg + " removed.").then(function(msg){ if( message.autoDelete ) msg.delete(defaultAutoDeleteTimeout); });
              }
              else {
                message.channel.send("Error: Unable to locate manually added clan agent by the name of " +agent_name_arg+ ".").then(function(msg){ if( message.autoDelete ) msg.delete(defaultAutoDeleteTimeout); });
              }
            });
          }
        }
      }
    }
    else
      message.author.send( getErrorMessage(5, {server_name: message.channel.guild}) ).then(function(msg){ if( message.autoDelete ) msg.delete(defaultAutoDeleteTimeout); });
  }

  /*************************************************
  // HELP COMMANDS
  *************************************************/
  if ( command === "help" || command === "commands" ) {
    message.author.send(config.helpTxt);
    return;
  }

  /*************************************************
  // DONATE COMMANDS
  *************************************************/
  if ( command === "donate" ) {
    let donationTitle = "```md\n# Donation Links```" + "```md\n# If you've found the bot useful and would like to donate, you can do so via the options below. Donations will be used to cover server hosting fees. Thanks Agent!```";

    message.author.send(donationTitle);

    let embed1 = new Discord.MessageEmbed()
      .setTitle("1. Monthly donations via Patreon :link:")
      .setDescription('Set up a recurring donation plan from as low as $1/month.')
      .setColor("#dc3545")
      .setURL('https://www.patreon.com/xenodus')
      .setThumbnail('https://c5.patreon.com/external/logo/guidelines/wordmark_on_navy.jpg');

    message.author.send( embed1 );

    let embed2 = new Discord.MessageEmbed()
      .setTitle("2. One time donations via PayPal :link:")
      .setDescription('Donate however much you want!')
      .setColor("#3b7bbf")
      .setURL('https://www.paypal.me/isacbot')
      .setThumbnail('https://www.paypalobjects.com/webstatic/mktg/logo-center/PP_Acceptance_Marks_for_LogoCenter_150x94.png');

    message.author.send( embed2 );

    let embed3 = new Discord.MessageEmbed()
      .setTitle("3. Buy a Coffee via Ko-fi :link:")
      .setColor("#29abe0")
      .setURL('https://ko-fi.com/xenodus')
      .setThumbnail('https://uploads-ssl.webflow.com/5c14e387dab576fe667689cf/5ca5bf1dff3c03fbf7cc9b3c_Kofi_logo_RGB_rounded-p-500.png');

    message.author.send( embed3 );

    return;
  }

  /*************************************************
  // SET DEFAULT PLATFORM FOR SERVER
  *************************************************/
  if( command === 'platform' ) {

    if( args.length == 0 ) {
      message.channel.send("This Discord server's platform is currently: " + platformsMap[server_platform]).then(function(msg){ if( message.autoDelete ) msg.delete(defaultAutoDeleteTimeout); });
      return;
    }

    if( args.length > 0 ) {
      if( isAdmin ) {
        if( platforms.includes(args[0]) ) {
          await pool.query("INSERT INTO platforms (server_id, platform, date_added) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE platform = ?, date_added = ?", [message.guild.id, args[0], moment().format('YYYY-M-D HH:mm:ss'), args[0], moment().format('YYYY-M-D HH:mm:ss')]).then(async function(res){
            message.channel.send("This Discord server's platform has been updated to: " + platformsMap[args[0]]).then(function(msg){ if( message.autoDelete ) msg.delete(defaultAutoDeleteTimeout); });
          });
        }
        else {
          message.channel.send( getErrorMessage(4) ).then(function(msg){ if( message.autoDelete ) msg.delete(defaultAutoDeleteTimeout); });
        }
      }
      else {
        message.author.send( getErrorMessage(5, {server_name: message.channel.guild}) ).then(function(msg){ if( message.autoDelete ) msg.delete(defaultAutoDeleteTimeout); });
      }
    }
  }

  /*************************************************
  // REGISTER AGENT ID TO DISCORD USER
  *************************************************/
  if ( command === "register" ) {
    if( args.length > 0 ) {
      let username = args.join(' ');

      // specific platform so doesn't use default server's
      if( platforms.includes( args[0] ) ) {
        username = args.slice(1).join(" ");
        server_platform = args[0];

        if( useTrackerGG ) {
          apiSearchURL = config.apiSearchBaseURL_TGG + server_platform + "/";
        }
        else {
          apiSearchURL = config.apiSearchBaseURL + "platform=" + server_platform + "&name=";
        }
      }

      // search accounts
      axios.get(apiSearchURL + username).then(async function(response){
        if( response.status === 200 ) {
          // account search results
          if( useTrackerGG == false && response.data.results && response.data.results.length > 0 ) {
            uplay_id = response.data.results[0].pid;
            agent_name = response.data.results[0].name;

            await pool.query("INSERT INTO users (user_id, uplay_id, agent_name, platform, date_added) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE uplay_id = ?, agent_name = ?, platform = ?, date_added = ?", [message.author.id, uplay_id, agent_name, server_platform, moment().format('YYYY-M-D HH:mm:ss'), uplay_id, agent_name, server_platform, moment().format('YYYY-M-D HH:mm:ss')]).then(async function(res){
              message.channel.send("User <-> Agent registered. Fetching Agent stats.").then(function(msg){ if( message.autoDelete ) msg.delete(defaultAutoDeleteTimeout); });
              playerData = await getPlayerData(uplay_id);
              printAgentStat(message, playerData);
            })
          }
          else if( useTrackerGG && response.data.data ) {
            uplay_id = response.data.data.platformInfo.platformUserId;
            agent_name = response.data.data.platformInfo.platformUserIdentifier;

            await pool.query("INSERT INTO users (user_id, uplay_id, agent_name, platform, date_added) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE uplay_id = ?, agent_name = ?, platform = ?, date_added = ?", [message.author.id, uplay_id, agent_name, server_platform, moment().format('YYYY-M-D HH:mm:ss'), uplay_id, agent_name, server_platform, moment().format('YYYY-M-D HH:mm:ss')]).then(async function(res){
              message.channel.send("User <-> Agent registered. Fetching Agent stats.").then(function(msg){ if( message.autoDelete ) msg.delete(defaultAutoDeleteTimeout); });
              playerData = await getPlayerData(uplay_id, server_platform, agent_name);
              printAgentStat(message, playerData);
            })
          }
          else {
            message.channel.send( getErrorMessage(1, {username: username, server_platform: server_platform}) ).then(function(msg){ if( message.autoDelete ) msg.delete(defaultAutoDeleteTimeout); });
          }
        }
      })
      .catch(function(error){
        console.log(error);
        message.channel.send( getErrorMessage(1, {username: username, server_platform: server_platform}) ).then(function(msg){ if( message.autoDelete ) msg.delete(defaultAutoDeleteTimeout); });
      });
      return;
    }

    message.channel.send( getErrorMessage(2) ).then(function(msg){ if( message.autoDelete ) msg.delete(defaultAutoDeleteTimeout); });
  }

  /*************************************************
  // UNREGISTER AGENT ID
  *************************************************/
  if ( command === "unregister" ) {
    await pool.query("DELETE FROM users WHERE user_id = ?", [message.author.id]).then(async function(res){
      message.channel.send("User <-> Agent link removed.").then(function(msg){ if( message.autoDelete ) msg.delete(defaultAutoDeleteTimeout); });
      return;
    });
  }

  /*************************************************
  // GET PLAYER INFO
  *************************************************/
  if ( ['agent', 'weapons', 'pve', 'dz', 'darkzone', 'exp'].includes(command) ) {

    if( args.length == 0 ) {
      // query DB and checks if user has registered aka linked discord ID to uplay ID else send message prompting to register
      await pool.query("SELECT * FROM users WHERE user_id = ?", [message.author.id]).then(async function(res){
        if( res.length == 0 ) {
          message.channel.send( getErrorMessage(2) ).then(function(msg){ if( message.autoDelete ) msg.delete(defaultAutoDeleteTimeout); });
        }
        else {
          uplay_id = res[0].uplay_id;
          platform = res[0].platform;
          username = res[0].agent_name;
          playerData = await getPlayerData(uplay_id, platform, username);
        }
      });
    }

    if( args.length > 0 ) {
      let username = args.join(' ');

      // @mentioneduser id instead of agent name
      let isMentionedUser = false;

      if( message.mentions.users.first() ) {
        isMentionedUser = true;
        agentID = await getMentionedUserAgentID( message.mentions.users.first() );

        if( agentID ) {
          username = agentID;
        }
        else {
          message.channel.send( getErrorMessage(1, {username: message.mentions.users.first(), server_platform: server_platform}) ).then(function(msg){ if( message.autoDelete ) msg.delete(defaultAutoDeleteTimeout); });
          return;
        }
      }

      // specific platform so doesn't use default server's
      if( platforms.includes( args[0] ) ) {
        server_platform = args[0];
        username = isMentionedUser ? username : args.slice(1).join(" ");

        if( useTrackerGG ) {
          apiSearchURL = config.apiSearchBaseURL_TGG + server_platform + "/";
        }
        else {
          apiSearchURL = config.apiSearchBaseURL + "platform=" + server_platform + "&name=";
        }
      }

      // search accounts
      if( useTrackerGG ) {
        playerData = await getPlayerData('', server_platform, username);

        if( lodash.isEmpty(playerData) ) {
          message.channel.send( getErrorMessage(1, {username: username, server_platform: server_platform}) ).then(function(msg){ if( message.autoDelete ) msg.delete(defaultAutoDeleteTimeout); });
        }
      }
      else {
        helper.printStatus("API Call @ Search Account: " + apiSearchURL + username);

        await axios.get(apiSearchURL + username).then(async function(response){
          if( response.status === 200 ) {
            // account search results
            if( response.data.results && response.data.results.length > 0 ) {
              uplay_id = response.data.results[0].pid;
              playerData = await getPlayerData(uplay_id);
            }
            else {
              message.channel.send( getErrorMessage(1, {username: username, server_platform: server_platform}) ).then(function(msg){ if( message.autoDelete ) msg.delete(defaultAutoDeleteTimeout); });
            }
          }
        })
        .catch(function(error){
          console.log(error);
        });
      }
    }
  }

  /*************************************************
  // PRINT AGENT SUMMARY
  *************************************************/
  if ( command === "agent" ) {
    if( lodash.isEmpty(playerData) == false ) {
      printAgentStat(message, playerData);
      return;
    }
  }

  /*************************************************
  // PRINT WEAPON USAGE
  *************************************************/
  if ( command === "weapons" ) {
    if( lodash.isEmpty(playerData) == false ) {
      printWeaponStat(message, playerData);
      return;
    }
  }

  /*************************************************
  // PRINT PVE DATA
  *************************************************/
  if ( command === "pve" ) {
    if( lodash.isEmpty(playerData) == false ) {
      printPVEStat(message, playerData);
      return;
    }
  }

  /*************************************************
  // PRINT DZ DATA
  *************************************************/
  if ( command === "dz" || command === "darkzone" ) {
    if( lodash.isEmpty(playerData) == false ) {
      printDZStat(message, playerData);
      return;
    }
  }

  /*************************************************
  // PRINT EXP
  *************************************************/
  if ( command === "exp" ) {
    if( lodash.isEmpty(playerData) == false ) {
      printAgentEXP(message, playerData);
      return;
    }
  }

  /*************************************************
  // PRINT SERVER'S AGENTS DATA
  *************************************************/
  if ( command === "rank" ) {
    if( args.length > 0 ) {
      if( rankedData.includes(args[0]) ) {
        rankGet(message, args[0], server_platform);
        return;
      }
    }

    message.channel.send( getErrorMessage(3) ).then(function(msg){ if( message.autoDelete ) msg.delete(defaultAutoDeleteTimeout); });
  }
});

// Fetches top 10 highest stat type from registered members of the discord server
async function rankGet(message, type, server_platform) {
  await message.channel.guild.members.fetch().then(async function(guild){

    let clan_role_id = await pool.query("SELECT * FROM servers WHERE server_id = ?", [message.guild.id]).then(function(res){
      if( res.length > 0 )
        return res[0].clan_role_id ? res[0].clan_role_id : null;
      else
        return null
    })
    .catch(function(error){
      return null;
    });

    // Array of member id + username objects
    let members = [];

    // Clan role restriction - only show results where members are of role specified
    if( clan_role_id )
      members = message.guild.members.cache.filter(function(member){ return member.user.bot === false && member._roles.includes(clan_role_id) }).map(function(member){ return {id: member.user.id, username: member.user.username} });
    else
      members = message.guild.members.cache.filter(function(member){ return member.user.bot === false }).map(function(member){ return {id: member.user.id, username: member.user.username} });

    // Manually added agents
    if( useTrackerGG ) {
      manual_agents = await pool.query("SELECT * FROM server_agents WHERE server_id = ?", [message.guild.id]).then(function(res){
          if( res.length > 0 ) {
            return res.map(function(res){ return res.agent_name });
          }
          else {
            return [];
          }
        });
    }
    else {
      manual_agents = await pool.query("SELECT * FROM server_agents WHERE server_id = ?", [message.guild.id]).then(function(res){
        if( res.length > 0 ) {
          return res.map(function(res){ return res.agent_id });
        }
        else {
          return [];
        }
      });
    }

    // Test data
    //members.push({id: '226689814362193920', username: 'test-user'});
    //members.push({id: '181105837807370241', username: 'test-user-2'});

    let results = [];

    if(members.length > 0) {
      switch(type) {
        case 'playtime':
          message.channel.startTyping();
          for(var i=0; i<members.length; i++) {
            await pool.query("SELECT * FROM users WHERE user_id = ?", [members[i].id]).then(async function(res){
              if( res.length > 0 ) {
                uplay_id = res[0].uplay_id;
                platform = res[0].platform;
                agent_name = res[0].agent_name;
                playerData = await getPlayerData(uplay_id, platform, agent_name);

                if( lodash.isEmpty(playerData) == false ) {
                  results.push({
                    is_manual: false,
                    uplay_id: playerData.name,
                    user_id: members[i].id,
                    username: members[i].username,
                    ranked_value: Number(playerData.timeplayed_total),
                    display_value: lodash.round(playerData.timeplayed_total / 3600) + " hour" + (lodash.round(playerData.timeplayed_total / 3600) > 1 ? 's':'')
                  });
                }
              }
            });
          }

          for(var i=0; i<manual_agents.length; i++) {
            playerData = await getPlayerData(manual_agents[i], server_platform, manual_agents[i]);

            if( lodash.isEmpty(playerData) == false ) {
              results.push({
                is_manual: true,
                uplay_id: playerData.name,
                user_id: 0,
                username: playerData.name,
                ranked_value: Number(playerData.timeplayed_total),
                display_value: lodash.round(playerData.timeplayed_total / 3600) + " hour" + (lodash.round(playerData.timeplayed_total / 3600) > 1 ? 's':'')
              });
            }
            else {
              if( useTrackerGG )
                pool.query("DELETE FROM server_agents WHERE agent_name = ? AND server_id = ?", [manual_agents[i], message.guild.id]);
              else
                pool.query("DELETE FROM server_agents WHERE agent_name = ? AND server_id = ?", [manual_agents[i], message.guild.id]);
            }
          }
          message.channel.stopTyping();

          if( results.length > 0 ) {
            printRankedResult(message, results, 'desc', 'Playtime');
          }
          break;
        case 'ecredit':
          message.channel.startTyping();
          for(var i=0; i<members.length; i++) {
            await pool.query("SELECT * FROM users WHERE user_id = ?", [members[i].id]).then(async function(res){
              if( res.length > 0 ) {
                uplay_id = res[0].uplay_id;
                platform = res[0].platform;
                agent_name = res[0].agent_name;
                playerData = await getPlayerData(uplay_id, platform, agent_name);

                if( lodash.isEmpty(playerData) == false ) {
                  results.push({
                    is_manual: false,
                    uplay_id: playerData.name,
                    user_id: members[i].id,
                    username: members[i].username,
                    ranked_value: Number(playerData.ecredits),
                    display_value: playerData.ecredits.toLocaleString()
                  });
                }
              }
            });
          }

          for(var i=0; i<manual_agents.length; i++) {
            playerData = await getPlayerData(manual_agents[i], server_platform, manual_agents[i]);

            if( lodash.isEmpty(playerData) == false ) {
              results.push({
                is_manual: true,
                uplay_id: playerData.name,
                user_id: 0,
                username: playerData.name,
                ranked_value: Number(playerData.ecredits),
                display_value: playerData.ecredits.toLocaleString()
              });
            }
            else {
              if( useTrackerGG )
                pool.query("DELETE FROM server_agents WHERE agent_name = ? AND server_id = ?", [manual_agents[i], message.guild.id]);
              else
                pool.query("DELETE FROM server_agents WHERE agent_name = ? AND server_id = ?", [manual_agents[i], message.guild.id]);
            }
          }
          message.channel.stopTyping();

          if( results.length > 0 ) {
            printRankedResult(message, results, 'desc', 'E-Credit Balance');
          }
          break;
        case 'gearscore':
          message.channel.startTyping();
          for(var i=0; i<members.length; i++) {
            await pool.query("SELECT * FROM users WHERE user_id = ?", [members[i].id]).then(async function(res){
              if( res.length > 0 ) {
                uplay_id = res[0].uplay_id;
                platform = res[0].platform;
                agent_name = res[0].agent_name;
                playerData = await getPlayerData(uplay_id, platform, agent_name);

                if( lodash.isEmpty(playerData) == false ) {
                  results.push({
                    is_manual: false,
                    uplay_id: playerData.name,
                    user_id: members[i].id,
                    username: members[i].username,
                    ranked_value: Number(playerData.gearscore),
                    display_value: playerData.gearscore
                  });
                }
              }
            });
          }

          for(var i=0; i<manual_agents.length; i++) {
            playerData = await getPlayerData(manual_agents[i], server_platform, manual_agents[i]);

            if( lodash.isEmpty(playerData) == false ) {
              results.push({
                is_manual: true,
                uplay_id: playerData.name,
                user_id: 0,
                username: playerData.name,
                ranked_value: Number(playerData.gearscore),
                display_value: playerData.gearscore
              });
            }
            else {
              if( useTrackerGG )
                pool.query("DELETE FROM server_agents WHERE agent_name = ? AND server_id = ?", [manual_agents[i], message.guild.id]);
              else
                pool.query("DELETE FROM server_agents WHERE agent_name = ? AND server_id = ?", [manual_agents[i], message.guild.id]);
            }
          }
          message.channel.stopTyping();

          if( results.length > 0 ) {
            printRankedResult(message, results, 'desc', 'Gear Score');
          }
          break;
        case 'commendation':
          message.channel.startTyping();
          for(var i=0; i<members.length; i++) {
            await pool.query("SELECT * FROM users WHERE user_id = ?", [members[i].id]).then(async function(res){
              if( res.length > 0 ) {
                uplay_id = res[0].uplay_id;
                platform = res[0].platform;
                agent_name = res[0].agent_name;
                playerData = await getPlayerData(uplay_id, platform, agent_name);

                if( lodash.isEmpty(playerData) == false ) {
                  results.push({
                    is_manual: false,
                    uplay_id: playerData.name,
                    user_id: members[i].id,
                    username: members[i].username,
                    ranked_value: Number(playerData.commendations),
                    display_value: playerData.commendations.toLocaleString()
                  });
                }
              }
            });
          }

          for(var i=0; i<manual_agents.length; i++) {
            playerData = await getPlayerData(manual_agents[i], server_platform, manual_agents[i]);

            if( lodash.isEmpty(playerData) == false ) {
              results.push({
                is_manual: true,
                uplay_id: playerData.name,
                user_id: 0,
                username: playerData.name,
                ranked_value: Number(playerData.commendations),
                display_value: playerData.commendations.toLocaleString()
              });
            }
            else {
              if( useTrackerGG )
                pool.query("DELETE FROM server_agents WHERE agent_name = ? AND server_id = ?", [manual_agents[i], message.guild.id]);
              else
                pool.query("DELETE FROM server_agents WHERE agent_name = ? AND server_id = ?", [manual_agents[i], message.guild.id]);
            }
          }
          message.channel.stopTyping();

          if( results.length > 0 ) {
            printRankedResult(message, results, 'desc', 'Commendations');
          }
          break;

        case 'clanexp':
        case 'cxp':
          message.channel.startTyping();
          for(var i=0; i<members.length; i++) {
            await pool.query("SELECT * FROM users WHERE user_id = ?", [members[i].id]).then(async function(res){
              if( res.length > 0 ) {
                uplay_id = res[0].uplay_id;
                platform = res[0].platform;
                agent_name = res[0].agent_name;
                playerData = await getPlayerData(uplay_id, platform, agent_name);

                if( lodash.isEmpty(playerData) == false ) {
                  results.push({
                    is_manual: false,
                    uplay_id: playerData.name,
                    user_id: members[i].id,
                    username: members[i].username,
                    ranked_value: Number(playerData.xp_clan),
                    display_value: playerData.xp_clan.toLocaleString()
                  });
                }
              }
            });
          }

          for(var i=0; i<manual_agents.length; i++) {
            playerData = await getPlayerData(manual_agents[i], server_platform, manual_agents[i]);

            if( lodash.isEmpty(playerData) == false ) {
              results.push({
                is_manual: true,
                uplay_id: playerData.name,
                user_id: 0,
                username: playerData.name,
                ranked_value: Number(playerData.xp_clan),
                display_value: playerData.xp_clan.toLocaleString()
              });
            }
            else {
              if( useTrackerGG )
                pool.query("DELETE FROM server_agents WHERE agent_name = ? AND server_id = ?", [manual_agents[i], message.guild.id]);
              else
                pool.query("DELETE FROM server_agents WHERE agent_name = ? AND server_id = ?", [manual_agents[i], message.guild.id]);
            }
          }
          message.channel.stopTyping();

          if( results.length > 0 ) {
            printRankedResult(message, results, 'desc', 'Clan EXP');
          }
          break;

        case 'clanexp24h':
        case 'cxp24h':
          message.channel.startTyping();
          for(var i=0; i<members.length; i++) {
            await pool.query("SELECT * FROM users WHERE user_id = ?", [members[i].id]).then(async function(res){
              if( res.length > 0 ) {
                uplay_id = res[0].uplay_id;
                platform = res[0].platform;
                agent_name = res[0].agent_name;
                playerData = await getPlayerData(uplay_id, platform, agent_name);

                if( lodash.isEmpty(playerData) == false ) {
                  results.push({
                    is_manual: false,
                    uplay_id: playerData.name,
                    user_id: members[i].id,
                    username: members[i].username,
                    ranked_value: playerData.xp_clan_24h ? Number(playerData.xp_clan_24h) : 0,
                    display_value: playerData.xp_clan_24h ? playerData.xp_clan_24h.toLocaleString() : 0
                  });
                }
              }
            });
          }

          for(var i=0; i<manual_agents.length; i++) {
            playerData = await getPlayerData(manual_agents[i], server_platform, manual_agents[i]);

            if( lodash.isEmpty(playerData) == false ) {
              results.push({
                is_manual: true,
                uplay_id: playerData.name,
                user_id: 0,
                username: playerData.name,
                ranked_value: playerData.xp_clan_24h ? Number(playerData.xp_clan_24h) : 0,
                display_value: playerData.xp_clan_24h ? playerData.xp_clan_24h.toLocaleString() : 0
              });
            }
            else {
              if( useTrackerGG )
                pool.query("DELETE FROM server_agents WHERE agent_name = ? AND server_id = ?", [manual_agents[i], message.guild.id]);
              else
                pool.query("DELETE FROM server_agents WHERE agent_name = ? AND server_id = ?", [manual_agents[i], message.guild.id]);
            }
          }
          message.channel.stopTyping();

          if( results.length > 0 ) {
            printRankedResult(message, results, 'desc', '24 Hours Clan EXP');
          }
          break;

        case 'clanexp7d':
        case 'cxp7d':
          message.channel.startTyping();
          for(var i=0; i<members.length; i++) {
            await pool.query("SELECT * FROM users WHERE user_id = ?", [members[i].id]).then(async function(res){
              if( res.length > 0 ) {
                uplay_id = res[0].uplay_id;
                platform = res[0].platform;
                agent_name = res[0].agent_name;
                playerData = await getPlayerData(uplay_id, platform, agent_name);

                if( lodash.isEmpty(playerData) == false ) {
                  results.push({
                    is_manual: false,
                    uplay_id: playerData.name,
                    user_id: members[i].id,
                    username: members[i].username,
                    ranked_value: playerData.xp_clan_7d ? Number(playerData.xp_clan_7d) : 0,
                    display_value: playerData.xp_clan_7d ? playerData.xp_clan_7d.toLocaleString(): 0
                  });
                }
              }
            });
          }

          for(var i=0; i<manual_agents.length; i++) {
            playerData = await getPlayerData(manual_agents[i], server_platform, manual_agents[i]);

            if( lodash.isEmpty(playerData) == false ) {
              results.push({
                is_manual: true,
                uplay_id: playerData.name,
                user_id: 0,
                username: playerData.name,
                ranked_value: playerData.xp_clan_7d ? Number(playerData.xp_clan_7d) : 0,
                display_value: playerData.xp_clan_7d ? playerData.xp_clan_7d.toLocaleString(): 0
              });
            }
            else {
              if( useTrackerGG )
                pool.query("DELETE FROM server_agents WHERE agent_name = ? AND server_id = ?", [manual_agents[i], message.guild.id]);
              else
                pool.query("DELETE FROM server_agents WHERE agent_name = ? AND server_id = ?", [manual_agents[i], message.guild.id]);
            }
          }
          message.channel.stopTyping();

          if( results.length > 0 ) {
            printRankedResult(message, results, 'desc', '7 Days Clan EXP');
          }
          break;

        case 'clanexp30d':
        case 'cxp30d':
          message.channel.startTyping();
          for(var i=0; i<members.length; i++) {
            await pool.query("SELECT * FROM users WHERE user_id = ?", [members[i].id]).then(async function(res){
              if( res.length > 0 ) {
                uplay_id = res[0].uplay_id;
                platform = res[0].platform;
                agent_name = res[0].agent_name;
                playerData = await getPlayerData(uplay_id, platform, agent_name);

                if( lodash.isEmpty(playerData) == false ) {
                  results.push({
                    is_manual: false,
                    uplay_id: playerData.name,
                    user_id: members[i].id,
                    username: members[i].username,
                    ranked_value: playerData.xp_clan_30d ? Number(playerData.xp_clan_30d) : 0,
                    display_value: playerData.xp_clan_30d ? playerData.xp_clan_30d.toLocaleString() : 0
                  });
                }
              }
            });
          }

          for(var i=0; i<manual_agents.length; i++) {
            playerData = await getPlayerData(manual_agents[i], server_platform, manual_agents[i]);

            if( lodash.isEmpty(playerData) == false ) {
              results.push({
                is_manual: true,
                uplay_id: playerData.name,
                user_id: 0,
                username: playerData.name,
                ranked_value: playerData.xp_clan_30d ? Number(playerData.xp_clan_30d) : 0,
                display_value: playerData.xp_clan_30d ? playerData.xp_clan_30d.toLocaleString() : 0
              });
            }
            else {
              if( useTrackerGG )
                pool.query("DELETE FROM server_agents WHERE agent_name = ? AND server_id = ?", [manual_agents[i], message.guild.id]);
              else
                pool.query("DELETE FROM server_agents WHERE agent_name = ? AND server_id = ?", [manual_agents[i], message.guild.id]);
            }
          }
          message.channel.stopTyping();

          if( results.length > 0 ) {
            printRankedResult(message, results, 'desc', '30 Days Clan EXP');
          }
          break;
      }
    }
  })
}

function printRankedResult(message, results, order, title) {

  let limit = 10;
  let hashid = new Hashids('ISAC_BOT', 6, 'abcdefghijklmnopqrstuvwxyz'); // pad to length 10
  let hash = hashid.encode(message.logCommandID);
  let url = "https://isacbot.xyz/web/results/" + hash;
  let showMore = results.length > limit ? true : false;

  display_results = lodash.sortBy(results, ['ranked_value']).reverse().slice(0, limit);

  // check if manually added agent already exists in server and remove if yes
  for(var i=0; i<display_results.length; i++){
    let curr_uplay_id = display_results[i].uplay_id;

    if( display_results[i].is_manual && display_results.filter(function(result){ return result.uplay_id === curr_uplay_id }).length > 1 ) {
      display_results[i].skip = true;
      pool.query("DELETE FROM server_agents WHERE server_id = ? AND agent_name = ?", [message.guild.id, display_results[i].uplay_id]);
    }
    else
      display_results[i].skip = false;
  }

  // filter repeat agents
  display_results = display_results.filter(function(result){ return result.skip == false });

  let embed = new Discord.MessageEmbed()
    .setTitle("The Division 2 - Server Ranking for " + message.channel.guild.name)
    .setColor("#339af0")
    .setFooter(embedFooter, embedFooterImg);

  let rankingStr = '';
  let manualAgentExist = false;

  for(var i=0; i<display_results.length; i++) {
    if( display_results[i].is_manual ) {
      rankingStr += (i+1) + ". " + display_results[i].uplay_id.replace('_', '\\_') + "\\*\\*\\* _(" + display_results[i].display_value + ")_\n";
      manualAgentExist = true;
    }
    else
      rankingStr += (i+1) + ". " + display_results[i].uplay_id.replace('_', '\\_') + " _(" + display_results[i].display_value + ")_ <@" +display_results[i].user_id+ ">\n";
  }

  if( showMore ) {
    embed.setURL(url);
    rankingStr += "[_(Full list)_]("+url+")";
  }

  if( manualAgentExist ) {
    rankingStr += "\n\\*\\*\\* indicates manually added agents";
  }

  embed.addField(title, rankingStr);

  message.channel.send( embed )
  .then(function(msg){ if( message.autoDelete ) msg.delete(defaultAutoDeleteTimeout); })
  .catch(function(err){
    if( err.code == 50013 ) {
      message.author.send( MISSING_PERMISSION_ERR );
    }
    console.log(err);
  });

  helper.saveLogCommandResult(message.logCommandID, results);
}

function printAgentStat(message, playerData) {
  let embed = new Discord.MessageEmbed()
    .setTitle("The Division 2 - Agent Stats: " + playerData.name + " ("+playerData.platform+")")
    .setColor("#FF6D10")
    //.setThumbnail(playerData.avatar)
    .addField("Level", playerData.level_pve, true)
    .addField("DZ Rank", playerData.level_dz, true)
    .addField("Conflict Rank", playerData.level_pvp, true)

    .addField("Specialization", lodash.capitalize(playerData.specialization), true)
    .addField("Gear Score", playerData.gearscore, true)
    .addField("Items Looted", playerData.looted.toLocaleString(), true)

    .addField("PvE Playtime", lodash.round(playerData.timeplayed_pve / 3600) + " hour" + (lodash.round(playerData.timeplayed_pve / 3600) > 1 ? 's':''), true)
    .addField("DZ Playtime", lodash.round(playerData.timeplayed_dz / 3600) + " hour" + (lodash.round(playerData.timeplayed_dz / 3600) > 1 ? 's':''), true)
    .addField("PvP Playtime", lodash.round(playerData.timeplayed_pvp / 3600) + " hour" + (lodash.round(playerData.timeplayed_pvp / 3600) > 1 ? 's':''), true)

    //.addField("DZ Rogue Playtime", lodash.round(playerData.timeplayed_rogue / 3600) + "h", true)

    .addField("Kills", playerData.kills_total.toLocaleString(), true)
    .addField("Headshot Kills", playerData.kills_headshot.toLocaleString() + " ("+lodash.round(playerData.kills_headshot/playerData.kills_total*100)+"%)", true)
    .addField("Skill Kills", playerData.kills_skill.toLocaleString() + " ("+lodash.round(playerData.kills_skill/playerData.kills_total*100)+"%)", true)

    .addField("Clan EXP", playerData.xp_clan.toLocaleString(), true)
    .addField("Commendations", playerData.commendations.toLocaleString(), true)
    .addField("E-Credits", playerData.ecredits.toLocaleString(), true)

    // .addField("Last Login (UTC)", moment.unix(playerData.lastlogin).utc().format('D MMM YYYY'), true)

    .setFooter(embedFooter, embedFooterImg);

  message.channel.send( embed )
  .then(function(msg){ if( message.autoDelete ) msg.delete(defaultAutoDeleteTimeout); })
  .catch(function(err){
    if( err.code == 50013 ) {
      message.author.send( MISSING_PERMISSION_ERR );
    }
    console.log(err);
  });

  helper.saveLogCommandResult(message.logCommandID, playerData);
}

async function printAgentEXP(message, playerData) {

  let embed = new Discord.MessageEmbed()
    .setTitle("The Division 2 - Agent EXP: " + playerData.name + " ("+playerData.platform+")")
    .setColor("#FF6D10")
    //.setThumbnail(playerData.avatar)
    .addField("Clan EXP", playerData.xp_clan.toLocaleString(), true)
    .addField("PvE EXP", playerData.xp_ow.toLocaleString(), true)
    .addField("Dark Zone EXP", playerData.xp_dz.toLocaleString(), true)

    .addField("24h Clan EXP", (playerData.xp_clan_24h ? playerData.xp_clan_24h.toLocaleString() : 0), true)
    .addField("7d Clan EXP", (playerData.xp_clan_7d ? playerData.xp_clan_7d.toLocaleString() : 0), true)
    .addField("30d Clan EXP", (playerData.xp_clan_30d ? playerData.xp_clan_30d.toLocaleString() : 0), true)

    .setFooter(embedFooter, embedFooterImg);

  message.channel.send( embed )
  .then(function(msg){ if( message.autoDelete ) msg.delete(defaultAutoDeleteTimeout); })
  .catch(function(err){
    if( err.code == 50013 ) {
      message.author.send( MISSING_PERMISSION_ERR );
    }
    console.log(err);
  });

  helper.saveLogCommandResult(message.logCommandID, playerData);
}

function printWeaponStat(message, playerData) {
  let embed = new Discord.MessageEmbed()
    .setTitle("The Division 2 - Weapon Kills: " + playerData.name + " ("+playerData.platform+")")
    .setColor("#FF6D10")
    //.setThumbnail(playerData.avatar)
    .addField("Grenade", playerData.kills_wp_grenade.toLocaleString(), true)
    .addField("Rifle", playerData.kills_wp_rifles.toLocaleString(), true)
    .addField("Sidearm", playerData.kills_wp_pistol.toLocaleString(), true)
    .addField("SMG", playerData.kills_wp_smg.toLocaleString(), true)
    .addField("Shotgun", playerData.kills_wp_shotgun.toLocaleString(), true)
    .addField("Turret", playerData.kills_turret.toLocaleString(), true)
    .setFooter(embedFooter, embedFooterImg);

  message.channel.send( embed )
  .then(function(msg){ if( message.autoDelete ) msg.delete(defaultAutoDeleteTimeout); })
  .catch(function(err){
    if( err.code == 50013 ) {
      message.author.send( MISSING_PERMISSION_ERR );
    }
    console.log(err);
  });

  helper.saveLogCommandResult(message.logCommandID, playerData);
}

function printDZStat(message, playerData) {
  let embed = new Discord.MessageEmbed()
    .setTitle("The Division 2 - Dark Zone Stats: " + playerData.name + " ("+playerData.platform+")")
    .setColor("#A25EFF")
    .addField("Rank", playerData.level_dz, true)
    .addField("EXP", playerData.xp_dz.toLocaleString(), true)
    .addField("Playtime", lodash.round(playerData.timeplayed_dz / 3600) + " hour" + (lodash.round(playerData.timeplayed_dz / 3600) > 1 ? 's':''), true)
    .addField("Rogue Playtime", lodash.round(playerData.timeplayed_rogue / 3600) + " hour" + (lodash.round(playerData.timeplayed_rogue / 3600) > 1 ? 's':''), true)
    .addField("Longest Time Rogue", lodash.round(playerData.maxtime_rogue / 60) + " min" + (lodash.round(playerData.maxtime_rogue / 60) > 1 ? 's':''), true)
    .addField("Players Killed", playerData.kills_pvp_dz_total.toLocaleString(), true)
    .addField("Rogues Killed", playerData.kills_pvp_dz_rogue.toLocaleString(), true)
    // mob kills
    .addField("Hyenas Killed", playerData.kills_pve_dz_hyenas.toLocaleString(), true)
    .addField("Outcasts Killed", playerData.kills_pve_dz_outcasts.toLocaleString(), true)
    .addField("Black Tusks Killed", playerData.kills_pve_dz_blacktusk.toLocaleString(), true)
    .addField("True Sons Killed", playerData.kills_pve_dz_truesons.toLocaleString(), true)
    .addField("Elites Killed", playerData.kills_pvp_elitebosses.toLocaleString(), true)

    .setFooter(embedFooter, embedFooterImg);

  message.channel.send( embed )
  .then(function(msg){ if( message.autoDelete ) msg.delete(defaultAutoDeleteTimeout); })
  .catch(function(err){
    if( err.code == 50013 ) {
      message.author.send( MISSING_PERMISSION_ERR );
    }
    console.log(err);
  });

  helper.saveLogCommandResult(message.logCommandID, playerData);
}

function printPVEStat(message, playerData) {
  let embed = new Discord.MessageEmbed()
    .setTitle("The Division 2 - PvE Stats: " + playerData.name + " ("+playerData.platform+")")
    .setColor("#34CFD5")
    .addField("Level", playerData.level_pve, true)
    .addField("Gear Score", playerData.gearscore, true)
    .addField("Specialization", lodash.capitalize(playerData.specialization), true)
    .addField("EXP", playerData.xp_ow.toLocaleString(), true)
    .addField("Items Looted", playerData.looted.toLocaleString(), true)
    .addField("Playtime", lodash.round(playerData.timeplayed_pve / 3600) + " hour" + (lodash.round(playerData.timeplayed_pve / 3600) > 1 ? 's':''), true)
    // mob kills
    .addField("Hyenas Killed", playerData.kills_pve_hyenas.toLocaleString(), true)
    .addField("Outcasts Killed", playerData.kills_pve_outcasts.toLocaleString(), true)
    .addField("Black Tusks Killed", playerData.kills_pve_blacktusk.toLocaleString(), true)
    .addField("True Sons Killed", playerData.kills_pve_truesons.toLocaleString(), true)

    .setFooter(embedFooter, embedFooterImg);

  message.channel.send( embed )
  .then(function(msg){ if( message.autoDelete ) msg.delete(defaultAutoDeleteTimeout); })
  .catch(function(err){
    if( err.code == 50013 ) {
      message.author.send( MISSING_PERMISSION_ERR );
    }
    console.log(err);
  });

  helper.saveLogCommandResult(message.logCommandID, playerData);
}

function updateServerInfo(server_id, name) {
  pool.query("INSERT INTO servers (server_id, name, date_added, last_active) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = ?, last_active = ?", [server_id, name, moment().format('YYYY-M-D HH:mm:ss'), moment().format('YYYY-M-D HH:mm:ss'), name, moment().format('YYYY-M-D HH:mm:ss')]);
}

async function getServerPlatform(server_id) {
  let platform = 'uplay';

  await pool.query("SELECT * FROM platforms WHERE server_id = ?", [server_id]).then(async function(res){
    if( res.length == 0 ) {
      await pool.query("INSERT INTO platforms (server_id, platform, date_added) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE platform = ?, date_added = ?", [server_id, 'uplay', moment().format('YYYY-M-D HH:mm:ss'), 'uplay', moment().format('YYYY-M-D HH:mm:ss')]);
    }
    else {
      platform = res[0].platform;
    }
  })
  .catch(function(error){
    console.log(error);
  });

  return platform;
}

async function getMentionedUserAgentID(user) {
  let username = '';

  await pool.query("SELECT * FROM users WHERE user_id = ?", [user.id]).then(async function(res){
    if( res.length > 0 ) {
      username = res[0].agent_name;
    }
  })

  return username;
}

async function getPlayerData(uplay_id, platform='', username='') {
  let playerData = {};

  if( useTrackerGG && platform != '' && username != '' ) {

    helper.printStatus("API Call @ getPlayerData (TGG): " + config.apiSearchBaseURL_TGG + platform + "/" + username);

    await axios.get(config.apiSearchBaseURL_TGG + platform + "/" + username).then(async function(response){
      if( response.status === 200 ) {
        if( response.data.data.segments.length > 0 ) {

          playerData = {
            name: response.data.data.platformInfo.platformUserIdentifier,
            uplay_id: uplay_id,
            platform: response.data.data.platformInfo.platformSlug,
            specialization: response.data.data.segments[0].stats.specialization.displayValue ? response.data.data.segments[0].stats.specialization.displayValue : '-',
            avatar: response.data.data.platformInfo.avatarUrl,
            gearscore: response.data.data.segments[0].stats.latestGearScore.value,
            ecredits: response.data.data.segments[0].stats.eCreditBalance.value ? response.data.data.segments[0].stats.eCreditBalance.value : 0, // Currency
            commendations: response.data.data.segments[0].stats.commendationScore.value ? response.data.data.segments[0].stats.commendationScore.value : 0,
            xp_clan: response.data.data.segments[0].stats.xPClan.value, // clan xp
            xp_clan_24h: null,
            xp_clan_7d: null,
            xp_clan_30d: null,
            // pve
            level_pve: response.data.data.segments[0].stats.highestPlayerLevel.value,
            kills_npc: response.data.data.segments[0].stats.killsNpc.value,
            timeplayed_pve: response.data.data.segments[0].stats.timePlayedPve.value,
            xp_ow: response.data.data.segments[0].stats.xPPve.value, // pve xp
            xp_ow_24h: null,
            xp_ow_7d: null,
            xp_ow_30d: null,
            kills_pve_hyenas: response.data.data.segments[0].stats.killsFactionBlackbloc.value,
            kills_pve_outcasts: response.data.data.segments[0].stats.killsFactionCultists.value,
            kills_pve_blacktusk: response.data.data.segments[0].stats.killsFactionEndgame.value,
            kills_pve_truesons: response.data.data.segments[0].stats.killsFactionMilitia.value,
            // dz
            level_dz: response.data.data.segments[0].stats.rankDZ.value,
            xp_dz: response.data.data.segments[0].stats.xPDZ.value,
            xp_dz_24h: null,
            xp_dz_7d: null,
            xp_dz_30d: null,
            timeplayed_dz: response.data.data.segments[0].stats.timePlayedDarkZone.value,
            timeplayed_rogue: response.data.data.segments[0].stats.timePlayedRogue.value,
            maxtime_rogue: response.data.data.segments[0].stats.timePlayedRogueLongest.value,
            kills_pvp_dz_rogue: response.data.data.segments[0].stats.roguesKilled.value,
            kills_pve_dz_hyenas: response.data.data.segments[0].stats.killsFactionDzBlackbloc.value,
            kills_pve_dz_outcasts: response.data.data.segments[0].stats.killsFactionDzCultists.value,
            kills_pve_dz_blacktusk: response.data.data.segments[0].stats.killsFactionDzEndgame.value,
            kills_pve_dz_truesons: response.data.data.segments[0].stats.killsFactionDzMilitia.value,
            kills_pvp_dz_total: 0,
            kills_pvp_elitebosses: response.data.data.segments[0].stats.killsRoleDzElite.value,
            kills_pvp_namedbosses: response.data.data.segments[0].stats.killsRoleDzNamed.value,
            // pvp
            xp_pvp: response.data.data.segments[0].stats.xPPvp.value,
            level_pvp: response.data.data.segments[0].stats.latestConflictRank.value ? response.data.data.segments[0].stats.latestConflictRank.value : 0, // pvp but not dark zone, conflict?
            kills_pvp: response.data.data.segments[0].stats.killsPvP.value,
            timeplayed_pvp: response.data.data.segments[0].stats.timePlayedConflict.value, // pvp but not dark zone, conflict?
            // misc acct stats
            timeplayed_total: response.data.data.segments[0].stats.timePlayed.value,
            kills_total: response.data.data.segments[0].stats.killsPvP.value + response.data.data.segments[0].stats.killsNpc.value,
            looted: response.data.data.segments[0].stats.itemsLooted.value,
            headshots: response.data.data.segments[0].stats.headshots.value, // # of headshots
            // kills by source
            kills_bleeding: response.data.data.segments[0].stats.killsBleeding.value,
            kills_shocked: response.data.data.segments[0].stats.killsShocked.value,
            kills_burning: response.data.data.segments[0].stats.killsBurning.value,
            kills_ensnare: response.data.data.segments[0].stats.killsEnsnare.value,
            kills_headshot: response.data.data.segments[0].stats.killsHeadshot.value, // # of headshot kills
            kills_skill: response.data.data.segments[0].stats.killsSkill.value,
            kills_turret: response.data.data.segments[0].stats.headshots.value,
            kills_ensnare: response.data.data.segments[0].stats.killsWeaponMounted.value,
            // weapons kills
            kills_wp_pistol: response.data.data.segments[0].stats.killsWeaponPistol.value,
            kills_wp_grenade: response.data.data.segments[0].stats.killsWeaponGrenade.value,
            kills_wp_smg: response.data.data.segments[0].stats.killsWeaponSubMachinegun.value,
            kills_wp_shotgun: response.data.data.segments[0].stats.killsWeaponShotgun.value,
            kills_wp_rifles: response.data.data.segments[0].stats.killsWeaponRifle.value,
            kills_specialization: response.data.data.segments[0].stats.killsSpecializationSharpshooter.value + response.data.data.segments[0].stats.killsSpecializationSurvivalist.value + response.data.data.segments[0].stats.killsSpecializationDemolitionist.value,
          }

          exp_data = await pool.query("SELECT clan_exp, pve_exp, dz_exp, DATE_FORMAT(date_added, '%Y-%m-%d') as date FROM daily_exp_snapshots WHERE uplay_id = ? GROUP BY date ORDER BY date_added DESC LIMIT 30", [playerData.uplay_id]);

          if( exp_data.length > 1 ) {

            let clan_exp = exp_data.map(e => e.clan_exp);
            let pve_exp = exp_data.map(e => e.pve_exp);
            let dz_exp = exp_data.map(e => e.dz_exp);

            if( exp_data.length >= 2 ) {
              playerData.xp_clan_24h = getClanExp(clan_exp, 1);
              playerData.xp_ow_24h = pve_exp[0] - pve_exp[1];
              playerData.xp_dz_24h = dz_exp[0] - dz_exp[1];

              // defaults
              playerData.xp_clan_7d = getClanExp(clan_exp, 7);
              playerData.xp_ow_7d = pve_exp[0] - pve_exp[ pve_exp.length - 1 ];
              playerData.xp_dz_7d = dz_exp[0] - dz_exp[ dz_exp.length - 1 ];
              // defaults
              playerData.xp_clan_30d = getClanExp(clan_exp, 30);
              playerData.xp_ow_30d = pve_exp[0] - pve_exp[ pve_exp.length - 1 ];
              playerData.xp_dz_30d = dz_exp[0] - dz_exp[ dz_exp.length - 1 ];
            }

            // Overwrite if data exists
            if( exp_data.length >= 7 ) {
              playerData.xp_ow_7d = pve_exp[0] - pve_exp[6];
              playerData.xp_dz_7d = dz_exp[0] - dz_exp[6];
            }
            if( exp_data.length >= 30 ) {
              playerData.xp_ow_30d = pve_exp[0] - pve_exp[29];
              playerData.xp_dz_30d = dz_exp[0] - dz_exp[29];
            }
          }
        }
      }
    })
    .catch(function(error){
      console.log(error);
    });
  }

  else {
    helper.printStatus("API Call @ getPlayerData: " + config.apiPlayerURL + uplay_id);

    await axios.get(config.apiPlayerURL + uplay_id).then(async function(response){
      if( response.status === 200 ) {
        if( response.data.playerfound === true ) {

          // Parse extra data
          try {
            extraData = JSON.parse(response.data.extra_data);
          }
          catch(err) {
            extraData = {};
            helper.printStatus("Unable to parse extra data.");
          }

          playerData = {
            name: response.data.name,
            uplay_id: uplay_id,
            platform: response.data.platform,
            specialization: response.data.specialization ? response.data.specialization : '-',
            avatar: response.data.avatar_146,
            gearscore: response.data.gearscore,
            // lastlogin: response.data.utime, // Query time
            ecredits: response.data.ecredits, // Currency
            commendations: extraData['LatestCommendationScore'] ? extraData['LatestCommendationScore'] : 0,
            xp_clan: response.data.xp_clan, // clan xp
            xp_clan_24h: null,
            xp_clan_7d: null,
            xp_clan_30d: null,
            // pve
            level_pve: response.data.level_pve,
            kills_npc: response.data.kills_npc,
            timeplayed_pve: response.data.timeplayed_pve,
            xp_ow: response.data.xp_ow, // pve xp
            xp_ow_24h: null,
            xp_ow_7d: null,
            xp_ow_30d: null,
            kills_pve_hyenas: response.data.kills_pve_hyenas,
            kills_pve_outcasts: response.data.kills_pve_outcasts,
            kills_pve_blacktusk: response.data.kills_pve_blacktusk,
            kills_pve_truesons: response.data.kills_pve_truesons,
            // dz
            level_dz: response.data.level_dz,
            xp_dz: response.data.xp_dz,
            xp_dz_24h: null,
            xp_dz_7d: null,
            xp_dz_30d: null,
            timeplayed_dz: response.data.timeplayed_dz,
            timeplayed_rogue: response.data.timeplayed_rogue,
            maxtime_rogue: response.data.maxtime_rogue,
            kills_pvp_dz_rogue: response.data.kills_pvp_dz_rogue,
            kills_pve_dz_hyenas: response.data.kills_pve_dz_hyenas,
            kills_pve_dz_outcasts: response.data.kills_pve_dz_outcasts,
            kills_pve_dz_blacktusk: response.data.kills_pve_dz_blacktusk,
            kills_pve_dz_truesons: response.data.kills_pve_dz_truesons,
            kills_pvp_dz_total: response.data.kills_pvp_dz_total,
            kills_pvp_elitebosses: response.data.kills_pvp_elitebosses,
            kills_pvp_namedbosses: response.data.kills_pvp_namedbosses,
            // pvp
            xp_pvp: response.data.xp_pvp,
            level_pvp: extraData['LatestLevel.rankType.OrganizedPvpXP'] ? extraData['LatestLevel.rankType.OrganizedPvpXP'] : 0, // pvp but not dark zone, conflict?
            kills_pvp: response.data.kills_pvp,
            timeplayed_pvp: response.data.timeplayed_pvp, // pvp but not dark zone, conflict?
            // misc acct stats
            timeplayed_total: response.data.timeplayed_total,
            kills_total: response.data.kills_total,
            looted: response.data.looted,
            headshots: response.data.headshots, // # of headshots
            // kills by source
            kills_bleeding: response.data.kills_bleeding,
            kills_shocked: response.data.kills_shocked,
            kills_burning: response.data.kills_burning,
            kills_ensnare: response.data.kills_ensnare,
            kills_headshot: response.data.kills_headshot, // # of headshot kills
            kills_skill: response.data.kills_skill,
            kills_turret: response.data.kills_turret,
            kills_ensnare: response.data.kills_ensnare,
            // weapons kills
            kills_wp_pistol: response.data.kills_wp_pistol,
            kills_wp_grenade: extraData['weaponNameKills.weaponName.player_grenade_landing'] ? extraData['weaponNameKills.weaponName.player_grenade_landing'] : 0,
            kills_wp_smg: response.data.kills_wp_smg,
            kills_wp_shotgun: response.data.kills_wp_shotgun,
            kills_wp_rifles: response.data.kills_wp_rifles,
            kills_specialization: response.data.kills_specialization,
          }

          exp_data = await pool.query("SELECT clan_exp, pve_exp, dz_exp, DATE_FORMAT(date_added, '%Y-%m-%d') as date FROM daily_exp_snapshots WHERE uplay_id = ? GROUP BY date ORDER BY date_added DESC LIMIT 30", [playerData.uplay_id]);

          if( exp_data.length > 1 ) {

            let clan_exp = exp_data.map(e => e.clan_exp);
            let pve_exp = exp_data.map(e => e.pve_exp);
            let dz_exp = exp_data.map(e => e.dz_exp);

            if( exp_data.length >= 2 ) {
              playerData.xp_clan_24h = getClanExp(clan_exp, 1);
              playerData.xp_ow_24h = pve_exp[0] - pve_exp[1];
              playerData.xp_dz_24h = dz_exp[0] - dz_exp[1];

              // defaults
              playerData.xp_clan_7d = getClanExp(clan_exp, 7);
              playerData.xp_ow_7d = pve_exp[0] - pve_exp[ pve_exp.length - 1 ];
              playerData.xp_dz_7d = dz_exp[0] - dz_exp[ dz_exp.length - 1 ];
              // defaults
              playerData.xp_clan_30d = getClanExp(clan_exp, 30);
              playerData.xp_ow_30d = pve_exp[0] - pve_exp[ pve_exp.length - 1 ];
              playerData.xp_dz_30d = dz_exp[0] - dz_exp[ dz_exp.length - 1 ];
            }

            // Overwrite if data exists
            if( exp_data.length >= 7 ) {
              playerData.xp_ow_7d = pve_exp[0] - pve_exp[6];
              playerData.xp_dz_7d = dz_exp[0] - dz_exp[6];
            }
            if( exp_data.length >= 30 ) {
              playerData.xp_ow_30d = pve_exp[0] - pve_exp[29];
              playerData.xp_dz_30d = dz_exp[0] - dz_exp[29];
            }
          }
        }
      }
    })
    .catch(function(error){
      console.log(error);
    });

  }

  return playerData;
}

function getClanExp(data, days) {

  days = days == 1 ? 2 : days;

  let end_index = 0;
  let prev_val = data[0];
  let no_of_days = data.length < days ? data.length : days;

  for(var i=1; i<no_of_days; i++) {
    if( prev_val < data[i] ) {
      end_index = i - 1;
      break;
    }
    else {
      prev_val = data[i];
      end_index++;
    }
  }

  return data[0] - data[ end_index ];
}

function getUpdateUserPlatforms() {
  pool.query("SELECT * FROM users").then(function(response){
    for(var i=0; i<response.length; i++){

      axios.get(config.apiPlayerURL + response[i].uplay_id).then(function(res){
        if( res.status === 200 ) {
          if( res.data.playerfound === true ) {
            pool.query("UPDATE users SET agent_name = ? WHERE uplay_id = ?", [res.data.name, res.data.pid]);
          }
        }
      });

    }
  });
}

function setServerPrefix(serverID, prefix) {
  pool.query("UPDATE servers SET prefix = ? WHERE server_id = ?", [prefix, serverID]);
}

async function getServerPrefix(serverID) {
  let prefix = config.prefix;
  await pool.query("SELECT * FROM servers WHERE server_id = ?", [serverID]).then(function(res){
    if( res.length > 0 ) {
      prefix = res[0].prefix.length > 0 ? res[0].prefix : prefix;
    }
  })
  return prefix;
}

function getErrorMessage(err_code, details = {}) {
  switch(err_code) {
    case 1:
      return UNABLE_TO_FIND_AGENT_ERR.replace("%AGENT_NAME%", details.username).replace("%SERVER_PLATFORM%", details.server_platform);
    case 2:
      return AGENT_REGISTRATION_NOT_FOUND_ERR;
    case 3:
      return INVALID_LEADERBOARD_TYPE_ERR;
    case 4:
      return INVALID_PLATFORM_TYPE_ERR;
    case 5:
      return NOT_ADMIN_PERMISSION_ERR.replace("%SERVER_NAME%", details.server_name);
    case 6:
      return MISSING_PERMISSION_ERR;
    case 7:
      return ROLE_NOT_FOUND_ERR.replace("%ROLE_ARG%", details.role);
    case 8:
      return INVALID_AUTO_DELETE_TYPE_ERR;
    default:
      return '';
  }
}

async function isServerAutoDelete(server_id) {

  let autoDelete = false;

  await pool.query("SELECT * FROM servers WHERE server_id = ?", [server_id]).then(async function(res){
    if( res.length > 0 ) {
      autoDelete = res[0].auto_delete == 1 ? true : false;
    }
  })
  .catch(function(error){
    console.log(error);
  });

  return autoDelete;
}

// Server members that have registered on ISAC
async function getClanMembers(message) {
  // Array of member id + username objects
  let members = [];

  await message.channel.guild.members.fetch().then(async function(guild){
    let clan_role_id = await pool.query("SELECT * FROM servers WHERE server_id = ?", [message.guild.id]).then(function(res){
      if( res.length > 0 )
        return res[0].clan_role_id ? res[0].clan_role_id : null;
      else
        return null
    })
    .catch(function(error){
      return null;
    });

    // Clan role restriction - only show results where members are of role specified
    if( clan_role_id )
      members = message.guild.members.cache.filter(function(member){ return member.user.bot === false && member._roles.includes(clan_role_id) }).map(function(member){ return {id: member.user.id, username: member.user.username} });
    else
      members = message.guild.members.cache.filter(function(member){ return member.user.bot === false }).map(function(member){ return {id: member.user.id, username: member.user.username} });
  });

  return members;
}